from app.clients.fake_llm_client import FakeLLMClient
from app.schemas.image_prompt_schema import (
    TexturePromptFromVfxRequest,
    TexturePromptRequest,
)
from app.schemas.vfx_schema import VfxDesign, VfxStage
from app.services.image_prompt_service import ImagePromptService


def make_vfx_design(skill_name: str = "Flame Field") -> VfxDesign:
    return VfxDesign(
        skill_name=skill_name,
        vfx_category="AOE / Fire / Runtime Texture",
        visual_keywords=["fire", "orange flame", "magic circle"],
        stages=[
            VfxStage(stage="cast", description="fire energy gathers"),
            VfxStage(stage="projectile", description="fire moves forward"),
            VfxStage(stage="impact", description="fire bursts outward"),
            VfxStage(stage="active", description="burning field remains"),
        ],
        color_palette={"main": "#FF5A1F"},
        camera_suggestion="top-down decal view",
        sound_suggestion="fire loop",
        image_prompt=None,
    )


def test_generate_texture_prompts_returns_prompt_collection_without_llm():
    service = ImagePromptService(llm_client=FakeLLMClient())

    result = service.generate_texture_prompts(
        TexturePromptRequest(
            skill_name="Flame Bolt",
            skill_type="projectile",
            element="fire",
            keywords=["orange flame"],
        )
    )

    assert set(result.prompts) == {"projectile", "trail", "impact", "particle"}
    assert "transparent background" in result.prompts["projectile"]
    assert "suitable for Three.js or Babylon.js" in result.prompts["projectile"]
    assert "no text" in result.prompts["projectile"]
    assert "no logo" in result.prompts["projectile"]
    assert "no watermark" in result.prompts["projectile"]


def test_generate_texture_prompts_for_vfx_infers_element_and_resources():
    service = ImagePromptService(llm_client=FakeLLMClient())

    result = service.generate_texture_prompts_for_vfx(
        TexturePromptFromVfxRequest(
            vfx_design=make_vfx_design(),
            skill_type="aoe_dot",
        )
    )

    assert result.element == "fire"
    assert set(result.prompts) == {"ground_decal", "aura", "particle"}
