from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.playable_schema import HeroPlayableSpec
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec


RuntimeVfxPromptUsage = Literal[
    "projectile",
    "impact",
    "ground_decal",
    "aura",
    "trail",
    "summon_body",
]


class RuntimeVfxPromptRequest(BaseModel):
    playable_spec: HeroPlayableSpec
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec | None = None
    style: str = "runtime_texture"
    transparent_background: bool = True

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


class RuntimeVfxPromptItem(BaseModel):
    slot: Literal["Q", "W", "E", "R"]
    skill_name: str
    skill_type: str
    usage: RuntimeVfxPromptUsage
    render_mode: str
    prompt: str
    negative_prompt: str | None = None
    recommended_size: str = "512x512"
    transparent_background: bool = True


class RuntimeVfxPromptResponse(BaseModel):
    prompts: list[RuntimeVfxPromptItem] = Field(default_factory=list)
