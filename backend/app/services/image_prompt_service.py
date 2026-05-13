from pydantic import ValidationError

from app.clients.llm_client import LLMClient
from app.prompts.image_prompts import (
    build_image_prompt_generation_prompt,
    generate_texture_prompts_for_skill,
    generate_texture_prompts_for_vfx_design,
)
from app.schemas.image_prompt_schema import (
    ImagePromptBatchRequest,
    ImagePromptRequest,
    ImagePromptResult,
    TexturePromptCollectionResult,
    TexturePromptFromVfxRequest,
    TexturePromptRequest,
)


class ImagePromptService:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def generate_for_vfx(self, req: ImagePromptRequest) -> ImagePromptResult:
        prompt = build_image_prompt_generation_prompt(
            vfx_design=req.vfx_design,
            style_hint=req.style_hint,
        )
        raw_result = self.llm_client.generate_json(prompt, schema_name="image_prompt")
        raw_result["skill_name"] = req.vfx_design.skill_name

        try:
            return ImagePromptResult.model_validate(raw_result)
        except ValidationError as exc:
            raise ValueError("LLM 返回的图像 Prompt 格式不合法") from exc

    def generate_for_vfx_batch(
        self, req: ImagePromptBatchRequest
    ) -> list[ImagePromptResult]:
        return [
            self.generate_for_vfx(
                ImagePromptRequest(vfx_design=vfx_design, style_hint=req.style_hint)
            )
            for vfx_design in req.vfx_designs
        ]

    def generate_texture_prompts(
        self, req: TexturePromptRequest
    ) -> TexturePromptCollectionResult:
        return TexturePromptCollectionResult.model_validate(
            generate_texture_prompts_for_skill(
                skill_name=req.skill_name,
                skill_type=req.skill_type,
                element=req.element,
                keywords=req.keywords,
                resource_types=req.resource_types,
            )
        )

    def generate_texture_prompts_for_vfx(
        self, req: TexturePromptFromVfxRequest
    ) -> TexturePromptCollectionResult:
        return TexturePromptCollectionResult.model_validate(
            generate_texture_prompts_for_vfx_design(
                vfx_design=req.vfx_design,
                skill_type=req.skill_type,
                element=req.element,
                resource_types=req.resource_types,
            )
        )
