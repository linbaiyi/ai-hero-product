from pydantic import ValidationError

from app.clients.llm_client import LLMClient
from app.prompts.vfx_prompts import build_vfx_breakdown_prompt
from app.schemas.vfx_schema import (
    VfxBreakdownBatchRequest,
    VfxBreakdownRequest,
    VfxDesign,
)


class VfxBreakdownService:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def generate_for_skill(self, req: VfxBreakdownRequest) -> VfxDesign:
        prompt = build_vfx_breakdown_prompt(
            hero_name=req.hero_name,
            element_theme=req.element_theme,
            art_style=req.art_style,
            skill=req.skill,
        )
        raw_design = self.llm_client.generate_json(prompt, schema_name="vfx_design")

        try:
            return VfxDesign.model_validate(raw_design)
        except ValidationError as exc:
            raise ValueError("LLM 返回的特效拆解格式不合法") from exc

    def generate_for_skills(self, req: VfxBreakdownBatchRequest) -> list[VfxDesign]:
        return [
            self.generate_for_skill(
                VfxBreakdownRequest(
                    hero_name=req.hero_name,
                    element_theme=req.element_theme,
                    art_style=req.art_style,
                    skill=skill,
                )
            )
            for skill in req.skills
        ]
