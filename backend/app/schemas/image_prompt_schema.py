from pydantic import BaseModel, Field, field_validator

from app.schemas.vfx_schema import VfxDesign


class ImagePromptRequest(BaseModel):
    vfx_design: VfxDesign
    style_hint: str | None = None


class ImagePromptBatchRequest(BaseModel):
    vfx_designs: list[VfxDesign]
    style_hint: str | None = None

    @field_validator("vfx_designs")
    @classmethod
    def vfx_designs_must_not_be_empty(
        cls, value: list[VfxDesign]
    ) -> list[VfxDesign]:
        if not value:
            raise ValueError("vfx_designs 不能为空")
        return value


class ImagePromptResult(BaseModel):
    skill_name: str
    prompt: str = Field(min_length=31)
    negative_prompt: str | None = None

    @field_validator("skill_name", "prompt")
    @classmethod
    def text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()
