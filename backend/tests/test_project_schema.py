import pytest
from pydantic import ValidationError

from app.schemas.project_schema import (
    ProjectListResponse,
    ProjectRecord,
    ProjectSaveRequest,
    ProjectSummary,
)
from project_test_helpers import (
    make_playable_spec,
    make_project_save_request,
    make_runtime_vfx_asset_spec,
    now_iso,
)


def test_valid_project_save_request_passes_validation():
    req = ProjectSaveRequest(**make_project_save_request())

    assert req.project_id == "project_demo"
    assert req.hero_design.hero_name == "烬焰使"


def test_project_save_request_empty_project_id_fails():
    with pytest.raises(ValidationError):
        ProjectSaveRequest(**make_project_save_request(project_id=""))


def test_valid_project_record_passes_validation():
    payload = make_project_save_request()
    record = ProjectRecord(**payload, created_at=now_iso(), updated_at=now_iso())

    assert record.project_id == "project_demo"


def test_project_save_request_accepts_valid_playable_spec():
    req = ProjectSaveRequest(
        **make_project_save_request(playable_spec=make_playable_spec())
    )

    assert req.playable_spec is not None
    assert req.playable_spec.hero.name == "Test Playable Hero"


def test_project_save_request_rejects_invalid_playable_spec():
    payload = make_project_save_request(playable_spec=make_playable_spec())
    payload["playable_spec"]["version"] = "2.0"

    with pytest.raises(ValidationError):
        ProjectSaveRequest(**payload)


def test_project_save_request_accepts_valid_runtime_vfx_asset_spec():
    req = ProjectSaveRequest(
        **make_project_save_request(
            runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
        )
    )

    assert req.runtime_vfx_asset_spec is not None
    assert req.runtime_vfx_asset_spec.hero_id == "test_playable_hero"


def test_project_save_request_accepts_skill_locks_and_artifacts():
    req = ProjectSaveRequest(
        **make_project_save_request(
            locked_skills={"Q": False, "W": True, "E": True, "R": True},
            skill_artifacts={
                "Q": {
                    "locked": False,
                    "skill_design": {"slot": "Q", "name": "Edited Q"},
                    "playable_skill_spec": {"slot": "Q", "name": "Edited Q"},
                }
            },
        )
    )

    assert req.locked_skills["Q"] is False
    assert req.skill_artifacts["Q"].skill_design["name"] == "Edited Q"


def test_project_save_request_rejects_invalid_runtime_vfx_asset_spec():
    payload = make_project_save_request(
        runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
    )
    payload["runtime_vfx_asset_spec"]["version"] = "2.0"

    with pytest.raises(ValidationError):
        ProjectSaveRequest(**payload)


def test_project_record_empty_created_at_fails():
    payload = make_project_save_request()

    with pytest.raises(ValidationError):
        ProjectRecord(**payload, created_at="", updated_at=now_iso())


def test_valid_project_summary_passes_validation():
    summary = ProjectSummary(
        project_id="project_demo",
        hero_name="烬焰使",
        hero_title="灰烬王座的咒火者",
        role="法师",
        element_theme="火焰",
        art_style="暗黑奇幻",
        board_path="outputs/boards/project_demo/vfx_board.png",
        created_at=now_iso(),
        updated_at=now_iso(),
    )

    assert summary.hero_name == "烬焰使"


def test_project_list_response_total_and_projects():
    summary = ProjectSummary(
        project_id="project_demo",
        hero_name="烬焰使",
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    response = ProjectListResponse(projects=[summary], total=1)

    assert response.total == 1
    assert response.projects[0].project_id == "project_demo"
