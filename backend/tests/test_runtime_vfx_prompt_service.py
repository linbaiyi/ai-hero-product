import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.runtime_vfx_prompt_schema import RuntimeVfxPromptRequest
from app.services.image_generation_service import ImageGenerationService
from app.services.runtime_vfx_prompt_service import RuntimeVfxPromptService


RUNTIME_VFX_EXAMPLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "playable"
    / "RuntimeVfxAssetSpec.example.json"
)


def playable_spec() -> dict:
    return {
        "version": "1.0",
        "hero": {
            "id": "solar_warden",
            "name": "Solar Warden",
            "title": "Keeper of the Trial Gate",
            "role": "fighter",
            "max_hp": 1200,
            "move_speed": 5.8,
            "attack_damage": 55,
            "attack_range": 4,
            "resource_type": "mana",
            "max_resource": 100,
        },
        "gameplay_tags": ["holy", "training_demo"],
        "skills": [
            {
                "slot": "Q",
                "name": "Sun Spear",
                "type": "projectile",
                "cooldown": 4,
                "resource_cost": 20,
                "damage": 120,
                "range": 14,
                "radius": 1,
                "speed": 16,
                "description": "Launch a holy projectile.",
                "vfx": {
                    "theme": "holy",
                    "color": "#ffd700",
                    "shape": "rune",
                    "impact": "holy_burst",
                    "trail": "gold_trail",
                },
            },
            {
                "slot": "W",
                "name": "Consecrated Ground",
                "type": "aoe_dot",
                "cooldown": 10,
                "resource_cost": 35,
                "damage": 25,
                "range": 10,
                "radius": 4,
                "duration": 5,
                "tick_interval": 1,
                "description": "Create a damaging holy field.",
                "vfx": {
                    "theme": "holy",
                    "color": "#ffe066",
                    "shape": "circle_zone",
                    "impact": "light_pulse",
                    "trail": "spark_rise",
                },
            },
            {
                "slot": "E",
                "name": "Radiant Step",
                "type": "dash",
                "cooldown": 8,
                "resource_cost": 25,
                "damage": 60,
                "distance": 7,
                "radius": 1.5,
                "duration": 0.35,
                "description": "Dash forward with radiant force.",
                "vfx": {
                    "theme": "holy",
                    "color": "#fff3bf",
                    "shape": "trail",
                    "impact": "flash_step",
                    "trail": "light_afterimage",
                },
            },
            {
                "slot": "R",
                "name": "Solar Bulwark",
                "type": "buff",
                "cooldown": 18,
                "resource_cost": 30,
                "duration": 4,
                "description": "Create a radiant speed aura.",
                "vfx": {
                    "theme": "holy",
                    "color": "#ffd700",
                    "shape": "shield",
                    "impact": "solar_guard",
                    "trail": "light_ring",
                },
            },
        ],
        "runtime": {
            "control_scheme": "wasd_mouse",
            "camera": "third_person_follow",
            "map_profile": "default_training_arena",
        },
    }


def runtime_vfx_asset_spec() -> dict:
    return json.loads(RUNTIME_VFX_EXAMPLE_PATH.read_text(encoding="utf-8"))


def request_payload(
    spec: dict | None = None,
    asset_spec: dict | None = None,
) -> dict:
    return {
        "playable_spec": spec or playable_spec(),
        "runtime_vfx_asset_spec": asset_spec,
        "style": "runtime_texture",
        "transparent_background": True,
    }


def generate(payload: dict | None = None):
    return RuntimeVfxPromptService().generate_prompts(
        RuntimeVfxPromptRequest.model_validate(payload or request_payload())
    )


def usages_for_slot(response, slot: str) -> set[str]:
    return {item.usage for item in response.prompts if item.slot == slot}


def test_generate_prompts_from_playable_spec_without_runtime_vfx_asset_spec():
    response = generate()

    assert response.prompts
    assert {item.slot for item in response.prompts} == {"Q", "W", "E", "R"}


def test_projectile_skill_creates_projectile_trail_impact_prompts():
    response = generate()

    assert usages_for_slot(response, "Q") == {"projectile", "trail", "impact"}


def test_aoe_dot_skill_creates_ground_decal_prompt():
    response = generate()

    assert usages_for_slot(response, "W") == {"ground_decal"}


def test_ground_decal_prompt_requires_flat_top_down_texture():
    response = generate()
    ground_decal_prompt = next(
        item.prompt
        for item in response.prompts
        if item.slot == "W" and item.usage == "ground_decal"
    )
    prompt_text = ground_decal_prompt.lower()

    assert "strict top-down view" in prompt_text
    assert "flat circular ground decal" in prompt_text
    assert "painted-on-ground area marker" in prompt_text
    assert "no dome" in prompt_text
    assert "no sphere" in prompt_text
    assert "no 3d object" in prompt_text
    assert "no perspective view" in prompt_text


def test_buff_skill_creates_aura_prompt():
    response = generate()

    assert usages_for_slot(response, "R") == {"aura"}


def test_summon_skill_creates_summon_body_aura_impact_prompts():
    spec = playable_spec()
    spec["skills"][0].update(
        {
            "name": "Flame Spirit",
            "type": "summon",
            "duration": 8,
            "damage": 18,
            "range": 8,
            "radius": 1.2,
            "description": "Summon a small flame spirit to attack enemies.",
        }
    )
    for field in ("speed",):
        spec["skills"][0].pop(field, None)

    response = generate(request_payload(spec=spec))

    assert usages_for_slot(response, "Q") == {"summon_body", "aura", "impact"}
    summon_prompt = next(
        item.prompt
        for item in response.prompts
        if item.slot == "Q" and item.usage == "summon_body"
    )
    assert "summoned creature body sprite" in summon_prompt
    assert "transparent background" in summon_prompt


def test_prompts_contain_transparent_background_keywords():
    response = generate()

    assert all("transparent background" in item.prompt for item in response.prompts)
    assert all("isolated game VFX texture asset" in item.prompt for item in response.prompts)
    assert all("suitable for Three.js or Babylon.js" in item.prompt for item in response.prompts)


def test_runtime_prompts_use_resource_specific_texture_templates():
    response = generate()
    prompts_by_usage = {item.usage: item.prompt for item in response.prompts}

    assert "isolated projectile sprite" in prompts_by_usage["projectile"]
    assert "elongated energy trail texture" in prompts_by_usage["trail"]
    assert "isolated impact explosion sprite" in prompts_by_usage["impact"]
    assert "top-down circular ground decal" in prompts_by_usage["ground_decal"]
    assert "top-down aura ring" in prompts_by_usage["aura"]


def test_prompts_contain_no_text_no_logo_no_watermark_keywords():
    response = generate()

    for item in response.prompts:
        prompt_text = f"{item.prompt} {item.negative_prompt}"
        assert "no text" in prompt_text
        assert "no logo" in prompt_text
        assert "no watermark" in prompt_text


def test_invalid_playable_spec_fails():
    invalid = copy.deepcopy(playable_spec())
    invalid["version"] = "2.0"

    with pytest.raises(ValidationError):
        RuntimeVfxPromptRequest.model_validate(request_payload(spec=invalid))


def test_runtime_vfx_asset_spec_provided_uses_assets_for_prompts():
    response = generate(request_payload(asset_spec=runtime_vfx_asset_spec()))

    assert usages_for_slot(response, "Q") == {"projectile", "trail", "impact"}
    assert usages_for_slot(response, "R") == {"ground_decal", "impact", "aura"}


def test_no_image_generation_service_is_called(monkeypatch):
    def fail_if_called(*args, **kwargs):
        raise AssertionError("image generation service must not be called")

    monkeypatch.setattr(ImageGenerationService, "generate_for_prompt", fail_if_called)
    monkeypatch.setattr(
        ImageGenerationService, "generate_for_prompt_batch", fail_if_called
    )

    response = generate()

    assert response.prompts
