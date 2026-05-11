from pydantic import ValidationError

from app.clients.llm_client import LLMClient
from app.prompts.hero_prompts import build_hero_generation_prompt
from app.schemas.hero_schema import HeroDesign
from app.schemas.request_schema import HeroGenerateRequest


class HeroGenerationService:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def generate(self, req: HeroGenerateRequest) -> HeroDesign:
        prompt = build_hero_generation_prompt(req)
        raw_design = self.llm_client.generate_json(prompt, schema_name="hero_design")

        try:
            return HeroDesign.model_validate(raw_design)
        except ValidationError as exc:
            raise ValueError("LLM 返回的英雄方案格式不合法") from exc
