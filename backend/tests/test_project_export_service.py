import json
import zipfile
from pathlib import Path

import pytest
from PIL import Image

from app.schemas.export_schema import ExportProjectRequest
from app.schemas.project_schema import ProjectSaveRequest
from app.services.project_export_service import ProjectExportService
from app.storage.file_storage import (
    OUTPUT_ROOT,
    get_board_output_dir,
    get_image_output_dir,
    sanitize_project_id,
)
from app.storage.project_repository import ProjectRepository
from project_test_helpers import (
    make_playable_spec,
    make_project_save_request,
    make_runtime_vfx_asset_spec,
)


def make_repository_with_project(
    tmp_path: Path, project_id: str = "project_demo", **overrides
):
    repository = ProjectRepository(project_dir=tmp_path / "projects")
    req_data = make_project_save_request(project_id=project_id, **overrides)
    record = repository.save_project(ProjectSaveRequest.model_validate(req_data))
    return repository, record


def create_project_assets(project_id: str) -> None:
    image_dir = get_image_output_dir(project_id)
    board_dir = get_board_output_dir(project_id)
    Image.new("RGB", (32, 32), (255, 90, 31)).save(image_dir / "skill_fire.png")
    Image.new("RGB", (64, 96), (20, 20, 20)).save(board_dir / "vfx_board.png")


def create_runtime_texture(relative_path: str) -> None:
    assert relative_path.startswith("runtime_vfx/")
    output_path = OUTPUT_ROOT / relative_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (16, 16), (255, 90, 31, 255)).save(output_path)


def test_export_project_creates_zip_file(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(tmp_path)
    create_project_assets(record.project_id)
    service = ProjectExportService(repository)

    result = service.export_project(record.project_id, ExportProjectRequest())

    assert result.success is True
    assert Path(result.export_path).exists()


def test_export_zip_contains_expected_documents_and_assets(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(tmp_path)
    create_project_assets(record.project_id)
    service = ProjectExportService(repository)

    result = service.export_project(record.project_id, ExportProjectRequest())

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())

    assert "project.json" in names
    assert "docs/hero_design.md" in names
    assert "docs/vfx_design.md" in names
    assert "board/vfx_board.png" in names
    assert "images/skill_fire.png" in names


def test_export_includes_playable_spec_when_enabled(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path, playable_spec=make_playable_spec()
    )
    service = ProjectExportService(repository)

    result = service.export_project(record.project_id, ExportProjectRequest())

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())
        playable_spec = archive.read("playable/hero_playable_spec.json")
        readme = archive.read("playable/README.md").decode("utf-8")
        training_map = json.loads(
            archive.read("playable/default_training_map.json").decode("utf-8")
        )

    assert "playable/README.md" in names
    assert "playable/hero_playable_spec.json" in names
    assert "playable/default_training_map.json" in names
    assert b"Test Playable Hero" in playable_spec
    assert "Test Playable Hero" in readme
    assert "Q: Test Bolt (`projectile`)" in readme
    assert "W: Test Field (`aoe_dot`)" in readme
    assert "E: Test Dash (`dash`)" in readme
    assert "R: Test Meteor (`aoe`)" in readme
    assert training_map["id"] == "default_training_arena"
    assert training_map["width"] == 40


def test_export_excludes_playable_content_when_disabled(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path, playable_spec=make_playable_spec()
    )
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_playable=False)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())

    assert not any(name.startswith("playable/") for name in names)


def test_export_old_project_without_playable_spec_does_not_fail(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(tmp_path)
    service = ProjectExportService(repository)

    result = service.export_project(record.project_id, ExportProjectRequest())

    assert result.success is True
    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())
        readme = archive.read("playable/README.md").decode("utf-8")
        training_map = json.loads(
            archive.read("playable/default_training_map.json").decode("utf-8")
        )
    assert "playable/README.md" in names
    assert "playable/default_training_map.json" in names
    assert "playable/hero_playable_spec.json" not in names
    assert "尚未生成 playable_spec" in readme
    assert training_map["hero_spawn"] == {"x": 0, "z": 0}


def test_export_excludes_runtime_vfx_content_when_disabled(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path, runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
    )
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_runtime_vfx=False)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())

    assert not any(name.startswith("playable/runtime_vfx/") for name in names)


def test_export_includes_runtime_vfx_spec_when_enabled(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path, runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
    )
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_runtime_vfx=True)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())
        spec = json.loads(
            archive.read(
                "playable/runtime_vfx/runtime_vfx_asset_spec.json"
            ).decode("utf-8")
        )

    assert "playable/runtime_vfx/runtime_vfx_asset_spec.json" in names
    assert "playable/runtime_vfx/README.md" in names
    assert spec["hero_id"] == "test_playable_hero"


def test_export_includes_existing_runtime_texture(tmp_path: Path) -> None:
    create_runtime_texture("runtime_vfx/runtime_test/Q_projectile.png")
    repository, record = make_repository_with_project(
        tmp_path, runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
    )
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_runtime_vfx=True)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())

    assert "playable/runtime_vfx/textures/Q_projectile.png" in names


def test_export_runtime_vfx_missing_textures_writes_warning(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path, runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
    )
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_runtime_vfx=True)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        readme = archive.read("playable/runtime_vfx/README.md").decode("utf-8")

    assert result.success is True
    assert "Warnings" in readme
    assert "Missing or unsafe texture" in readme


def test_export_runtime_vfx_without_spec_writes_readme_only(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(tmp_path)
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_runtime_vfx=True)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())
        readme = archive.read("playable/runtime_vfx/README.md").decode("utf-8")

    assert "playable/runtime_vfx/README.md" in names
    assert "playable/runtime_vfx/runtime_vfx_asset_spec.json" not in names
    assert "尚未生成 runtime_vfx_asset_spec" in readme


def test_unsafe_runtime_vfx_path_is_not_exported(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path, runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
    )
    record.runtime_vfx_asset_spec.skills["Q"].assets["projectile"].path = (
        "runtime_vfx/../secret.png"
    )
    repository.get_project = lambda project_id: record
    service = ProjectExportService(repository)

    result = service.export_project(
        record.project_id, ExportProjectRequest(include_runtime_vfx=True)
    )

    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())
        readme = archive.read("playable/runtime_vfx/README.md").decode("utf-8")

    assert "playable/runtime_vfx/textures/Q_projectile.png" not in names
    assert "Missing or unsafe texture" in readme


def test_missing_image_files_are_skipped_without_failure(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(
        tmp_path,
        "missing_assets",
        image_results=[
            {
                "skill_name": "missing",
                "image_path": "outputs/images/missing_assets/missing.png",
                "file_name": "missing.png",
                "width": 512,
                "height": 512,
                "success": True,
                "error_message": None,
            }
        ],
    )
    service = ProjectExportService(repository)

    result = service.export_project(record.project_id, ExportProjectRequest())

    assert result.success is True
    with zipfile.ZipFile(result.export_path) as archive:
        names = set(archive.namelist())
    assert "project.json" in names
    assert "images/missing.png" not in names


def test_unsafe_project_id_does_not_escape_outputs(tmp_path: Path) -> None:
    repository, record = make_repository_with_project(tmp_path, "../unsafe:path")
    service = ProjectExportService(repository)

    result = service.export_project("../unsafe:path", ExportProjectRequest())

    safe_project_id = sanitize_project_id("../unsafe:path")
    assert result.project_id == safe_project_id
    assert f"outputs/exports/{safe_project_id}/" in result.export_path
    assert ".." not in result.export_path


def test_missing_project_raises_file_not_found(tmp_path: Path) -> None:
    repository = ProjectRepository(project_dir=tmp_path / "projects")
    service = ProjectExportService(repository)

    with pytest.raises(FileNotFoundError):
        service.export_project("missing", ExportProjectRequest())
