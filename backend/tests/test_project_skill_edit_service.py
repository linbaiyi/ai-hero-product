from copy import deepcopy

import pytest

from app.clients.fake_llm_client import FakeLLMClient
from app.clients.fake_image_client import FakeImageClient
from app.schemas.project_skill_edit_schema import ProjectSkillEditRequest
from app.services.project_skill_edit_service import ProjectSkillEditService
from app.storage.file_storage import resolve_runtime_vfx_file
from app.storage.project_repository import ProjectRepository
from project_test_helpers import (
    make_image_prompt,
    make_image_result,
    make_playable_spec,
    make_project_save_request,
    make_runtime_vfx_asset_spec,
    make_skill,
    make_vfx_design,
)


class RecordingFakeImageClient(FakeImageClient):
    def __init__(self) -> None:
        self.generated_paths: list[str] = []
        self.generated_prompts: list[str] = []
        self.generated_sizes: list[tuple[int, int]] = []

    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        self.generated_paths.append(save_path)
        self.generated_prompts.append(prompt)
        self.generated_sizes.append((width, height))
        return super().generate_image(prompt, negative_prompt, save_path, width, height)


class FailingFakeImageClient(FakeImageClient):
    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        raise RuntimeError("image provider unavailable")


class RetryRuntimeVfxPlanLLM(FakeLLMClient):
    def __init__(self) -> None:
        self.plan_calls = 0

    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        if schema_name == "project_runtime_vfx_edit_plan":
            self.plan_calls += 1
            if self.plan_calls == 1:
                return {
                    "keep_usages": ["summon_body"],
                    "regenerate_usages": ["summon_body"],
                    "add_usages": [],
                    "remove_usages": [],
                    "reason": "conflicting first attempt",
                }
            return {
                "keep_usages": ["summon_body"],
                "regenerate_usages": ["aura", "impact"],
                "add_usages": ["ground_decal"],
                "remove_usages": [],
                "reason": "keep summon body and add fire sea decal",
            }
        return super().generate_json(prompt, schema_name)


class InvalidRuntimeVfxPlanLLM(FakeLLMClient):
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        if schema_name == "project_runtime_vfx_edit_plan":
            return {
                "keep_usages": ["unknown_usage"],
                "regenerate_usages": [],
                "add_usages": [],
                "remove_usages": [],
                "reason": "invalid usage",
            }
        return super().generate_json(prompt, schema_name)


def make_qwer_project_payload(project_id: str = "skill_edit_demo") -> dict:
    playable_spec = make_playable_spec()
    hero_skills = []
    vfx_designs = []
    image_prompts = []
    image_results = []
    for skill in playable_spec["skills"]:
        hero_skill = make_skill(skill["name"])
        hero_skill["slot"] = skill["slot"]
        hero_skill["description"] = f"Original {skill['slot']} description"
        hero_skill["mechanics"] = f"Original {skill['slot']} mechanics"
        hero_skill["balance_notes"] = f"Original {skill['slot']} balance"
        hero_skills.append(hero_skill)
        vfx_designs.append(make_vfx_design(skill["name"]))
        image_prompts.append(make_image_prompt(skill["name"]))
        image_results.append(make_image_result(skill["name"]))

    payload = make_project_save_request(
        project_id=project_id,
        playable_spec=playable_spec,
        runtime_vfx_asset_spec=make_runtime_vfx_asset_spec(),
        vfx_designs=vfx_designs,
        image_prompts=image_prompts,
        image_results=image_results,
    )
    payload["hero_design"]["skills"] = hero_skills
    return payload


def make_service(tmp_path, payload: dict) -> ProjectSkillEditService:
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    return ProjectSkillEditService(repository, image_client=FakeImageClient())


def test_edit_skill_changes_only_selected_slot_and_preserves_others(tmp_path):
    payload = make_qwer_project_payload()
    original_playable = deepcopy(payload["playable_spec"])
    service = make_service(tmp_path, payload)

    response = service.edit_skill(
        "skill_edit_demo",
        "Q",
        ProjectSkillEditRequest(edit_instruction="Make this skill apply burn."),
    )

    skills = response.project.hero_design.skills
    assert "修改后" not in skills[0].description
    assert "burn" in skills[0].description.lower() or "灼烧" in skills[0].description
    assert skills[1].description == "Original W description"
    assert skills[2].description == "Original E description"
    assert skills[3].description == "Original R description"
    assert response.project.playable_spec is not None
    for index in [1, 2, 3]:
        updated = response.project.playable_spec.skills[index].model_dump()
        original = original_playable["skills"][index]
        assert updated["slot"] == original["slot"]
        assert updated["name"] == original["name"]
        assert updated["type"] == original["type"]
        assert updated["description"] == original["description"]


def test_edit_skill_updates_locks_and_artifacts(tmp_path):
    service = make_service(tmp_path, make_qwer_project_payload())

    response = service.edit_skill(
        "skill_edit_demo",
        "W",
        ProjectSkillEditRequest(edit_instruction="Only update W."),
    )

    assert response.changed_slot == "W"
    assert response.preserved_slots == ["Q", "E", "R"]
    assert response.project.locked_skills == {
        "Q": True,
        "W": False,
        "E": True,
        "R": True,
    }
    assert set(response.project.skill_artifacts.keys()) == {"Q", "W", "E", "R"}
    assert response.project.skill_artifacts["W"].locked is False
    assert response.project.skill_artifacts["Q"].locked is True
    assert response.project.skill_artifacts["Q"].playable_skill_spec["slot"] == "Q"


def test_edit_skill_can_replace_selected_skill_design(tmp_path):
    payload = make_qwer_project_payload()
    replacement = deepcopy(payload["hero_design"]["skills"][2])
    replacement["name"] = "Rewritten E"
    replacement["description"] = "New E only"
    service = make_service(tmp_path, payload)

    response = service.edit_skill(
        "skill_edit_demo",
        "E",
        ProjectSkillEditRequest(
            edit_instruction="Replace E.",
            replacement_skill_design=replacement,
        ),
    )

    assert response.project.hero_design.skills[2].name == "Rewritten E"
    assert response.project.hero_design.skills[2].description == "New E only"
    assert response.project.hero_design.skills[0].name == "Test Bolt"


def test_edit_skill_can_use_llm_to_rewrite_only_selected_skill(tmp_path):
    payload = make_qwer_project_payload()
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    service = ProjectSkillEditService(repository, FakeLLMClient(), FakeImageClient())

    response = service.edit_skill(
        "skill_edit_demo",
        "Q",
        ProjectSkillEditRequest(edit_instruction="Apply burn on hit."),
    )

    assert response.project.hero_design.skills[0].name == "Edited Q Skill"
    assert "修改后" not in response.project.hero_design.skills[0].description
    assert "Edit instruction:" not in response.project.hero_design.skills[0].description
    assert response.project.hero_design.skills[1].name == "Test Field"
    assert response.project.playable_spec is not None
    assert response.project.playable_spec.skills[0].name == "Edited Q Projectile"
    assert response.project.playable_spec.skills[0].status_effects[0].type == "burn"
    assert any(
        effect.action == "spawn_vfx_event"
        and effect.trigger == "on_projectile_hit"
        for effect in response.project.playable_spec.skills[0].effects
    )
    assert response.project.playable_spec.skills[1].name == "Test Field"
    assert response.project.runtime_vfx_asset_spec is not None
    q_assets = response.project.runtime_vfx_asset_spec.skills["Q"].assets
    assert {
        "projectile",
        "trail_cast_spawn_projectile_0",
        "impact_projectile_hit_damage_1",
        "hit_flash_projectile_hit_spawn_vfx_event_3",
        "burn_loop_projectile_hit_apply_status_2",
    } <= set(q_assets.keys())
    assert response.project.skill_artifacts["Q"].runtime_vfx_skill_spec["skill_name"] == "Edited Q Projectile"
    assert response.project.playable_spec.skills[2].name == "Test Dash"
    assert response.project.playable_spec.skills[3].name == "Test Meteor"


def test_edit_skill_replaces_only_target_playable_slot_with_llm(tmp_path):
    payload = make_qwer_project_payload()
    original_playable = deepcopy(payload["playable_spec"])
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    service = ProjectSkillEditService(repository, FakeLLMClient(), FakeImageClient())

    response = service.edit_skill(
        "skill_edit_demo",
        "R",
        ProjectSkillEditRequest(edit_instruction="Make R leave a burning crater."),
    )

    assert response.project.playable_spec is not None
    updated_skills = [skill.model_dump() for skill in response.project.playable_spec.skills]
    assert updated_skills[3]["name"] == "Edited R Impact"
    assert updated_skills[3]["status_effects"][0]["type"] == "burn"
    assert updated_skills[0]["name"] == original_playable["skills"][0]["name"]
    assert updated_skills[1]["name"] == original_playable["skills"][1]["name"]
    assert updated_skills[2]["name"] == original_playable["skills"][2]["name"]


def test_edit_skill_removes_obsolete_runtime_vfx_texture_when_usage_changes(tmp_path):
    payload = make_qwer_project_payload()
    old_path = payload["runtime_vfx_asset_spec"]["skills"]["Q"]["assets"]["projectile"]["path"]
    old_file = resolve_runtime_vfx_file(old_path)
    old_file.parent.mkdir(parents=True, exist_ok=True)
    old_file.write_bytes(b"old texture")
    replacement = deepcopy(payload["playable_spec"]["skills"][0])
    replacement.update(
        {
            "type": "aoe",
            "name": "Replacement Q AOE",
            "damage": 90,
            "radius": 3,
            "range": 10,
        }
    )
    replacement.pop("speed", None)

    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    service = ProjectSkillEditService(repository, image_client=FakeImageClient())

    response = service.edit_skill(
        "skill_edit_demo",
        "Q",
        ProjectSkillEditRequest(
            edit_instruction="Turn Q into a small ground explosion.",
            replacement_playable_skill_spec=replacement,
        ),
    )

    assert not old_file.exists()
    q_assets = response.project.runtime_vfx_asset_spec.skills["Q"].assets
    assert "projectile" not in q_assets
    assert {
        "ground_decal_cast_aoe_damage_0",
        "impact_cast_spawn_vfx_event_1",
    } <= set(q_assets.keys())
    assert q_assets["ground_decal_cast_aoe_damage_0"].path.endswith(
        "/Q_ground_decal_cast_aoe_damage_0.png"
    )


def test_visual_edit_regenerates_effect_textures_but_keeps_unchanged_summon_body(tmp_path):
    payload = make_qwer_project_payload()
    payload["playable_spec"]["skills"][2].update(
        {
            "type": "summon",
            "name": "Fire Spirit",
            "duration": 8,
            "damage": 20,
            "range": 8,
            "radius": 1,
            "tick_interval": 1,
        }
    )
    payload["runtime_vfx_asset_spec"]["skills"]["E"] = {
        "skill_name": "Fire Spirit",
        "skill_type": "summon",
        "assets": {
            "summon_body": {
                "path": "runtime_vfx/runtime_test/E_summon_body.png",
                "usage": "summon_body",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 1.6,
                "duration": 8,
                "loop": False,
                "color_tint": "#f97316",
            },
            "aura": {
                "path": "runtime_vfx/runtime_test/E_aura.png",
                "usage": "aura",
                "blend_mode": "additive",
                "render_mode": "aura_ring",
                "scale": 2,
                "duration": 3,
                "loop": True,
                "color_tint": "#f97316",
            },
            "impact": {
                "path": "runtime_vfx/runtime_test/E_impact.png",
                "usage": "impact",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 2.5,
                "duration": 0.35,
                "loop": False,
                "color_tint": "#f97316",
            },
        },
    }
    old_summon_body = payload["runtime_vfx_asset_spec"]["skills"]["E"]["assets"]["summon_body"]["path"]
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    image_client = RecordingFakeImageClient()
    service = ProjectSkillEditService(repository, FakeLLMClient(), image_client)

    response = service.edit_skill(
        "skill_edit_demo",
        "E",
        ProjectSkillEditRequest(
                edit_instruction="Keep summon body unchanged and add a burning fire sea at the summon spawn point, dealing damage over time and applying burn.",
        ),
    )

    e_assets = response.project.runtime_vfx_asset_spec.skills["E"].assets
    assert e_assets["summon_body"].path == old_summon_body
    assert resolve_runtime_vfx_file(e_assets["aura"].path).exists()
    assert resolve_runtime_vfx_file(e_assets["impact_summon_attack_spawn_vfx_event_1"].path).exists()
    assert resolve_runtime_vfx_file(e_assets["ground_decal"].path).exists()
    assert image_client.generated_sizes == [(1024, 1024)]
    assert "Create one 1024x1024 game VFX texture atlas" in image_client.generated_prompts[0]
    assert not any(path.endswith("E_summon_body.png") for path in image_client.generated_paths)
    assert "ground_decal" in e_assets
    assert e_assets["ground_decal"].loop is True
    assert "Edit instruction:" not in response.project.hero_design.skills[2].description
    assert "修改后" not in response.project.hero_design.skills[2].description
    assert "Edit instruction:" not in response.project.playable_spec.skills[2].description
    assert "修改后" not in response.project.playable_spec.skills[2].description


def test_runtime_vfx_edit_plan_retries_until_actions_are_valid(tmp_path):
    payload = make_qwer_project_payload()
    payload["playable_spec"]["skills"][2].update(
        {
            "type": "summon",
            "name": "Fire Spirit",
            "duration": 8,
            "damage": 20,
            "range": 8,
            "radius": 1,
            "tick_interval": 1,
        }
    )
    payload["runtime_vfx_asset_spec"]["skills"]["E"] = {
        "skill_name": "Fire Spirit",
        "skill_type": "summon",
        "assets": {
            "summon_body": {
                "path": "runtime_vfx/runtime_test/E_summon_body.png",
                "usage": "summon_body",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 1.6,
                "duration": 8,
                "loop": False,
                "color_tint": "#f97316",
            },
            "aura": {
                "path": "runtime_vfx/runtime_test/E_aura.png",
                "usage": "aura",
                "blend_mode": "additive",
                "render_mode": "aura_ring",
                "scale": 2,
                "duration": 3,
                "loop": True,
                "color_tint": "#f97316",
            },
            "impact": {
                "path": "runtime_vfx/runtime_test/E_impact.png",
                "usage": "impact",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 2.5,
                "duration": 0.35,
                "loop": False,
                "color_tint": "#f97316",
            },
        },
    }
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    llm_client = RetryRuntimeVfxPlanLLM()
    image_client = RecordingFakeImageClient()
    service = ProjectSkillEditService(repository, llm_client, image_client)

    response = service.edit_skill(
        "skill_edit_demo",
        "E",
        ProjectSkillEditRequest(
                edit_instruction="Keep summon body unchanged and add a burning fire sea at the summon spawn point, dealing damage over time and applying burn.",
        ),
    )

    assert llm_client.plan_calls == 2
    assert "ground_decal" in response.project.runtime_vfx_asset_spec.skills["E"].assets
    assert resolve_runtime_vfx_file(
        response.project.runtime_vfx_asset_spec.skills["E"].assets["ground_decal"].path
    ).exists()
    assert image_client.generated_sizes == [(1024, 1024)]


def test_skill_edit_fails_transaction_when_runtime_texture_regeneration_fails(tmp_path):
    payload = make_qwer_project_payload()
    payload["playable_spec"]["skills"][2].update(
        {
            "type": "summon",
            "name": "Fire Spirit",
            "duration": 8,
            "damage": 20,
            "range": 8,
            "radius": 1,
            "tick_interval": 1,
        }
    )
    payload["runtime_vfx_asset_spec"]["skills"]["E"] = {
        "skill_name": "Fire Spirit",
        "skill_type": "summon",
        "assets": {
            "summon_body": {
                "path": "runtime_vfx/runtime_test/E_summon_body.png",
                "usage": "summon_body",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 1.6,
                "duration": 8,
                "loop": False,
                "color_tint": "#f97316",
            },
            "aura": {
                "path": "runtime_vfx/runtime_test/E_aura.png",
                "usage": "aura",
                "blend_mode": "additive",
                "render_mode": "aura_ring",
                "scale": 2,
                "duration": 3,
                "loop": True,
                "color_tint": "#f97316",
            },
            "impact": {
                "path": "runtime_vfx/runtime_test/E_impact.png",
                "usage": "impact",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 2.5,
                "duration": 0.35,
                "loop": False,
                "color_tint": "#f97316",
            },
        },
    }
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    service = ProjectSkillEditService(repository, FakeLLMClient(), FailingFakeImageClient())

    with pytest.raises(RuntimeError, match="Runtime VFX texture regeneration failed for E"):
        service.edit_skill(
            "skill_edit_demo",
            "E",
            ProjectSkillEditRequest(
                edit_instruction="Keep summon body unchanged and add a burning fire sea at the summon spawn point, dealing damage over time and applying burn.",
            ),
        )

    unchanged = repository.get_project("skill_edit_demo")
    assert unchanged.playable_spec.skills[2].name == "Fire Spirit"
    assert sorted(unchanged.runtime_vfx_asset_spec.skills["E"].assets.keys()) == [
        "aura",
        "impact",
        "summon_body",
    ]


def test_invalid_runtime_vfx_edit_plan_falls_back_to_safe_local_rules(tmp_path):
    payload = make_qwer_project_payload()
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    image_client = RecordingFakeImageClient()
    service = ProjectSkillEditService(repository, InvalidRuntimeVfxPlanLLM(), image_client)

    response = service.edit_skill(
        "skill_edit_demo",
        "Q",
        ProjectSkillEditRequest(edit_instruction="Apply burn on hit."),
    )

    q_assets = response.project.runtime_vfx_asset_spec.skills["Q"].assets
    assert {
        "projectile_cast_spawn_projectile_0",
        "trail_cast_spawn_projectile_0",
        "impact_projectile_hit_damage_1",
        "hit_flash_projectile_hit_spawn_vfx_event_3",
        "burn_loop_projectile_hit_apply_status_2",
    } <= set(q_assets.keys())
    assert resolve_runtime_vfx_file(q_assets["trail_cast_spawn_projectile_0"].path).exists()
    assert resolve_runtime_vfx_file(q_assets["impact_projectile_hit_damage_1"].path).exists()
    assert resolve_runtime_vfx_file(q_assets["hit_flash_projectile_hit_spawn_vfx_event_3"].path).exists()
    assert image_client.generated_sizes == [(1024, 1024)]


def test_non_visual_edit_preserves_existing_runtime_vfx_textures(tmp_path):
    payload = make_qwer_project_payload()
    from app.schemas.project_schema import ProjectSaveRequest

    repository = ProjectRepository(project_dir=tmp_path)
    repository.save_project(ProjectSaveRequest.model_validate(payload))
    image_client = RecordingFakeImageClient()
    service = ProjectSkillEditService(repository, image_client=image_client)

    response = service.edit_skill(
        "skill_edit_demo",
        "Q",
        ProjectSkillEditRequest(edit_instruction="只把伤害提高一点，视觉效果不变。"),
    )

    assert image_client.generated_paths == []
    assert response.project.runtime_vfx_asset_spec.skills["Q"].assets["projectile"].path == (
        payload["runtime_vfx_asset_spec"]["skills"]["Q"]["assets"]["projectile"]["path"]
    )


def test_edit_missing_skill_slot_fails(tmp_path):
    payload = make_qwer_project_payload()
    payload["hero_design"]["skills"] = payload["hero_design"]["skills"][:3]
    service = make_service(tmp_path, payload)

    with pytest.raises(ValueError):
        service.edit_skill(
            "skill_edit_demo",
            "R",
            ProjectSkillEditRequest(edit_instruction="Update R."),
        )
