import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


SkillSlot = Literal["Q", "W", "E", "R"]
SkillType = Literal["projectile", "aoe", "aoe_dot", "dash", "buff", "summon"]
StatusEffectType = Literal["burn", "poison", "slow", "mark", "stun"]
VfxTheme = Literal[
    "fire",
    "ice",
    "thunder",
    "poison",
    "dark",
    "holy",
    "arcane",
    "wind",
    "earth",
]
VfxShape = Literal[
    "fireball",
    "beam",
    "circle_zone",
    "meteor",
    "slash",
    "trail",
    "shield",
    "burst",
    "wave",
    "rune",
]


class VfxSpec(BaseModel):
    theme: VfxTheme
    color: str
    shape: VfxShape
    impact: str
    trail: str

    @field_validator("color")
    @classmethod
    def color_must_be_hex(cls, value: str) -> str:
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("color must be a hex color like #ff5a1f")
        return value

    @field_validator("impact", "trail")
    @classmethod
    def text_fields_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("field must not be blank")
        return value.strip()


class SkillStatusEffectSpec(BaseModel):
    type: StatusEffectType
    duration: float = Field(gt=0)
    tick_interval: float | None = Field(default=None, gt=0)
    damage: float | None = Field(default=None, ge=0)
    value: float | None = Field(default=None, ge=0)


class SkillSpec(BaseModel):
    slot: SkillSlot
    name: str
    type: SkillType
    cooldown: float = Field(ge=0)
    resource_cost: float = Field(default=0, ge=0)
    damage: float | None = Field(default=None, ge=0)
    range: float | None = Field(default=None, ge=0)
    radius: float | None = Field(default=None, ge=0)
    speed: float | None = Field(default=None, ge=0)
    duration: float | None = Field(default=None, ge=0)
    tick_interval: float | None = Field(default=None, gt=0)
    distance: float | None = Field(default=None, ge=0)
    status_effects: list[SkillStatusEffectSpec] = Field(default_factory=list)
    description: str
    vfx: VfxSpec

    @field_validator("name", "description")
    @classmethod
    def text_fields_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("field must not be blank")
        return value.strip()

    @model_validator(mode="after")
    def required_fields_for_skill_type(self) -> "SkillSpec":
        required_by_type = {
            "projectile": ["damage", "range", "radius", "speed"],
            "aoe": ["damage", "radius"],
            "aoe_dot": ["damage", "radius", "duration", "tick_interval"],
            "dash": ["distance"],
            "buff": ["duration"],
            "summon": ["duration"],
        }
        missing = [
            field_name
            for field_name in required_by_type[self.type]
            if getattr(self, field_name) is None
        ]
        if missing:
            raise ValueError(f"{self.type} skill missing required fields: {', '.join(missing)}")
        return self


class HeroSpec(BaseModel):
    id: str
    name: str
    title: str
    role: str
    max_hp: int = Field(gt=0)
    move_speed: float = Field(gt=0)
    attack_damage: float = Field(ge=0)
    attack_range: float = Field(ge=0)
    resource_type: Literal["mana", "energy", "rage", "none"]
    max_resource: float = Field(ge=0)

    @field_validator("id", "name", "title", "role")
    @classmethod
    def text_fields_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("field must not be blank")
        return value.strip()


class RuntimeSpec(BaseModel):
    control_scheme: Literal["wasd_mouse"]
    camera: Literal["third_person_follow"]
    map_profile: Literal["default_training_arena"]


class HeroPlayableSpec(BaseModel):
    version: Literal["1.0"]
    hero: HeroSpec
    gameplay_tags: list[str] = Field(default_factory=list)
    skills: list[SkillSpec]
    runtime: RuntimeSpec

    @field_validator("gameplay_tags")
    @classmethod
    def gameplay_tags_must_not_contain_blank_values(cls, value: list[str]) -> list[str]:
        for tag in value:
            if not tag or not tag.strip():
                raise ValueError("gameplay_tags must not contain blank values")
        return [tag.strip() for tag in value]

    @model_validator(mode="after")
    def skills_must_be_qwer(self) -> "HeroPlayableSpec":
        if len(self.skills) != 4:
            raise ValueError("skills must contain exactly Q/W/E/R")

        slots = [skill.slot for skill in self.skills]
        if len(set(slots)) != len(slots):
            raise ValueError("skills must not contain duplicate slots")

        expected_slots = {"Q", "W", "E", "R"}
        if set(slots) != expected_slots:
            raise ValueError("skills must contain Q/W/E/R")

        return self
