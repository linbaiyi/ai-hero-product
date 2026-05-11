import pytest
from pydantic import ValidationError

from app.schemas.image_generation_schema import (
    ImageGenerationBatchRequest,
    ImageGenerationRequest,
    ImageGenerationResult,
)


def make_image_prompt(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "prompt": (
            "fire ember explosion burning game VFX concept art, dark background, "
            "no text, no logo, no watermark"
        ),
        "negative_prompt": "text, logo, watermark",
    }


def test_valid_image_generation_request_passes_validation():
    req = ImageGenerationRequest(
        image_prompt=make_image_prompt(),
        project_id="demo_fire_001",
        width=512,
        height=512,
    )

    assert req.image_prompt.skill_name == "烈焰冲击"
    assert req.width == 512


def test_image_generation_request_width_too_small_fails():
    with pytest.raises(ValidationError):
        ImageGenerationRequest(image_prompt=make_image_prompt(), width=255)


def test_image_generation_request_height_too_large_fails():
    with pytest.raises(ValidationError):
        ImageGenerationRequest(image_prompt=make_image_prompt(), height=2049)


def test_valid_image_generation_batch_request_passes_validation():
    req = ImageGenerationBatchRequest(
        image_prompts=[make_image_prompt("烈焰冲击"), make_image_prompt("寒冰裂隙")],
        project_id="demo_batch_001",
    )

    assert len(req.image_prompts) == 2


def test_image_generation_batch_empty_prompts_fails():
    with pytest.raises(ValidationError):
        ImageGenerationBatchRequest(image_prompts=[])


def test_valid_image_generation_result_passes_validation():
    result = ImageGenerationResult(
        skill_name="烈焰冲击",
        image_path="outputs/images/demo/skill_fire.png",
        file_name="skill_fire.png",
        width=512,
        height=512,
    )

    assert result.success is True


def test_image_generation_result_empty_skill_name_fails():
    with pytest.raises(ValidationError):
        ImageGenerationResult(
            skill_name="",
            image_path="outputs/images/demo/skill_fire.png",
            file_name="skill_fire.png",
            width=512,
            height=512,
        )
