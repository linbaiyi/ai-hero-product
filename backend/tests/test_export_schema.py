import pytest
from pydantic import ValidationError

from app.schemas.export_schema import ExportProjectRequest, ExportProjectResult


def test_valid_export_project_request_passes() -> None:
    req = ExportProjectRequest()

    assert req.include_json is True
    assert req.include_markdown is True
    assert req.include_images is True
    assert req.include_board is True


def test_valid_export_project_result_passes() -> None:
    result = ExportProjectResult(
        project_id="project_demo",
        export_path="outputs/exports/project_demo/project_demo_export.zip",
        file_name="project_demo_export.zip",
    )

    assert result.success is True


def test_export_project_result_empty_project_id_fails() -> None:
    with pytest.raises(ValidationError):
        ExportProjectResult(
            project_id="",
            export_path="outputs/exports/project_demo/project_demo_export.zip",
            file_name="project_demo_export.zip",
        )


def test_export_project_result_empty_export_path_fails() -> None:
    with pytest.raises(ValidationError):
        ExportProjectResult(
            project_id="project_demo",
            export_path="",
            file_name="project_demo_export.zip",
        )
