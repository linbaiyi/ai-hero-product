import copy
import shutil

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.storage.file_storage import OUTPUT_ROOT


client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_runtime_vfx_route_outputs():
    yield
    route_path = OUTPUT_ROOT / "runtime_vfx" / "runtime_vfx_route_test"
    if route_path.is_dir():
        shutil.rmtree(route_path, ignore_errors=True)


def playable_spec() -> dict:
    return {
        "version": "1.0",
        "hero": {
            "id": "runtime_route_hero",
            "name": "Runtime Route Hero",
            "title": "Texture Trial",
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


def payload(max_textures: int = 8) -> dict:
    return {
        "playable_spec": playable_spec(),
        "runtime_vfx_asset_spec": None,
        "max_textures": max_textures,
        "image_size": "512x512",
        "transparent_background": True,
        "project_id": "runtime_vfx_route_test",
    }


def test_post_runtime_vfx_generate_returns_200_with_fake_image_provider(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")

    response = client.post("/api/runtime-vfx/generate", json=payload())

    assert response.status_code == 200


def test_response_contains_runtime_vfx_asset_spec(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")

    response = client.post("/api/runtime-vfx/generate", json=payload())

    assert "runtime_vfx_asset_spec" in response.json()


def test_response_contains_generated_assets(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")

    response = client.post("/api/runtime-vfx/generate", json=payload())

    assert response.json()["generated_assets"]


def test_generated_spec_validates(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")

    response = client.post("/api/runtime-vfx/generate", json=payload())

    spec = RuntimeVfxAssetSpec.model_validate(
        response.json()["runtime_vfx_asset_spec"]
    )
    assert spec.version == "1.0"


def test_max_textures_respected(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")

    response = client.post("/api/runtime-vfx/generate", json=payload(max_textures=5))

    assert len(response.json()["generated_assets"]) <= 5
    assert response.json()["warnings"]


def test_invalid_playable_spec_returns_validation_error(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")
    invalid = payload()
    invalid["playable_spec"] = copy.deepcopy(invalid["playable_spec"])
    invalid["playable_spec"]["skills"][0]["type"] = "summon_beast"

    response = client.post("/api/runtime-vfx/generate", json=invalid)

    assert response.status_code == 422


def test_route_does_not_require_real_api_key(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")
    monkeypatch.delenv("IMAGE_API_KEY", raising=False)

    response = client.post("/api/runtime-vfx/generate", json=payload())

    assert response.status_code == 200
