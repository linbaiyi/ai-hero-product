import json
import zipfile
from io import BytesIO

from app.schemas.project_import_schema import ProjectImportResult
from app.schemas.project_schema import ProjectRecord, ProjectSaveRequest
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
