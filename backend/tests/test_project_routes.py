from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.storage.project_repository import ProjectRepository
from project_test_helpers import make_playable_spec, make_project_save_request


client = TestClient(app)


def override_repo(tmp_path: Path):
    app.dependency_overrides.clear()

    from app.api.project_routes import get_project_repository

    app.dependency_overrides[get_project_repository] = lambda: ProjectRepository(
        project_dir=tmp_path
    )


def test_save_project_route_returns_record(tmp_path):
    override_repo(tmp_path)

    response = client.post("/api/projects/save", json=make_project_save_request())

    assert response.status_code == 200
    assert response.json()["project_id"] == "project_demo"


def test_saved_project_can_be_read(tmp_path):
    override_repo(tmp_path)
    client.post("/api/projects/save", json=make_project_save_request())

    response = client.get("/api/projects/project_demo")

    assert response.status_code == 200
    assert response.json()["hero_design"]["hero_name"] == "烬焰使"


def test_saved_project_can_return_playable_spec(tmp_path):
    override_repo(tmp_path)
    client.post(
        "/api/projects/save",
        json=make_project_save_request(playable_spec=make_playable_spec()),
    )

    response = client.get("/api/projects/project_demo")

    assert response.status_code == 200
    assert response.json()["playable_spec"]["hero"]["name"] == "Test Playable Hero"


def test_save_project_rejects_invalid_playable_spec(tmp_path):
    override_repo(tmp_path)
    payload = make_project_save_request(playable_spec=make_playable_spec())
    payload["playable_spec"]["skills"] = []

    response = client.post("/api/projects/save", json=payload)

    assert response.status_code == 422


def test_list_projects_route_returns_projects(tmp_path):
    override_repo(tmp_path)
    client.post("/api/projects/save", json=make_project_save_request())

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_delete_project_route_deletes_record(tmp_path):
    override_repo(tmp_path)
    client.post("/api/projects/save", json=make_project_save_request())

    delete_response = client.delete("/api/projects/project_demo")
    get_response = client.get("/api/projects/project_demo")

    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True
    assert get_response.status_code == 404


def test_get_missing_project_returns_404(tmp_path):
    override_repo(tmp_path)

    response = client.get("/api/projects/missing")

    assert response.status_code == 404


def test_invalid_project_id_is_sanitized_or_rejected(tmp_path):
    override_repo(tmp_path)

    response = client.get("/api/projects/%2E%2E/unsafe")

    assert response.status_code in {400, 404}


def test_existing_endpoints_still_work(tmp_path):
    override_repo(tmp_path)

    assert client.get("/health").status_code == 200
    board_response = client.post(
        "/api/boards/render",
        json={
            "project_id": "project_route_board",
            "hero_design": make_project_save_request()["hero_design"],
            "vfx_designs": make_project_save_request()["vfx_designs"],
            "image_results": [],
            "width": 1600,
            "height": 2400,
        },
    )
    assert board_response.status_code == 200
