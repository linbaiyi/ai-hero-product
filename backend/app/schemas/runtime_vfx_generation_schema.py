from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.playable_schema import HeroPlayableSpec
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec


RuntimeVfxGeneratedUsage = Literal[
    "projectile",
    "impact",
    "ground_decal",
    "aura",
    "trail",
    "summon_body",
]


class RuntimeVfxGenerationRequest(BaseModel):
    playable_spec: HeroPlayableSpec
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec | None = None
    max_textures: int = Field(default=8, ge=1, le=20)
    image_size: Literal["256x256", "512x512", "768x768", "1024x1024"] = "512x512"
    transparent_background: bool = True
    project_id: str | None = None

    @field_validator("playable_spec", mode="before")
    @classmethod
    def playable_spec_must_be_valid(cls, value: Any) -> HeroPlayableSpec:
        return HeroPlayableSpec.model_validate(value)

    @field_validator("runtime_vfx_asset_spec", mode="before")
    @classmethod
    def runtime_vfx_asset_spec_must_be_valid(
        cls, value: Any
    ) -> RuntimeVfxAssetSpec | None:
        if value is None:
            return None
        return RuntimeVfxAssetSpec.model_validate(value)


class RuntimeVfxGeneratedAsset(BaseModel):
    slot: Literal["Q", "W", "E", "R"]
    skill_name: str
    skill_type: str
    usage: RuntimeVfxGeneratedUsage
    render_mode: str
    path: str
    prompt: str
    width: int | None = None
    height: int | None = None


class RuntimeVfxGenerationResponse(BaseModel):
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec
    generated_assets: list[RuntimeVfxGeneratedAsset]
    warnings: list[str] = Field(default_factory=list)
