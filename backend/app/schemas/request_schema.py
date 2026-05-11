from pydantic import BaseModel, Field, field_validator


class HeroGenerateRequest(BaseModel):
    game_type: str
    hero_role: str
    element_theme: str
    art_style: str
    core_gameplay: str
    skill_count: int = Field(ge=3, le=6)
    generate_images: bool = True
    generate_board: bool = True

    @field_validator(
        "game_type",
        "hero_role",
        "element_theme",
        "art_style",
        "core_gameplay",
    )
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("字段不能为空")
        return value.strip()
