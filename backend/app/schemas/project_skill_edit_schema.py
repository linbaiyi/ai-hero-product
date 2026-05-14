from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.project_schema import ProjectRecord
from app.schemas.runtime_vfx_schema import AssetUsage


EditableSkillSlot = Literal["Q", "W", "E", "R", "passive"]


class ProjectSkillEditRequest(BaseModel):
    edit_instruction: str = Field(min_length=1)
    replacement_skill_design: dict[str, Any] | None = None
    replacement_vfx_design: dict[str, Any] | None = None
    replacement_playable_skill_spec: dict[str, Any] | None = None

    @field_validator("edit_instruction")
    @classmethod
    def edit_instruction_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("edit_instruction must not be blank")
        return value.strip()


class ProjectSkillEditResponse(BaseModel):
    project: ProjectRecord
    changed_slot: EditableSkillSlot
    preserved_slots: list[str]


class RuntimeVfxAssetEditPlan(BaseModel):
    keep_usages: list[AssetUsage] = Field(default_factory=list)
    regenerate_usages: list[AssetUsage] = Field(default_factory=list)
    add_usages: list[AssetUsage] = Field(default_factory=list)
    remove_usages: list[AssetUsage] = Field(default_factory=list)
    reason: str = Field(min_length=1)

    @field_validator(
        "keep_usages",
        "regenerate_usages",
        "add_usages",
        "remove_usages",
        mode="after",
    )
    @classmethod
    def usages_must_be_unique(cls, value: list[AssetUsage]) -> list[AssetUsage]:
        seen: set[AssetUsage] = set()
        unique: list[AssetUsage] = []
        for usage in value:
            if usage not in seen:
                seen.add(usage)
                unique.append(usage)
        return unique

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("reason must not be blank")
        return value.strip()

    @model_validator(mode="after")
    def usage_actions_must_not_conflict(self) -> "RuntimeVfxAssetEditPlan":
        keep = set(self.keep_usages)
        regenerate = set(self.regenerate_usages)
        add = set(self.add_usages)
        remove = set(self.remove_usages)
        if keep & regenerate:
            raise ValueError("usage cannot be both kept and regenerated")
        if keep & remove:
            raise ValueError("usage cannot be both kept and removed")
        if regenerate & remove:
            raise ValueError("usage cannot be both regenerated and removed")
        if add & remove:
            raise ValueError("usage cannot be both added and removed")
        return self
