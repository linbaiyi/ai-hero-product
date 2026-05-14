import json
import shutil
from datetime import UTC, datetime
from pathlib import Path

from app.schemas.project_schema import (
    ProjectRecord,
    ProjectSaveRequest,
    ProjectSummary,
)
from app.storage import file_storage
from app.storage.file_storage import get_project_file_path, sanitize_project_id


class ProjectRepository:
    def __init__(
        self,
        project_dir: Path | None = None,
        asset_roots: list[Path] | None = None,
    ) -> None:
        self.project_dir = project_dir
        self.asset_roots = asset_roots
        if self.project_dir is not None:
            self.project_dir.mkdir(parents=True, exist_ok=True)

    def save_project(self, req: ProjectSaveRequest) -> ProjectRecord:
        safe_project_id = sanitize_project_id(req.project_id)
        file_path = self._project_file_path(safe_project_id)
        now = _now_iso()

        created_at = now
        if file_path.exists():
            try:
                created_at = self.get_project(safe_project_id).created_at
            except Exception:
                created_at = now

        record = ProjectRecord(
            **req.model_dump(exclude={"project_id"}),
            project_id=safe_project_id,
            created_at=created_at,
            updated_at=now,
        )
        file_path.write_text(
            json.dumps(record.model_dump(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return record

    def get_project(self, project_id: str) -> ProjectRecord:
        safe_project_id = sanitize_project_id(project_id)
        file_path = self._project_file_path(safe_project_id)
        if not file_path.exists():
            raise FileNotFoundError(safe_project_id)

        data = json.loads(file_path.read_text(encoding="utf-8"))
        return _validate_project_record_for_read(data)

    def list_projects(self) -> list[ProjectSummary]:
        project_dir = self._project_dir()
        summaries: list[ProjectSummary] = []

        for file_path in project_dir.glob("*.json"):
            try:
                record = _validate_project_record_for_read(
                    json.loads(file_path.read_text(encoding="utf-8"))
                )
            except Exception:
                # Corrupted project files are skipped so one bad record does not
                # break the whole history list.
                continue

            summaries.append(_record_to_summary(record))

        return sorted(summaries, key=lambda item: item.updated_at, reverse=True)

    def delete_project(self, project_id: str) -> bool:
        safe_project_id = sanitize_project_id(project_id)
        file_path = self._project_file_path(safe_project_id)
        if not file_path.exists():
            return False

        file_path.unlink()
        self._delete_project_asset_dirs(safe_project_id)
        return True

    def _project_dir(self) -> Path:
        if self.project_dir is not None:
            return self.project_dir
        return get_project_file_path("placeholder").parent

    def _project_file_path(self, project_id: str) -> Path:
        if self.project_dir is not None:
            file_path = (self.project_dir / f"{sanitize_project_id(project_id)}.json").resolve()
            if not file_path.is_relative_to(self.project_dir.resolve()):
                raise ValueError("项目路径不允许超出 outputs 目录")
            return file_path
        return get_project_file_path(project_id)

    def _delete_project_asset_dirs(self, project_id: str) -> None:
        if self.asset_roots is None:
            file_storage.delete_project_asset_dirs(project_id)
            return

        safe_project_id = sanitize_project_id(project_id)
        for root in self.asset_roots:
            root.mkdir(parents=True, exist_ok=True)
            target = (root / safe_project_id).resolve()
            if not target.is_relative_to(root.resolve()):
                raise ValueError("Project asset path cannot escape test asset root")
            if target.is_dir():
                shutil.rmtree(target)


def _record_to_summary(record: ProjectRecord) -> ProjectSummary:
    return ProjectSummary(
        project_id=record.project_id,
        hero_name=record.hero_design.hero_name,
        hero_title=record.hero_design.hero_title,
        role=record.hero_design.role,
        element_theme=record.request.element_theme,
        art_style=record.request.art_style,
        board_path=record.board_result.board_path if record.board_result else None,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _validate_project_record_for_read(data: dict) -> ProjectRecord:
    try:
        return ProjectRecord.model_validate(data)
    except Exception as exc:
        if not data.get("runtime_vfx_asset_spec"):
            raise exc

        legacy_data = dict(data)
        legacy_data["runtime_vfx_asset_spec"] = None
        return ProjectRecord.model_validate(legacy_data)
