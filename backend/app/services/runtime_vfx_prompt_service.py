from dataclasses import dataclass

from app.prompts.runtime_vfx_prompts import (
    build_runtime_vfx_negative_prompt,
    build_runtime_vfx_prompt,
)
from app.schemas.playable_schema import HeroPlayableSpec, SkillSpec
from app.schemas.runtime_vfx_prompt_schema import (
    RuntimeVfxPromptItem,
    RuntimeVfxPromptRequest,
    RuntimeVfxPromptResponse,
)
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec


@dataclass(frozen=True)
class RuntimeVfxUsagePlan:
    usage: str
    render_mode: str


INFERRED_USAGE_BY_SKILL_TYPE: dict[str, list[RuntimeVfxUsagePlan]] = {
    "projectile": [
        RuntimeVfxUsagePlan("projectile", "sprite"),
        RuntimeVfxUsagePlan("trail", "sprite_trail"),
        RuntimeVfxUsagePlan("impact", "sprite"),
    ],
    "aoe": [
        RuntimeVfxUsagePlan("ground_decal", "ground_plane"),
        RuntimeVfxUsagePlan("impact", "sprite"),
    ],
    "aoe_dot": [
        RuntimeVfxUsagePlan("ground_decal", "ground_plane"),
    ],
    "dash": [
        RuntimeVfxUsagePlan("trail", "sprite_trail"),
        RuntimeVfxUsagePlan("impact", "sprite"),
    ],
    "buff": [
        RuntimeVfxUsagePlan("aura", "aura_ring"),
    ],
    "summon": [
        RuntimeVfxUsagePlan("summon_body", "sprite"),
        RuntimeVfxUsagePlan("aura", "aura_ring"),
        RuntimeVfxUsagePlan("impact", "sprite"),
    ],
}


class RuntimeVfxPromptService:
    def generate_prompts(
        self, request: RuntimeVfxPromptRequest | dict
    ) -> RuntimeVfxPromptResponse:
        parsed_request = (
            request
            if isinstance(request, RuntimeVfxPromptRequest)
            else RuntimeVfxPromptRequest.model_validate(request)
        )
        playable_spec = parsed_request.playable_spec
        runtime_vfx_asset_spec = parsed_request.runtime_vfx_asset_spec

        prompts: list[RuntimeVfxPromptItem] = []
        for skill in playable_spec.skills:
            usage_plans = self._usage_plans_for_skill(skill, runtime_vfx_asset_spec)
            for usage_plan in usage_plans:
                prompts.append(
                    RuntimeVfxPromptItem(
                        slot=skill.slot,
                        skill_name=skill.name,
                        skill_type=skill.type,
                        usage=usage_plan.usage,  # type: ignore[arg-type]
                        render_mode=usage_plan.render_mode,
                        prompt=build_runtime_vfx_prompt(
                            skill=skill,
                            usage=usage_plan.usage,
                            render_mode=usage_plan.render_mode,
                            transparent_background=parsed_request.transparent_background,
                        ),
                        negative_prompt=build_runtime_vfx_negative_prompt(),
                        transparent_background=parsed_request.transparent_background,
                    )
                )

        return RuntimeVfxPromptResponse(prompts=prompts)

    def _usage_plans_for_skill(
        self,
        skill: SkillSpec,
        runtime_vfx_asset_spec: RuntimeVfxAssetSpec | None,
    ) -> list[RuntimeVfxUsagePlan]:
        if runtime_vfx_asset_spec is None:
            return INFERRED_USAGE_BY_SKILL_TYPE[skill.type]

        skill_assets = runtime_vfx_asset_spec.skills[skill.slot].assets
        return [
            RuntimeVfxUsagePlan(asset.usage, asset.render_mode)
            for asset in skill_assets.values()
        ]


def generate_runtime_vfx_prompts(
    playable_spec: HeroPlayableSpec | dict,
    runtime_vfx_asset_spec: RuntimeVfxAssetSpec | dict | None = None,
    transparent_background: bool = True,
) -> RuntimeVfxPromptResponse:
    return RuntimeVfxPromptService().generate_prompts(
        RuntimeVfxPromptRequest(
            playable_spec=playable_spec,
            runtime_vfx_asset_spec=runtime_vfx_asset_spec,
            transparent_background=transparent_background,
        )
    )
