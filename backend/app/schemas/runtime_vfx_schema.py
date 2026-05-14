import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


SkillSlot = Literal["Q", "W", "E", "R"]
SkillType = Literal["projectile", "aoe", "aoe_dot", "dash", "buff", "summon"]
AssetUsage = Literal[
    "projectile",
    "impact",
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
BlendMode = Literal["alpha", "additive", "normal"]
RenderMode = Literal[
    "sprite",
    "ground_plane",
    "billboard_plane",
    "sprite_trail",
    "aura_ring",
]
SkillEffectTrigger = Literal[
    "on_cast",
    "on_projectile_hit",
    "on_zone_tick",
    "on_zone_expire",
    "on_summon_attack",
    "on_summon_expire",
    "on_summon_death",
    "on_status_tick",
    "on_status_expire",
]
SkillEffectAction = Literal[
    "damage",
    "aoe_damage",
    "apply_status",
    "spawn_zone",
    "summon",
    "spawn_projectile",
    "spawn_vfx_event",
]


class SpawnOffset(BaseModel):
    x: float = 0
    y: float = 0
    z: float = 0


class RuntimeVfxAssetEntry(BaseModel):
    path: str
    usage: AssetUsage
    blend_mode: BlendMode
    render_mode: RenderMode
    scale: float = Field(gt=0)
    duration: float = Field(ge=0)
    loop: bool = False
    color_tint: str | None = None
    opacity: float | None = Field(default=None, ge=0, le=1)
    rotation_speed: float | None = None
    spawn_offset: SpawnOffset | None = None
    follow_target: str | None = None
    trigger: SkillEffectTrigger | None = None
    action: SkillEffectAction | None = None
    effect_index: int | None = Field(default=None, ge=0)

    @field_validator("path")
    @classmethod
    def path_must_be_safe(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("path must not be blank")

        normalized = value.strip()
        lower = normalized.lower()
        if lower.startswith(("javascript:", "http://", "https://")):
            raise ValueError("path must be a local relative asset path")

        parts = re.split(r"[\\/]+", normalized)
        if ".." in parts:
            raise ValueError("path must not contain parent traversal")

        return normalized

    @field_validator("color_tint")
    @classmethod
    def color_tint_must_be_hex(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("color_tint must be a hex color like #ff5a1f")
        return value

    @field_validator("follow_target")
    @classmethod
    def follow_target_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("follow_target must not be blank")
        return value.strip()

    @model_validator(mode="after")
    def usage_and_render_mode_must_match(self) -> "RuntimeVfxAssetEntry":
        allowed_render_modes = {
            "projectile": {"sprite", "billboard_plane"},
            "impact": {"sprite", "billboard_plane"},
            "ground_decal": {"ground_plane"},
            "aura": {"aura_ring", "ground_plane"},
            "trail": {"sprite_trail", "sprite"},
            "summon_body": {"sprite", "billboard_plane"},
            "cast_flash": {"sprite", "billboard_plane"},
            "cast_circle": {"ground_plane", "aura_ring"},
            "zone_tick": {"ground_plane", "sprite", "billboard_plane"},
            "summon_spawn": {"sprite", "billboard_plane"},
            "summon_idle": {"sprite", "billboard_plane", "aura_ring"},
            "summon_expire": {"sprite", "billboard_plane"},
            "status_loop": {"sprite", "billboard_plane", "ground_plane"},
            "burn_loop": {"sprite", "billboard_plane", "ground_plane"},
            "poison_cloud": {"sprite", "billboard_plane", "ground_plane"},
            "mark_sigil": {"sprite", "billboard_plane", "ground_plane"},
            "mark_sigial": {"sprite", "billboard_plane", "ground_plane"},
            "stun_stars": {"sprite", "billboard_plane"},
        }
        if self.render_mode not in allowed_render_modes[self.usage]:
            raise ValueError(
                f"{self.usage} asset cannot use render_mode {self.render_mode}"
            )
        return self


class RuntimeVfxSkillSpec(BaseModel):
    skill_name: str
    skill_type: SkillType
    assets: dict[str, RuntimeVfxAssetEntry] = Field(min_length=1)

    @field_validator("skill_name")
    @classmethod
    def skill_name_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("skill_name must not be blank")
        return value.strip()

    @model_validator(mode="after")
    def skill_type_must_have_required_asset_usage(self) -> "RuntimeVfxSkillSpec":
        usages = {asset.usage for asset in self.assets.values()}
        if self.skill_type == "projectile" and not ({"projectile", "cast_flash"} & usages):
            raise ValueError("projectile skill requires a projectile asset")
        if self.skill_type == "aoe" and not ({"ground_decal", "impact", "cast_circle"} & usages):
            raise ValueError("aoe skill requires ground_decal or impact asset")
        if self.skill_type == "aoe_dot" and "ground_decal" not in usages:
            raise ValueError("aoe_dot skill requires a ground_decal asset")
        if self.skill_type == "dash" and not ({"trail", "impact"} & usages):
            raise ValueError("dash skill requires trail or impact asset")
        if self.skill_type == "buff" and "aura" not in usages:
            raise ValueError("buff skill requires an aura asset")
        if self.skill_type == "summon" and not ({"summon_body", "summon_spawn"} & usages):
            raise ValueError("summon skill requires a summon_body asset")
        return self


class RuntimeVfxAssetSpec(BaseModel):
    version: Literal["1.0"]
    hero_id: str
    map_profile: Literal["default_training_arena"]
    assets_base_path: str
    skills: dict[SkillSlot, RuntimeVfxSkillSpec]

    @field_validator("hero_id", "assets_base_path")
    @classmethod
    def text_fields_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("field must not be blank")
        return value.strip()

    @model_validator(mode="after")
    def skills_must_be_qwer(self) -> "RuntimeVfxAssetSpec":
        expected_slots = {"Q", "W", "E", "R"}
        slots = set(self.skills.keys())
        if slots != expected_slots:
            raise ValueError("skills must contain exactly Q/W/E/R")
        return self
