import json
import zipfile
from io import BytesIO
from pathlib import Path

from app.schemas.project_import_schema import ProjectImportResult
from app.schemas.project_schema import ProjectRecord, ProjectSaveRequest
from app.storage.file_storage import (
    resolve_output_file,
    resolve_runtime_vfx_file,
    sanitize_file_name,
)
from app.storage.project_repository import ProjectRepository


MAX_IMPORT_BYTES = 50 * 1024 * 1024


class ProjectImportService:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository = project_repository

    def import_project_archive(self, archive_bytes: bytes) -> ProjectImportResult:
        if not archive_bytes:
            raise ValueError("导入文件不能为空")
        if len(archive_bytes) > MAX_IMPORT_BYTES:
            raise ValueError("导入文件过大")

        project_data = _read_project_json_from_zip(archive_bytes)
        save_request = _project_save_request_from_import_data(project_data)
        imported = self.project_repository.save_project(save_request)
        _restore_project_images_from_zip(archive_bytes, imported)
        _restore_board_image_from_zip(archive_bytes, imported)
        _restore_runtime_vfx_textures_from_zip(archive_bytes, imported)
        return ProjectImportResult(project_id=imported.project_id, project=imported)


def _read_project_json_from_zip(archive_bytes: bytes) -> dict:
    try:
        with zipfile.ZipFile(BytesIO(archive_bytes), "r") as archive:
            if "project.json" not in archive.namelist():
                raise ValueError("导入包缺少 project.json")

            info = archive.getinfo("project.json")
            if info.file_size > MAX_IMPORT_BYTES:
                raise ValueError("project.json 过大")

            with archive.open(info, "r") as project_file:
                return json.loads(project_file.read().decode("utf-8"))
    except zipfile.BadZipFile as exc:
        raise ValueError("导入文件不是有效 ZIP 包") from exc
    except json.JSONDecodeError as exc:
        raise ValueError("project.json 不是有效 JSON") from exc


def _project_save_request_from_import_data(project_data: dict) -> ProjectSaveRequest:
    if "created_at" in project_data or "updated_at" in project_data:
        record = ProjectRecord.model_validate(project_data)
        return ProjectSaveRequest.model_validate(
            record.model_dump(exclude={"created_at", "updated_at"})
        )
    return ProjectSaveRequest.model_validate(project_data)


def _restore_project_images_from_zip(
    archive_bytes: bytes,
    record: ProjectRecord,
) -> None:
    if not record.image_results:
        return

    with zipfile.ZipFile(BytesIO(archive_bytes), "r") as archive:
        names = set(archive.namelist())
        image_names = sorted(name for name in names if name.startswith("images/"))
        used_archive_names: set[str] = set()

        for index, image_result in enumerate(record.image_results, start=1):
            if not image_result.success:
                continue

            archive_name = _find_project_image_archive_name(
                names=names,
                image_names=image_names,
                used_archive_names=used_archive_names,
                index=index,
                skill_name=image_result.skill_name,
                file_name=image_result.file_name,
            )
            if archive_name is None:
                continue

            if _restore_output_file_from_archive(
                archive=archive,
                archive_name=archive_name,
                output_path=image_result.image_path,
            ):
                used_archive_names.add(archive_name)


def _restore_board_image_from_zip(
    archive_bytes: bytes,
    record: ProjectRecord,
) -> None:
    if record.board_result is None or not record.board_result.success:
        return

    with zipfile.ZipFile(BytesIO(archive_bytes), "r") as archive:
        names = set(archive.namelist())
        archive_name = _find_board_archive_name(names, record.board_result.file_name)
        if archive_name is None:
            return
        _restore_output_file_from_archive(
            archive=archive,
            archive_name=archive_name,
            output_path=record.board_result.board_path,
        )


def _restore_output_file_from_archive(
    archive: zipfile.ZipFile,
    archive_name: str,
    output_path: str,
) -> bool:
    try:
        info = archive.getinfo(archive_name)
    except KeyError:
        return False
    if info.file_size > MAX_IMPORT_BYTES:
        return False

    try:
        target_path = resolve_output_file(output_path)
    except (ValueError, PermissionError):
        return False

    target_path.parent.mkdir(parents=True, exist_ok=True)
    with archive.open(info, "r") as source:
        target_path.write_bytes(source.read())
    return True


def _find_project_image_archive_name(
    names: set[str],
    image_names: list[str],
    used_archive_names: set[str],
    index: int,
    skill_name: str,
    file_name: str,
) -> str | None:
    safe_file_name = sanitize_file_name(file_name)
    if not safe_file_name.lower().endswith(".png"):
        safe_file_name = f"{safe_file_name}.png"

    safe_skill_name = sanitize_file_name(skill_name)
    if not safe_skill_name.lower().endswith(".png"):
        safe_skill_name = f"{safe_skill_name}.png"

    candidates = [
        f"images/{safe_file_name}",
        f"images/{index}_{safe_file_name}",
        f"images/{safe_skill_name}",
        f"images/{index}_{safe_skill_name}",
    ]
    for candidate in candidates:
        if candidate in names and candidate not in used_archive_names:
            return candidate

    for image_name in image_names:
        if image_name in used_archive_names:
            continue
        if Path(image_name).name == safe_file_name:
            return image_name

    unused_image_names = [name for name in image_names if name not in used_archive_names]
    if len(unused_image_names) == 1:
        return unused_image_names[0]
    return None


def _find_board_archive_name(names: set[str], file_name: str) -> str | None:
    safe_file_name = sanitize_file_name(file_name)
    candidates = [
        "board/vfx_board.png",
        f"board/{safe_file_name}",
    ]
    for candidate in candidates:
        if candidate in names:
            return candidate
    return next((name for name in names if name.startswith("board/")), None)


def _restore_runtime_vfx_textures_from_zip(
    archive_bytes: bytes,
    record: ProjectRecord,
) -> None:
    if record.runtime_vfx_asset_spec is None:
        return

    with zipfile.ZipFile(BytesIO(archive_bytes), "r") as archive:
        names = set(archive.namelist())
        for slot, skill in record.runtime_vfx_asset_spec.skills.items():
            for asset_key, asset in skill.assets.items():
                archive_name = _find_runtime_texture_archive_name(
                    names,
                    slot,
                    asset_key,
                    asset.usage,
                    asset.path,
                )
                if archive_name is None:
                    continue

                info = archive.getinfo(archive_name)
                if info.file_size > MAX_IMPORT_BYTES:
                    continue

                target_path = resolve_runtime_vfx_file(asset.path)
                target_path.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(info, "r") as source:
                    target_path.write_bytes(source.read())


def _find_runtime_texture_archive_name(
    names: set[str],
    slot: str,
    asset_key: str,
    usage: str,
    asset_path: str,
) -> str | None:
    candidates = [
        f"playable/runtime_vfx/textures/{sanitize_file_name(f'{slot}_{usage}.png')}",
        f"playable/runtime_vfx/textures/{sanitize_file_name(f'{slot}_{asset_key}_{usage}.png')}",
        f"playable/runtime_vfx/textures/{sanitize_file_name(Path(asset_path).name)}",
    ]

    for candidate in candidates:
        if candidate in names:
            return candidate
    return None
