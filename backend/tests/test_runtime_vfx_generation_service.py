import copy
import shutil
from pathlib import Path

import pytest
from PIL import Image
from pydantic import ValidationError

from app.clients.fake_image_client import FakeImageClient
from app.schemas.runtime_vfx_generation_schema import RuntimeVfxGenerationRequest
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.services.runtime_vfx_generation_service import (
    RuntimeVfxGenerationService,
    _atlas_cell_box,
    _atlas_grid,
    _build_atlas_prompt,
    select_prompt_items,
)
from app.storage.file_storage import OUTPUT_ROOT


@pytest.fixture(autouse=True)
def cleanup_runtime_vfx_test_outputs():
    yield
    runtime_root = OUTPUT_ROOT / "runtime_vfx"
    for path in runtime_root.glob("runtime_vfx_service_*"):
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
    test_path = runtime_root / "runtime_vfx_test"
    if test_path.is_dir():
        shutil.rmtree(test_path, ignore_errors=True)


class FailingImageClient:
    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        raise RuntimeError("provider failed")


class CountingImageClient(FakeImageClient):
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "save_path": save_path,
                "width": width,
                "height": height,
            }
        )
        return super().generate_image(prompt, negative_prompt, save_path, width, height)


def playable_spec() -> dict:
    return {
        "version": "1.0",
        "hero": {
            "id": "runtime_test_hero",
            "name": "Runtime Test Hero",
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


def request_payload(max_textures: int = 8, project_id: str = "runtime_vfx_test") -> dict:
    return {
        "playable_spec": playable_spec(),
        "runtime_vfx_asset_spec": None,
        "max_textures": max_textures,
        "image_size": "512x512",
        "transparent_background": True,
        "project_id": project_id,
    }


def summon_request_payload(project_id: str = "runtime_vfx_summon_test") -> dict:
    payload = request_payload(max_textures=8, project_id=project_id)
    summon_skill = payload["playable_spec"]["skills"][0]
    summon_skill.update(
        {
            "name": "Flame Spirit",
            "type": "summon",
            "duration": 8,
            "damage": 18,
            "range": 8,
            "radius": 1.2,
            "description": "Summon a small flame spirit to attack nearby enemies.",
        }
    )
    summon_skill.pop("speed", None)
    return payload


def generate(max_textures: int = 8, project_id: str = "runtime_vfx_test"):
    service = RuntimeVfxGenerationService(image_client=FakeImageClient())
    return service.generate(
        RuntimeVfxGenerationRequest.model_validate(
            request_payload(max_textures=max_textures, project_id=project_id)
        )
    )


def output_file_for_asset_path(asset_path: str) -> Path:
    assert asset_path.startswith("runtime_vfx/")
    return OUTPUT_ROOT / asset_path


def test_generate_runtime_vfx_assets_from_playable_spec_with_fake_image_provider():
    response = generate(project_id="runtime_vfx_service_001")

    assert response.generated_assets


def test_response_contains_runtime_vfx_asset_spec():
    response = generate(project_id="runtime_vfx_service_002")

    assert isinstance(response.runtime_vfx_asset_spec, RuntimeVfxAssetSpec)


def test_generated_spec_passes_runtime_vfx_asset_spec_validation():
    response = generate(project_id="runtime_vfx_service_003")

    spec = RuntimeVfxAssetSpec.model_validate(
        response.runtime_vfx_asset_spec.model_dump()
    )
    assert spec.version == "1.0"
    assert set(spec.skills.keys()) == {"Q", "W", "E", "R"}


def test_generated_assets_count_is_less_than_or_equal_to_max_textures():
    response = generate(max_textures=5, project_id="runtime_vfx_service_004")

    assert len(response.generated_assets) <= 5


def test_generated_asset_paths_are_safe_relative_paths():
    response = generate(project_id="runtime_vfx_service_005")

    for asset in response.generated_assets:
        assert asset.path.startswith("runtime_vfx/")
        assert ".." not in asset.path.split("/")
        assert not asset.path.startswith(("http://", "https://", "javascript:"))


def test_generated_files_are_written():
    response = generate(project_id="runtime_vfx_service_006")

    for asset in response.generated_assets:
        assert output_file_for_asset_path(asset.path).exists()


def test_generated_files_have_transparent_alpha_after_cleanup():
    response = generate(project_id="runtime_vfx_service_alpha")

    for asset in response.generated_assets:
        image = Image.open(output_file_for_asset_path(asset.path)).convert("RGBA")
        alpha = image.getchannel("A")
        assert alpha.getextrema()[0] == 0


def test_generation_uses_one_atlas_image_request():
    image_client = CountingImageClient()
    service = RuntimeVfxGenerationService(image_client=image_client)
    response = service.generate(
        RuntimeVfxGenerationRequest.model_validate(
            request_payload(project_id="runtime_vfx_service_atlas")
        )
    )

    assert len(image_client.calls) == 1
    assert image_client.calls[0]["width"] == 1024
    assert image_client.calls[0]["height"] == 1024
    assert "_runtime_vfx_atlas.png" in str(image_client.calls[0]["save_path"])
    assert response.generated_assets
    for asset in response.generated_assets:
        assert output_file_for_asset_path(asset.path).exists()
        image = Image.open(output_file_for_asset_path(asset.path)).convert("RGBA")
        assert image.getchannel("A").getextrema()[0] == 0


def test_atlas_cell_boxes_cover_1024_canvas_without_lost_edge_pixels():
    grid = _atlas_grid(7)

    assert grid.columns == 3
    assert grid.rows == 3
    assert _atlas_cell_box(0, 1024, 1024, grid).left == 0
    assert _atlas_cell_box(0, 1024, 1024, grid).right == 341
    assert _atlas_cell_box(1, 1024, 1024, grid).left == 341
    assert _atlas_cell_box(1, 1024, 1024, grid).right == 683
    assert _atlas_cell_box(2, 1024, 1024, grid).left == 683
    assert _atlas_cell_box(2, 1024, 1024, grid).right == 1024
    assert _atlas_cell_box(6, 1024, 1024, grid).upper == 683
    assert _atlas_cell_box(6, 1024, 1024, grid).lower == 1024


def test_atlas_prompt_describes_cell_pixel_ranges_and_content_occupancy():
    service = RuntimeVfxGenerationService(image_client=FakeImageClient())
    req = RuntimeVfxGenerationRequest.model_validate(request_payload())
    prompt_response = service.prompt_service.generate_prompts(
        {
            "playable_spec": req.playable_spec.model_dump(),
            "runtime_vfx_asset_spec": None,
            "transparent_background": True,
        }
    )
    selected, _warnings = select_prompt_items(prompt_response.prompts, max_textures=8)

    prompt = _build_atlas_prompt(selected, transparent_background=True)

    assert "about 11.11 percent of the full 1024x1024 canvas" in prompt
    assert "visible effect should occupy the centered 65 to 75 percent" in prompt
    assert "Use pixel cell x=0-341, y=0-341" in prompt
    assert "Use pixel cell x=341-683, y=0-341" in prompt
    assert "Exact texture prompt for this cell:" in prompt
    assert "suitable for Three.js or Babylon.js" in prompt
    assert "isolated projectile sprite" in prompt
    assert "For any ground_decal cell: use strict top-down view" in prompt
    assert "flat circular ground decal" in prompt
    assert "no dome" in prompt
    assert "no sphere" in prompt
    assert "no 3D object" in prompt


def test_max_textures_trims_prompts_and_returns_warnings():
    response = generate(max_textures=5, project_id="runtime_vfx_service_007")

    assert len(response.generated_assets) == 5
    assert response.warnings


def test_projectile_skill_generates_projectile_asset_when_within_limit():
    response = generate(project_id="runtime_vfx_service_008")

    assert "projectile" in response.runtime_vfx_asset_spec.skills["Q"].assets


def test_aoe_dot_skill_generates_ground_decal_asset():
    response = generate(project_id="runtime_vfx_service_009")

    assert "ground_decal" in response.runtime_vfx_asset_spec.skills["W"].assets


def test_summon_skill_generates_summon_body_asset():
    service = RuntimeVfxGenerationService(image_client=FakeImageClient())
    response = service.generate(
        RuntimeVfxGenerationRequest.model_validate(
            summon_request_payload(project_id="runtime_vfx_service_summon")
        )
    )

    q_assets = response.runtime_vfx_asset_spec.skills["Q"].assets
    assert "summon_body" in q_assets
    assert q_assets["summon_body"].usage == "summon_body"
    assert any(asset.usage == "summon_body" for asset in response.generated_assets)
    assert output_file_for_asset_path(q_assets["summon_body"].path).exists()


def test_invalid_playable_spec_fails():
    invalid = copy.deepcopy(request_payload())
    invalid["playable_spec"]["version"] = "2.0"

    with pytest.raises(ValidationError):
        RuntimeVfxGenerationRequest.model_validate(invalid)


def test_image_provider_failure_raises_controlled_service_error():
    service = RuntimeVfxGenerationService(image_client=FailingImageClient())
    req = RuntimeVfxGenerationRequest.model_validate(request_payload())

    with pytest.raises(RuntimeError, match="Runtime VFX texture generation failed"):
        service.generate(req)
