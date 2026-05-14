import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec


EXAMPLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "playable"
    / "RuntimeVfxAssetSpec.example.json"
)


def load_example() -> dict:
    return json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))


def validate(data: dict) -> RuntimeVfxAssetSpec:
    return RuntimeVfxAssetSpec.model_validate(data)


def first_asset(data: dict) -> dict:
    return data["skills"]["Q"]["assets"]["projectile"]


def test_example_json_passes():
    spec = validate(load_example())

    assert spec.version == "1.0"
    assert set(spec.skills.keys()) == {"Q", "W", "E", "R"}


def test_invalid_version_fails():
    data = load_example()
    data["version"] = "2.0"

    with pytest.raises(ValidationError):
        validate(data)


def test_missing_skill_slot_fails():
    data = load_example()
    del data["skills"]["R"]

    with pytest.raises(ValidationError):
        validate(data)


def test_extra_skill_slot_fails():
    data = load_example()
    data["skills"]["X"] = copy.deepcopy(data["skills"]["Q"])

    with pytest.raises(ValidationError):
        validate(data)


def test_blank_hero_id_fails():
    data = load_example()
    data["hero_id"] = "   "

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_usage_fails():
    data = load_example()
    first_asset(data)["usage"] = "unknown"

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_render_mode_fails():
    data = load_example()
    first_asset(data)["render_mode"] = "mesh"

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_blend_mode_fails():
    data = load_example()
    first_asset(data)["blend_mode"] = "screen"

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_color_tint_fails():
    data = load_example()
    first_asset(data)["color_tint"] = "red"

    with pytest.raises(ValidationError):
        validate(data)


@pytest.mark.parametrize("scale", [0, -1])
def test_scale_must_be_positive(scale: float):
    data = load_example()
    first_asset(data)["scale"] = scale

    with pytest.raises(ValidationError):
        validate(data)


def test_duration_cannot_be_negative():
    data = load_example()
    first_asset(data)["duration"] = -1

    with pytest.raises(ValidationError):
        validate(data)


def test_opacity_range():
    data = load_example()
    first_asset(data)["opacity"] = 2

    with pytest.raises(ValidationError):
        validate(data)


def test_path_cannot_be_empty():
    data = load_example()
    first_asset(data)["path"] = "   "

    with pytest.raises(ValidationError):
        validate(data)


def test_path_rejects_remote_url():
    data = load_example()
    first_asset(data)["path"] = "https://example.com/a.png"

    with pytest.raises(ValidationError):
        validate(data)


def test_path_rejects_javascript_protocol():
    data = load_example()
    first_asset(data)["path"] = "javascript:alert(1)"

    with pytest.raises(ValidationError):
        validate(data)


def test_path_rejects_parent_traversal():
    data = load_example()
    first_asset(data)["path"] = "../secret.png"

    with pytest.raises(ValidationError):
        validate(data)


def test_ground_decal_requires_ground_plane():
    data = load_example()
    asset = data["skills"]["W"]["assets"]["ground_decal"]
    asset["render_mode"] = "sprite"

    with pytest.raises(ValidationError):
        validate(data)


def test_projectile_skill_requires_projectile_asset():
    data = load_example()
    data["skills"]["Q"]["assets"] = {
        key: value
        for key, value in data["skills"]["Q"]["assets"].items()
        if value["usage"] != "projectile"
    }

    with pytest.raises(ValidationError):
        validate(data)


def test_aoe_dot_requires_ground_decal():
    data = load_example()
    data["skills"]["W"]["assets"] = {
        "impact": data["skills"]["W"]["assets"]["impact"],
    }

    with pytest.raises(ValidationError):
        validate(data)


def test_buff_requires_aura():
    data = load_example()
    data["skills"]["Q"] = {
        "skill_name": "Flame Guard",
        "skill_type": "buff",
        "assets": {
            "impact": {
                "path": "runtime_textures/buff_impact.png",
                "usage": "impact",
                "blend_mode": "additive",
                "render_mode": "sprite",
                "scale": 1,
                "duration": 0.3,
                "loop": False,
            }
        },
    }

    with pytest.raises(ValidationError):
        validate(data)


def test_summon_body_asset_passes_for_summon_skill():
    data = load_example()
    data["skills"]["Q"] = {
        "skill_name": "Flame Spirit",
        "skill_type": "summon",
        "assets": {
            "summon_body": {
                "path": "runtime_textures/Q_summon_body.png",
                "usage": "summon_body",
                "blend_mode": "alpha",
                "render_mode": "sprite",
                "scale": 1.6,
                "duration": 8,
                "loop": False,
                "color_tint": "#ff5a1f",
            },
            "aura": {
                "path": "runtime_textures/Q_summon_aura.png",
                "usage": "aura",
                "blend_mode": "additive",
                "render_mode": "aura_ring",
                "scale": 2,
                "duration": 8,
                "loop": True,
            },
        },
    }

    spec = validate(data)

    assert spec.skills["Q"].skill_type == "summon"
    assert spec.skills["Q"].assets["summon_body"].usage == "summon_body"


def test_summon_skill_requires_summon_body():
    data = load_example()
    data["skills"]["Q"] = {
        "skill_name": "Flame Spirit",
        "skill_type": "summon",
        "assets": {
            "aura": {
                "path": "runtime_textures/Q_summon_aura.png",
                "usage": "aura",
                "blend_mode": "additive",
                "render_mode": "aura_ring",
                "scale": 2,
                "duration": 8,
                "loop": True,
            }
        },
    }

    with pytest.raises(ValidationError):
        validate(data)


def test_summon_body_requires_sprite_or_billboard_plane():
    data = load_example()
    data["skills"]["Q"] = {
        "skill_name": "Flame Spirit",
        "skill_type": "summon",
        "assets": {
            "summon_body": {
                "path": "runtime_textures/Q_summon_body.png",
                "usage": "summon_body",
                "blend_mode": "alpha",
                "render_mode": "ground_plane",
                "scale": 1.6,
                "duration": 8,
                "loop": False,
            }
        },
    }

    with pytest.raises(ValidationError):
        validate(data)


def test_status_runtime_vfx_usage_passes():
    data = load_example()
    data["skills"]["Q"]["assets"]["status"] = {
        "path": "runtime_textures/Q_burn_loop.png",
        "usage": "burn_loop",
        "blend_mode": "additive",
        "render_mode": "sprite",
        "scale": 1,
        "duration": 3,
        "loop": True,
    }

    spec = validate(data)

    assert spec.skills["Q"].assets["status"].usage == "burn_loop"


def test_stage_aware_runtime_vfx_asset_fields_pass():
    data = load_example()
    data["skills"]["Q"]["assets"]["cast_flash"] = {
        "path": "runtime_textures/Q_cast_flash.png",
        "usage": "cast_flash",
        "blend_mode": "additive",
        "render_mode": "sprite",
        "scale": 1.5,
        "duration": 0.25,
        "loop": False,
        "trigger": "on_cast",
        "action": "spawn_projectile",
        "effect_index": 0,
    }

    spec = validate(data)

    assert spec.skills["Q"].assets["cast_flash"].trigger == "on_cast"
    assert spec.skills["Q"].assets["cast_flash"].action == "spawn_projectile"
    assert spec.skills["Q"].assets["cast_flash"].effect_index == 0


def test_cast_circle_requires_ground_style_render_mode():
    data = load_example()
    data["skills"]["Q"]["assets"]["cast_circle"] = {
        "path": "runtime_textures/Q_cast_circle.png",
        "usage": "cast_circle",
        "blend_mode": "additive",
        "render_mode": "sprite",
        "scale": 2,
        "duration": 0.5,
        "loop": False,
    }

    with pytest.raises(ValidationError):
        validate(data)
