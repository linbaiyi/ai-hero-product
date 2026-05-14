import json
import zipfile
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.project_routes import get_project_repository
from app.main import app
from app.services import project_import_service
from app.storage.project_repository import ProjectRepository
from project_test_helpers import make_project_save_request, make_runtime_vfx_asset_spec


client = TestClient(app)


def override_repo(tmp_path: Path) -> ProjectRepository:
    repository = ProjectRepository(project_dir=tmp_path / "projects")
    app.dependency_overrides.clear()
    app.dependency_overrides[get_project_repository] = lambda: repository
    return repository


def make_archive(
    project_data: dict | None = None,
    extra_files: dict[str, bytes] | None = None,
) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "project.json",
            json.dumps(project_data or make_project_save_request(), ensure_ascii=False),
        )
        for name, content in (extra_files or {}).items():
            archive.writestr(name, content)
    return buffer.getvalue()


def test_import_project_route_returns_imported_project(tmp_path):
    repository = override_repo(tmp_path)

    response = client.post(
        "/api/projects/import",
        content=make_archive(),
        headers={"Content-Type": "application/zip"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] is True
    assert data["project_id"] == "project_demo"
    assert repository.get_project("project_demo").project_id == "project_demo"


def test_import_project_route_imported_project_appears_in_history(tmp_path):
    override_repo(tmp_path)
    client.post(
        "/api/projects/import",
        content=make_archive(),
        headers={"Content-Type": "application/zip"},
    )

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_import_project_route_restores_runtime_vfx_textures(tmp_path, monkeypatch):
    override_repo(tmp_path)
    runtime_root = tmp_path / "runtime_vfx"

    def fake_resolve_runtime_vfx_file(path: str) -> Path:
        normalized = path.replace("\\", "/").removeprefix("runtime_vfx/")
        return runtime_root / normalized

    monkeypatch.setattr(
        project_import_service,
        "resolve_runtime_vfx_file",
        fake_resolve_runtime_vfx_file,
    )
    runtime_vfx_spec = make_runtime_vfx_asset_spec()
    project_data = make_project_save_request(runtime_vfx_asset_spec=runtime_vfx_spec)

    response = client.post(
        "/api/projects/import",
        content=make_archive(
            project_data,
            extra_files={
                "playable/runtime_vfx/textures/Q_projectile.png": b"fake-png-data",
            },
        ),
        headers={"Content-Type": "application/zip"},
    )

    asset_path = runtime_vfx_spec["skills"]["Q"]["assets"]["projectile"]["path"]
    assert response.status_code == 200
    assert fake_resolve_runtime_vfx_file(asset_path).read_bytes() == b"fake-png-data"


def test_import_project_route_rejects_invalid_zip(tmp_path):
    override_repo(tmp_path)

    response = client.post(
        "/api/projects/import",
        content=b"not a zip",
        headers={"Content-Type": "application/zip"},
    )

    assert response.status_code == 400
