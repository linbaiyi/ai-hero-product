from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.hero_schema import HeroDesign
from app.schemas.playable_schema import HeroPlayableSpec
from app.schemas.request_schema import HeroGenerateRequest
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.schemas.vfx_schema import VfxDesign


RuntimeVfxGeneratedUsage = Literal[
    "projectile",
    "impact",
    "hit_flash",
    "ground_decal",
    "aura",
    "trail",
    "summon_body",
    "cast_flash",
    "cast_circle",
    "zone_tick",
    "summon_spawn",
    "summon_idle",
    "summon_expire",
    "status_loop",
    "burn_loop",
    "poison_cloud",
    "mark_sigil",
    "mark_sigial",
    "stun_stars",
]


class RuntimeVfxGenerationRequest(BaseModel):
    playable_spec: HeroPlayableSpec
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec | None = None
    hero_design: HeroDesign | None = None
    vfx_designs: list[VfxDesign] = Field(default_factory=list)
    source_request: HeroGenerateRequest | None = None
    element_theme: str | None = None
    max_textures: int = Field(default=20, ge=1, le=20)
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

    @field_validator("hero_design", mode="before")
    @classmethod
    def hero_design_must_be_valid(cls, value: Any) -> HeroDesign | None:
        if value is None:
            return None
        return HeroDesign.model_validate(value)

    @field_validator("vfx_designs", mode="before")
    @classmethod
    def vfx_designs_must_be_valid(cls, value: Any) -> list[VfxDesign]:
        if value is None:
            return []
        return [VfxDesign.model_validate(item) for item in value]

    @field_validator("source_request", mode="before")
    @classmethod
    def source_request_must_be_valid(cls, value: Any) -> HeroGenerateRequest | None:
        if value is None:
            return None
        return HeroGenerateRequest.model_validate(value)


class RuntimeVfxGeneratedAsset(BaseModel):
    slot: Literal["Q", "W", "E", "R"]
    skill_name: str
    skill_type: str
    usage: RuntimeVfxGeneratedUsage
    render_mode: str
    trigger: str | None = None
    action: str | None = None
    effect_index: int | None = None
    path: str
    prompt: str
    width: int | None = None
    height: int | None = None


class RuntimeVfxGenerationResponse(BaseModel):
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec
    generated_assets: list[RuntimeVfxGeneratedAsset]
    warnings: list[str] = Field(default_factory=list)
