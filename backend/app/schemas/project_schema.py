from pydantic import BaseModel, Field, field_validator

from app.schemas.board_schema import BoardRenderResult
from app.schemas.hero_schema import HeroDesign
from app.schemas.image_generation_schema import ImageGenerationResult
from app.schemas.image_prompt_schema import ImagePromptResult
from app.schemas.playable_schema import HeroPlayableSpec
from app.schemas.request_schema import HeroGenerateRequest
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.schemas.vfx_schema import VfxDesign


class SkillArtifact(BaseModel):
    locked: bool = True
    skill_design: dict | None = None
    vfx_design: dict | None = None
    image_prompt: dict | None = None
    image_result: dict | None = None
    playable_skill_spec: dict | None = None
    runtime_vfx_skill_spec: dict | None = None


class ProjectSaveRequest(BaseModel):
    project_id: str
    request: HeroGenerateRequest
    hero_design: HeroDesign
    vfx_designs: list[VfxDesign] = Field(default_factory=list)
    image_prompts: list[ImagePromptResult] = Field(default_factory=list)
    image_results: list[ImageGenerationResult] = Field(default_factory=list)
    board_result: BoardRenderResult | None = None
    playable_spec: HeroPlayableSpec | None = None
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec | None = None
    locked_skills: dict[str, bool] = Field(default_factory=dict)
    skill_artifacts: dict[str, SkillArtifact] = Field(default_factory=dict)
    llm_provider: str | None = None
    image_provider: str | None = None

    @field_validator("project_id")
    @classmethod
    def project_id_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("project_id 不能为空")
        return value.strip()


class ProjectRecord(ProjectSaveRequest):
    created_at: str
    updated_at: str

    @field_validator("created_at", "updated_at")
    @classmethod
    def timestamps_must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("时间字段不能为空")
        return value.strip()


class ProjectSummary(BaseModel):
    project_id: str
    hero_name: str
    hero_title: str | None = None
    role: str | None = None
    element_theme: str | None = None
    art_style: str | None = None
    board_path: str | None = None
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    projects: list[ProjectSummary]
    total: int
