from pathlib import Path
import json

from fastapi.testclient import TestClient
from PIL import Image

from app.api.project_routes import get_project_repository
from app.main import app
from app.schemas.project_schema import ProjectSaveRequest
from app.storage.file_storage import get_board_output_dir, get_image_output_dir
from app.storage.project_repository import ProjectRepository
from project_test_helpers import make_playable_spec, make_project_save_request


client = TestClient(app)


def override_repo(tmp_path: Path) -> ProjectRepository:
    repository = ProjectRepository(project_dir=tmp_path / "projects")
    app.dependency_overrides.clear()
    app.dependency_overrides[get_project_repository] = lambda: repository
    return repository


def create_project(
    repository: ProjectRepository,
    project_id: str = "project_demo",
    playable_spec: dict | None = None,
):
    record = repository.save_project(
        ProjectSaveRequest.model_validate(
            make_project_save_request(project_id, playable_spec=playable_spec)
        )
    )
    image_dir = get_image_output_dir(record.project_id)
    board_dir = get_board_output_dir(record.project_id)
    Image.new("RGB", (32, 32), (255, 90, 31)).save(image_dir / "skill_fire.png")
    Image.new("RGB", (64, 96), (20, 20, 20)).save(board_dir / "vfx_board.png")
    return record


def test_export_project_route_creates_zip(tmp_path: Path) -> None:
    repository = override_repo(tmp_path)
    record = create_project(repository)

    response = client.post(
        f"/api/projects/{record.project_id}/export",
        json={
            "include_json": True,
            "include_markdown": True,
            "include_images": True,
            "include_board": True,
            "include_playable": True,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["export_path"]
    assert data["success"] is True
    assert Path(data["export_path"]).exists()


def test_export_route_can_include_playable_spec(tmp_path: Path) -> None:
    repository = override_repo(tmp_path)
    record = create_project(repository, playable_spec=make_playable_spec())

    response = client.post(
        f"/api/projects/{record.project_id}/export",
        json={"include_playable": True},
    )

    assert response.status_code == 200
    import zipfile

    with zipfile.ZipFile(response.json()["export_path"]) as archive:
        names = set(archive.namelist())
        readme = archive.read("playable/README.md").decode("utf-8")
        training_map = json.loads(
            archive.read("playable/default_training_map.json").decode("utf-8")
        )
    assert "playable/README.md" in names
    assert "playable/hero_playable_spec.json" in names
    assert "playable/default_training_map.json" in names
    assert "Test Playable Hero" in readme
    assert training_map["id"] == "default_training_arena"


def test_download_export_route_returns_zip(tmp_path: Path) -> None:
    repository = override_repo(tmp_path)
    record = create_project(repository)
    client.post(f"/api/projects/{record.project_id}/export", json={})

    response = client.get(f"/api/projects/{record.project_id}/export/download")

    assert response.status_code == 200
    assert response.headers["content-type"] in {
        "application/zip",
        "application/x-zip-compressed",
    }


def test_download_missing_export_returns_404(tmp_path: Path) -> None:
    repository = override_repo(tmp_path)
    record = create_project(repository, "not_exported")

    response = client.get(f"/api/projects/{record.project_id}/export/download")

    assert response.status_code == 404


def test_export_missing_project_returns_404(tmp_path: Path) -> None:
    override_repo(tmp_path)

    response = client.post("/api/projects/missing/export", json={})

    assert response.status_code == 404


def test_health_still_works(tmp_path: Path) -> None:
    override_repo(tmp_path)

    response = client.get("/health")

    assert response.status_code == 200


def test_projects_list_still_works(tmp_path: Path) -> None:
    repository = override_repo(tmp_path)
    create_project(repository)

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert response.json()["total"] == 1
