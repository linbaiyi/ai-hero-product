import copy
import json

from app.schemas.playable_schema import HeroPlayableSpec
from app.services.playable_spec_service import PlayableSpecService, validate_playable_spec


class ValidPlayableLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        assert schema_name == "playable_spec"
        return valid_spec()


class InvalidPlayableLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        return {"version": "2.0", "skills": []}


class RaisingPlayableLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        raise RuntimeError("llm unavailable")


def hero_design() -> dict:
    return {
        "hero_name": "Solar Warden",
        "hero_title": "Keeper of the Trial Gate",
        "role": "fighter",
        "core_tags": ["holy", "dash", "area_damage"],
    }


def summon_hero_design() -> dict:
    return {
        "hero_name": "Liena Fire Spirit",
        "hero_title": "Flame Pact Summoner",
        "role": "mage",
        "background": "她能召唤火灵协助战斗，并让召唤个体攻击附近敌人。",
        "skills": [
            {
                "slot": "E",
                "name": "召唤炎灵",
                "description": "召唤一个火灵宠物协助攻击。",
            }
        ],
    }


def burning_hero_design() -> dict:
    return {
        "hero_name": "Liena Fire Spirit",
        "hero_title": "Flame Pact Mage",
        "role": "mage",
        "background": "她的火焰技能会对敌人施加灼烧标记，持续造成燃烧伤害。",
        "core_tags": ["fire", "burn", "灼烧"],
    }


def valid_spec() -> dict:
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
                "name": "Solar Verdict",
                "type": "aoe",
                "cooldown": 45,
                "resource_cost": 70,
                "damage": 300,
                "range": 16,
                "radius": 5,
                "duration": 1,
                "description": "Call down a large holy impact.",
                "vfx": {
                    "theme": "holy",
                    "color": "#ffd700",
                    "shape": "burst",
                    "impact": "solar_impact",
                    "trail": "falling_light",
                },
            },
        ],
        "runtime": {
            "control_scheme": "wasd_mouse",
            "camera": "third_person_follow",
            "map_profile": "default_training_arena",
        },
    }


def test_generate_returns_valid_hero_playable_spec():
    service = PlayableSpecService(llm_client=ValidPlayableLLMClient())

    spec = service.generate(hero_design())

    assert isinstance(spec, HeroPlayableSpec)
    assert spec.version == "1.0"


def test_generated_spec_contains_qwer():
    service = PlayableSpecService(llm_client=ValidPlayableLLMClient())

    spec = service.generate(hero_design())

    assert {skill.slot for skill in spec.skills} == {"Q", "W", "E", "R"}


def test_generated_spec_passes_schema_validation():
    service = PlayableSpecService(llm_client=ValidPlayableLLMClient())

    spec = service.generate(hero_design())

    assert HeroPlayableSpec.model_validate(spec.model_dump()).hero.name == "Solar Warden"


def test_invalid_llm_json_falls_back_to_safe_spec():
    service = PlayableSpecService(llm_client=InvalidPlayableLLMClient())

    spec = service.generate(hero_design())

    assert spec.version == "1.0"
    assert {skill.slot for skill in spec.skills} == {"Q", "W", "E", "R"}
    assert spec.hero.name == "Solar Warden"


def test_generate_prefers_summon_skill_when_hero_design_requests_summon():
    service = PlayableSpecService(llm_client=ValidPlayableLLMClient())

    spec = service.generate(summon_hero_design())

    summon_skills = [skill for skill in spec.skills if skill.type == "summon"]
    assert summon_skills
    assert summon_skills[0].duration is not None
    assert summon_skills[0].damage is not None
    assert summon_skills[0].range is not None


def test_fallback_safe_spec_can_include_summon_for_summon_hero_design():
    service = PlayableSpecService(llm_client=InvalidPlayableLLMClient())

    spec = service.generate(summon_hero_design())

    assert any(skill.type == "summon" for skill in spec.skills)


def test_generate_maps_burning_design_to_burn_status_effects():
    service = PlayableSpecService(llm_client=ValidPlayableLLMClient())

    spec = service.generate(burning_hero_design())

    burn_skills = [
        skill for skill in spec.skills if any(effect.type == "burn" for effect in skill.status_effects)
    ]
    assert burn_skills


def test_llm_error_falls_back_to_safe_spec_from_json_string():
    service = PlayableSpecService(llm_client=RaisingPlayableLLMClient())

    spec = service.generate(json.dumps(hero_design()))

    assert spec.version == "1.0"
    assert spec.hero.name == "Solar Warden"
    assert {skill.slot for skill in spec.skills} == {"Q", "W", "E", "R"}


def test_validate_accepts_valid_spec():
    valid, errors = validate_playable_spec(valid_spec())

    assert valid is True
    assert errors == []


def test_validate_rejects_invalid_spec():
    invalid = copy.deepcopy(valid_spec())
    invalid["version"] = "2.0"

    valid, errors = validate_playable_spec(invalid)

    assert valid is False
    assert errors
