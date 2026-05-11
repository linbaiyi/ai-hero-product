from pydantic import BaseModel, Field, field_validator

from app.schemas.hero_schema import SkillDesign


class VfxStage(BaseModel):
    stage: str
    description: str

    @field_validator("stage", "description")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()


class VfxDesign(BaseModel):
    skill_name: str
    vfx_category: str
    visual_keywords: list[str]
    stages: list[VfxStage] = Field(min_length=4)
    color_palette: dict[str, str]
    camera_suggestion: str
    sound_suggestion: str
    image_prompt: str | None = None

    @field_validator("skill_name", "vfx_category", "camera_suggestion", "sound_suggestion")
    @classmethod
    def text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()

    @field_validator("visual_keywords")
    @classmethod
    def visual_keywords_must_not_be_empty(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("visual_keywords 不能为空")
        return value

    @field_validator("color_palette")
    @classmethod
    def color_palette_must_not_be_empty(cls, value: dict[str, str]) -> dict[str, str]:
        if not value:
            raise ValueError("color_palette 不能为空")
        return value


class VfxBreakdownRequest(BaseModel):
    hero_name: str
    element_theme: str
    art_style: str
    skill: SkillDesign

    @field_validator("hero_name", "element_theme", "art_style")
    @classmethod
    def request_text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()


class VfxBreakdownBatchRequest(BaseModel):
    hero_name: str
    element_theme: str
    art_style: str
    skills: list[SkillDesign]

    @field_validator("hero_name", "element_theme", "art_style")
    @classmethod
    def batch_text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()

    @field_validator("skills")
    @classmethod
    def skills_must_not_be_empty(cls, value: list[SkillDesign]) -> list[SkillDesign]:
        if not value:
            raise ValueError("skills 不能为空")
        return value
