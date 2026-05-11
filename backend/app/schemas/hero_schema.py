from pydantic import BaseModel, Field, field_validator


class SkillDesign(BaseModel):
    slot: str
    name: str
    type: str
    description: str
    mechanics: str
    cooldown: str
    cost: str
    damage_type: str
    balance_notes: str


class HeroDesign(BaseModel):
    hero_name: str
    hero_title: str
    role: str
    difficulty: int = Field(ge=1, le=5)
    core_tags: list[str]
    background: str
    combat_style: str
    skills: list[SkillDesign]
    combo_logic: str
    counterplay: str
    balance_summary: str

    @field_validator("core_tags")
    @classmethod
    def core_tags_must_not_be_empty(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("core_tags 不能为空")
        return value

    @field_validator("skills")
    @classmethod
    def skills_must_not_be_empty(cls, value: list[SkillDesign]) -> list[SkillDesign]:
        if not value:
            raise ValueError("skills 不能为空")
        return value
