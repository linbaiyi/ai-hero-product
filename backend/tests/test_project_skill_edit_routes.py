from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.project_schema import ProjectSaveRequest
from app.clients.fake_llm_client import FakeLLMClient
from app.clients.fake_image_client import FakeImageClient
from app.services.project_skill_edit_service import ProjectSkillEditService
from app.storage.project_repository import ProjectRepository
from project_test_helpers import make_playable_spec, make_project_save_request
from test_project_skill_edit_service import make_qwer_project_payload


client = TestClient(app)


def override_repo(tmp_path: Path) -> ProjectRepository:
    app.dependency_overrides.clear()

    from app.api.project_routes import (
        get_project_repository,
        get_project_skill_edit_service,
    )

    repository = ProjectRepository(project_dir=tmp_path)
    app.dependency_overrides[get_project_repository] = lambda: repository
    app.dependency_overrides[get_project_skill_edit_service] = (
        lambda: ProjectSkillEditService(repository, FakeLLMClient(), FakeImageClient())
    )
    return repository


def test_edit_skill_route_returns_updated_project(tmp_path):
    repository = override_repo(tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(make_qwer_project_payload()))

    response = client.post(
        "/api/projects/skill_edit_demo/skills/Q/edit",
        json={"edit_instruction": "Add a burning debuff."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["changed_slot"] == "Q"
    assert body["preserved_slots"] == ["W", "E", "R"]
    assert body["project"]["locked_skills"]["Q"] is False
    assert body["project"]["locked_skills"]["W"] is True
    assert "Add a burning debuff." in body["project"]["hero_design"]["skills"][0]["description"]
    assert body["project"]["playable_spec"]["skills"][0]["name"] == "Edited Q Projectile"
    assert body["project"]["playable_spec"]["skills"][0]["status_effects"][0]["type"] == "burn"
    assert body["project"]["playable_spec"]["skills"][1]["name"] == "Test Field"
    assert sorted(body["project"]["runtime_vfx_asset_spec"]["skills"]["Q"]["assets"].keys()) == [
        "impact",
        "projectile",
        "trail",
    ]


def test_edit_skill_route_persists_updated_project(tmp_path):
    repository = override_repo(tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(make_qwer_project_payload()))

    client.post(
        "/api/projects/skill_edit_demo/skills/R/edit",
        json={"edit_instruction": "Make R summon a fire spirit."},
    )
    response = client.get("/api/projects/skill_edit_demo")

    assert response.status_code == 200
    body = response.json()
    assert body["locked_skills"]["R"] is False
    assert body["skill_artifacts"]["R"]["locked"] is False
    assert "Make R summon a fire spirit." in body["hero_design"]["skills"][3]["description"]


def test_edit_skill_route_handles_visual_unchanged_llm_plan(tmp_path):
    repository = override_repo(tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(make_qwer_project_payload()))

    response = client.post(
        "/api/projects/skill_edit_demo/skills/Q/edit",
        json={"edit_instruction": "Only raise damage a little, visual unchanged."},
    )

    assert response.status_code == 200
    body = response.json()
    q_assets = body["project"]["runtime_vfx_asset_spec"]["skills"]["Q"]["assets"]
    assert sorted(q_assets.keys()) == ["projectile"]


def test_edit_skill_route_missing_project_returns_404(tmp_path):
    override_repo(tmp_path)

    response = client.post(
        "/api/projects/missing/skills/Q/edit",
        json={"edit_instruction": "Update Q."},
    )

    assert response.status_code == 404


def test_edit_skill_route_missing_hero_slot_returns_400(tmp_path):
    repository = override_repo(tmp_path)
    payload = make_qwer_project_payload()
    payload["hero_design"]["skills"] = payload["hero_design"]["skills"][:3]
    repository.save_project(ProjectSaveRequest.model_validate(payload))

    response = client.post(
        "/api/projects/skill_edit_demo/skills/R/edit",
        json={"edit_instruction": "Update R."},
    )

    assert response.status_code == 400


def test_existing_project_save_still_accepts_no_skill_artifacts(tmp_path):
    override_repo(tmp_path)

    response = client.post(
        "/api/projects/save",
        json=make_project_save_request(playable_spec=make_playable_spec()),
    )

    assert response.status_code == 200
    assert response.json()["skill_artifacts"] == {}
