import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.playable_schema import HeroPlayableSpec


EXAMPLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "playable"
    / "HeroPlayableSpec.example.json"
)


def load_example() -> dict:
    return json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))


def validate(data: dict) -> HeroPlayableSpec:
    return HeroPlayableSpec.model_validate(data)


def test_valid_example_json_passes():
    spec = validate(load_example())

    assert spec.version == "1.0"
    assert {skill.slot for skill in spec.skills} == {"Q", "W", "E", "R"}


def test_missing_required_hero_field_fails():
    data = load_example()
    del data["hero"]["name"]

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_version_fails():
    data = load_example()
    data["version"] = "2.0"

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_skill_type_fails():
    data = load_example()
    data["skills"][0]["type"] = "summon_beast"

    with pytest.raises(ValidationError):
        validate(data)


def test_summon_skill_type_passes_with_duration():
    data = load_example()
    data["skills"][0]["type"] = "summon"
    data["skills"][0]["duration"] = 6
    data["skills"][0]["damage"] = 15
    data["skills"][0]["radius"] = 0.7
    data["skills"][0]["range"] = 7
    data["skills"][0]["tick_interval"] = 1

    spec = validate(data)

    assert spec.skills[0].type == "summon"


def test_status_effects_pass_validation():
    data = load_example()
    data["skills"][0]["status_effects"] = [
        {
            "type": "burn",
            "duration": 3,
            "tick_interval": 1,
            "damage": 10,
        }
    ]

    spec = validate(data)

    assert spec.skills[0].status_effects[0].type == "burn"


def test_duplicate_skill_slot_fails():
    data = load_example()
    data["skills"][1]["slot"] = "Q"

    with pytest.raises(ValidationError):
        validate(data)


def test_missing_skill_slot_fails():
    data = load_example()
    data["skills"] = [skill for skill in data["skills"] if skill["slot"] != "R"]

    with pytest.raises(ValidationError):
        validate(data)


def test_extra_skill_slot_fails():
    data = load_example()
    extra_skill = copy.deepcopy(data["skills"][0])
    extra_skill["slot"] = "Q"
    extra_skill["name"] = "额外火球"
    data["skills"].append(extra_skill)

    with pytest.raises(ValidationError):
        validate(data)


def test_negative_damage_fails():
    data = load_example()
    data["skills"][0]["damage"] = -1

    with pytest.raises(ValidationError):
        validate(data)


def test_negative_cooldown_fails():
    data = load_example()
    data["skills"][0]["cooldown"] = -1

    with pytest.raises(ValidationError):
        validate(data)


def test_invalid_hex_color_fails():
    data = load_example()
    data["skills"][0]["vfx"]["color"] = "red"

    with pytest.raises(ValidationError):
        validate(data)


def test_projectile_requires_speed_fails():
    data = load_example()
    del data["skills"][0]["speed"]

    with pytest.raises(ValidationError):
        validate(data)


def test_aoe_dot_requires_tick_interval_fails():
    data = load_example()
    aoe_dot_skill = next(skill for skill in data["skills"] if skill["type"] == "aoe_dot")
    del aoe_dot_skill["tick_interval"]

    with pytest.raises(ValidationError):
        validate(data)


def test_buff_requires_duration_fails():
    data = load_example()
    data["skills"][0] = {
        "slot": "Q",
        "name": "炽热护盾",
        "type": "buff",
        "cooldown": 12,
        "resource_cost": 30,
        "description": "短时间获得火焰护盾。",
        "vfx": {
            "theme": "fire",
            "color": "#ff5a1f",
            "shape": "shield",
            "impact": "flame_guard",
            "trail": "ember_ring",
        },
    }

    with pytest.raises(ValidationError):
        validate(data)


def test_blank_hero_name_fails():
    data = load_example()
    data["hero"]["name"] = "   "

    with pytest.raises(ValidationError):
        validate(data)


def test_runtime_supported_values_pass():
    data = load_example()
    data["runtime"] = {
        "control_scheme": "wasd_mouse",
        "camera": "third_person_follow",
        "map_profile": "default_training_arena",
    }

    spec = validate(data)

    assert spec.runtime.control_scheme == "wasd_mouse"
    assert spec.runtime.camera == "third_person_follow"
    assert spec.runtime.map_profile == "default_training_arena"


def test_skill_effects_pass_validation():
    data = load_example()
    data["skills"][0]["effects"] = [
        {
            "trigger": "on_cast",
            "action": "spawn_projectile",
            "target": "target_position",
        },
        {
            "trigger": "on_projectile_hit",
            "action": "spawn_zone",
            "target": "projectile_position",
            "radius": 3,
            "damage": 10,
            "duration": 4,
            "tick_interval": 1,
            "status_effects": [
                {
                    "type": "burn",
                    "duration": 3,
                    "tick_interval": 1,
                    "damage": 6,
                }
            ],
        },
    ]

    spec = validate(data)

    assert spec.skills[0].effects[1].action == "spawn_zone"


def test_invalid_skill_effect_trigger_fails():
    data = load_example()
    data["skills"][0]["effects"] = [
        {
            "trigger": "after_everything",
            "action": "damage",
            "target": "target_enemy",
            "damage": 10,
        }
    ]

    with pytest.raises(ValidationError):
        validate(data)
