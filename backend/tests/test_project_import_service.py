import json
import zipfile
from io import BytesIO
from pathlib import Path

import pytest

from app.schemas.project_schema import ProjectSaveRequest
from app.services.project_import_service import ProjectImportService
from app.storage.project_repository import ProjectRepository
from project_test_helpers import make_project_save_request


def make_archive(project_data: dict | None = None, file_name: str = "project.json") -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            file_name,
            json.dumps(project_data or make_project_save_request(), ensure_ascii=False),
        )
    return buffer.getvalue()


def make_service(tmp_path: Path) -> ProjectImportService:
    return ProjectImportService(ProjectRepository(project_dir=tmp_path / "projects"))


def test_import_project_archive_saves_project(tmp_path):
    service = make_service(tmp_path)

    result = service.import_project_archive(make_archive())

    assert result.imported is True
    assert result.project_id == "project_demo"
    assert (tmp_path / "projects" / "project_demo.json").exists()


def test_import_project_archive_overwrites_existing_project(tmp_path):
    repository = ProjectRepository(project_dir=tmp_path / "projects")
    repository.save_project(ProjectSaveRequest.model_validate(make_project_save_request()))
    service = ProjectImportService(repository)
    data = make_project_save_request()
    data["hero_design"]["hero_name"] = "Imported Hero"

    result = service.import_project_archive(make_archive(data))

    assert result.project.hero_design.hero_name == "Imported Hero"
    assert repository.get_project("project_demo").hero_design.hero_name == "Imported Hero"


def test_import_project_archive_requires_project_json(tmp_path):
    service = make_service(tmp_path)

    with pytest.raises(ValueError, match="project.json"):
        service.import_project_archive(make_archive(file_name="docs/hero_design.md"))


def test_import_project_archive_rejects_invalid_zip(tmp_path):
    service = make_service(tmp_path)

    with pytest.raises(ValueError, match="ZIP"):
        service.import_project_archive(b"not a zip")


def test_import_project_archive_rejects_invalid_project_json(tmp_path):
    service = make_service(tmp_path)
    data = make_project_save_request()
    data["project_id"] = ""

    with pytest.raises(Exception):
        service.import_project_archive(make_archive(data))
