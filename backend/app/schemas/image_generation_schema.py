from pydantic import BaseModel, Field, field_validator

from app.schemas.image_prompt_schema import ImagePromptResult


class ImageGenerationRequest(BaseModel):
    image_prompt: ImagePromptResult
    project_id: str | None = None
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)


class ImageGenerationBatchRequest(BaseModel):
    image_prompts: list[ImagePromptResult]
    project_id: str | None = None
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)

    @field_validator("image_prompts")
    @classmethod
    def image_prompts_must_not_be_empty(
        cls, value: list[ImagePromptResult]
    ) -> list[ImagePromptResult]:
        if not value:
            raise ValueError("image_prompts 不能为空")
        return value


class ImageGenerationResult(BaseModel):
    skill_name: str
    image_path: str
    file_name: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    success: bool = True
    error_message: str | None = None

    @field_validator("skill_name", "image_path", "file_name")
    @classmethod
    def text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()
