import copy

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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


def payload(spec: dict | None = None) -> dict:
    return {
        "playable_spec": spec or playable_spec(),
        "runtime_vfx_asset_spec": None,
        "style": "runtime_texture",
        "transparent_background": True,
    }


def test_post_runtime_vfx_prompts_returns_200():
    response = client.post("/api/runtime-vfx/prompts", json=payload())

    assert response.status_code == 200


def test_response_contains_prompts():
    response = client.post("/api/runtime-vfx/prompts", json=payload())

    assert response.json()["prompts"]


def test_response_covers_qwer_related_prompt_items():
    response = client.post("/api/runtime-vfx/prompts", json=payload())

    slots = {item["slot"] for item in response.json()["prompts"]}
    assert slots == {"Q", "W", "E", "R"}


def test_invalid_playable_spec_returns_validation_error():
    invalid = copy.deepcopy(playable_spec())
    invalid["skills"][0]["type"] = "summon_beast"

    response = client.post("/api/runtime-vfx/prompts", json=payload(invalid))

    assert response.status_code == 422


def test_route_does_not_require_real_api_key(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("IMAGE_API_KEY", raising=False)

    response = client.post("/api/runtime-vfx/prompts", json=payload())

    assert response.status_code == 200


def test_route_does_not_return_image_urls():
    response = client.post("/api/runtime-vfx/prompts", json=payload())

    for item in response.json()["prompts"]:
        assert "image_url" not in item
        assert "image_path" not in item
