import copy

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.playable_schema import HeroPlayableSpec


client = TestClient(app)


def generate_payload() -> dict:
    return {
        "hero_design": {
            "hero_name": "Solar Warden",
            "hero_title": "Keeper of the Trial Gate",
            "role": "fighter",
            "core_tags": ["holy", "area_damage"],
        },
        "style": "3d_training_demo",
        "complexity": "mvp",
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


def test_generate_route_returns_200(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "fake")

    response = client.post("/api/playable/generate", json=generate_payload())

    assert response.status_code == 200


def test_generate_response_contains_playable_spec(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "fake")

    response = client.post("/api/playable/generate", json=generate_payload())

    assert "playable_spec" in response.json()


def test_generate_playable_spec_passes_schema(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "fake")

    response = client.post("/api/playable/generate", json=generate_payload())

    spec = HeroPlayableSpec.model_validate(response.json()["playable_spec"])
    assert {skill.slot for skill in spec.skills} == {"Q", "W", "E", "R"}


def test_generate_route_falls_back_when_llm_provider_is_unavailable(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")

    response = client.post("/api/playable/generate", json=generate_payload())

    assert response.status_code == 200
    spec = HeroPlayableSpec.model_validate(response.json()["playable_spec"])
    assert spec.hero.name == "Solar Warden"
    assert {skill.slot for skill in spec.skills} == {"Q", "W", "E", "R"}


def test_validate_route_returns_valid_true_for_valid_spec():
    response = client.post(
        "/api/playable/validate",
        json={"playable_spec": valid_spec()},
    )

    assert response.status_code == 200
    assert response.json() == {"valid": True, "errors": []}


def test_validate_route_returns_valid_false_for_invalid_spec():
    spec = copy.deepcopy(valid_spec())
    spec["skills"][0]["type"] = "summon_beast"

    response = client.post(
        "/api/playable/validate",
        json={"playable_spec": spec},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["valid"] is False
    assert payload["errors"]
