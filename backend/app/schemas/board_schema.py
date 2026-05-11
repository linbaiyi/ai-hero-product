from pydantic import BaseModel, Field, field_validator

from app.schemas.hero_schema import HeroDesign
from app.schemas.image_generation_schema import ImageGenerationResult
from app.schemas.vfx_schema import VfxDesign


class BoardRenderRequest(BaseModel):
    project_id: str
    hero_design: HeroDesign
    vfx_designs: list[VfxDesign]
    image_results: list[ImageGenerationResult]
    board_title: str | None = None
    width: int = Field(default=1600, ge=1000, le=3000)
    height: int = Field(default=2400, ge=1200, le=4000)

    @field_validator("project_id")
    @classmethod
    def project_id_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("project_id 不能为空")
        return value.strip()

    @field_validator("vfx_designs")
    @classmethod
    def vfx_designs_must_not_be_empty(cls, value: list[VfxDesign]) -> list[VfxDesign]:
        if not value:
            raise ValueError("vfx_designs 不能为空")
        return value


class BoardRenderResult(BaseModel):
    project_id: str
    board_path: str
    file_name: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    success: bool = True
    error_message: str | None = None

    @field_validator("project_id", "board_path", "file_name")
    @classmethod
    def text_fields_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()
