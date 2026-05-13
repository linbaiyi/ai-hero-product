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


class TexturePromptRequest(BaseModel):
    skill_name: str
    skill_type: str
    element: str = "arcane"
    keywords: list[str] = Field(default_factory=list)
    resource_types: list[str] | None = None

    @field_validator("skill_name", "skill_type", "element")
    @classmethod
    def texture_text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()


class TexturePromptFromVfxRequest(BaseModel):
    vfx_design: VfxDesign
    skill_type: str
    element: str | None = None
    resource_types: list[str] | None = None

    @field_validator("skill_type")
    @classmethod
    def skill_type_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("skill_type 不能为空")
        return value.strip()


class TexturePromptCollectionResult(BaseModel):
    skill_name: str
    element: str
    prompts: dict[str, str]
    negative_prompt: str | None = None

    @field_validator("skill_name", "element")
    @classmethod
    def collection_text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()

    @field_validator("prompts")
    @classmethod
    def prompts_must_not_be_empty(cls, value: dict[str, str]) -> dict[str, str]:
        if not value:
            raise ValueError("prompts 不能为空")
        for key, prompt in value.items():
            if not key.strip() or not prompt.strip():
                raise ValueError("prompt key/value 不能为空")
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
