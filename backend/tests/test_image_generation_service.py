from pathlib import Path

from PIL import Image

from app.schemas.image_generation_schema import (
    ImageGenerationBatchRequest,
    ImageGenerationRequest,
)
from app.services.image_generation_service import ImageGenerationService


class RecordingImageClient:
    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (width, height), (12, 12, 18)).save(save_path, "PNG")
        return save_path


class PartiallyBrokenImageClient:
    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        if "broken" in prompt:
            raise RuntimeError("image generation crashed")

        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (width, height), (12, 12, 18)).save(save_path, "PNG")
        return save_path


def make_image_prompt(skill_name: str = "烈焰冲击", prompt: str | None = None) -> dict:
    return {
        "skill_name": skill_name,
        "prompt": prompt
        or "fire ember explosion burning game VFX concept art, dark background, no text",
        "negative_prompt": "text, logo, watermark",
    }


def test_generate_for_prompt_returns_success_result():
    service = ImageGenerationService(image_client=RecordingImageClient())
    req = ImageGenerationRequest(
        image_prompt=make_image_prompt(),
        project_id="service_single_001",
        width=512,
        height=512,
    )

    result = service.generate_for_prompt(req)

    assert result.success is True
    assert Path(result.image_path).exists()
    assert result.width == 512
    assert result.height == 512


def test_generate_for_prompt_batch_returns_one_result_per_prompt():
    service = ImageGenerationService(image_client=RecordingImageClient())
    req = ImageGenerationBatchRequest(
        image_prompts=[make_image_prompt("烈焰冲击"), make_image_prompt("寒冰裂隙")],
        project_id="service_batch_001",
        width=256,
        height=256,
    )

    results = service.generate_for_prompt_batch(req)

    assert len(results) == 2
    assert all(result.success for result in results)


def test_batch_single_failure_does_not_stop_other_images():
    service = ImageGenerationService(image_client=PartiallyBrokenImageClient())
    req = ImageGenerationBatchRequest(
        image_prompts=[
            make_image_prompt("烈焰冲击"),
            make_image_prompt("破碎技能", "broken prompt for test failure handling"),
        ],
        project_id="service_partial_failure_001",
        width=256,
        height=256,
    )

    results = service.generate_for_prompt_batch(req)

    assert len(results) == 2
    assert results[0].success is True
    assert results[1].success is False
    assert "image generation crashed" in (results[1].error_message or "")


def test_unsafe_project_id_is_sanitized_and_kept_inside_outputs():
    service = ImageGenerationService(image_client=RecordingImageClient())
    req = ImageGenerationRequest(
        image_prompt=make_image_prompt(),
        project_id="../unsafe:path",
        width=256,
        height=256,
    )

    result = service.generate_for_prompt(req)

    assert ".." not in result.image_path
    assert result.image_path.startswith("outputs/images/")
    assert Path(result.image_path).resolve().is_relative_to(Path("outputs").resolve())
