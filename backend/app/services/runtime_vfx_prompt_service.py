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
    trigger: str | None = None
    action: str | None = None
    effect_index: int | None = None


INFERRED_USAGE_BY_SKILL_TYPE: dict[str, list[RuntimeVfxUsagePlan]] = {
    "projectile": [
        RuntimeVfxUsagePlan("projectile", "sprite"),
        RuntimeVfxUsagePlan("trail", "sprite_trail"),
        RuntimeVfxUsagePlan("impact", "sprite"),
        RuntimeVfxUsagePlan("hit_flash", "sprite"),
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
        RuntimeVfxUsagePlan("summon_spawn", "sprite"),
        RuntimeVfxUsagePlan("summon_idle", "aura_ring"),
    ],
}

STATUS_USAGE_BY_TYPE = {
    "burn": ("burn_loop", "sprite"),
    "poison": ("poison_cloud", "sprite"),
    "slow": ("status_loop", "sprite"),
    "mark": ("mark_sigil", "ground_plane"),
    "stun": ("stun_stars", "sprite"),
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
                        trigger=usage_plan.trigger,
                        action=usage_plan.action,
                        effect_index=usage_plan.effect_index,
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
            effect_plans = _usage_plans_from_skill_effects(skill)
            if effect_plans:
                return effect_plans
            return INFERRED_USAGE_BY_SKILL_TYPE[skill.type]

        skill_assets = runtime_vfx_asset_spec.skills[skill.slot].assets
        return [
            RuntimeVfxUsagePlan(
                usage=asset.usage,
                render_mode=asset.render_mode,
                trigger=asset.trigger,
                action=asset.action,
                effect_index=asset.effect_index,
            )
            for asset in skill_assets.values()
        ]


def _usage_plans_from_skill_effects(skill: SkillSpec) -> list[RuntimeVfxUsagePlan]:
    plans: list[RuntimeVfxUsagePlan] = []
    for index, effect in enumerate(skill.effects):
        trigger = effect.trigger
        action = effect.action
        if trigger == "on_cast":
            plans.append(RuntimeVfxUsagePlan("cast_flash", "sprite", trigger, action, index))
            if action in {"spawn_zone", "aoe_damage", "apply_status"}:
                plans.append(RuntimeVfxUsagePlan("cast_circle", "ground_plane", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("ground_decal", "ground_plane", trigger, action, index))
            if action == "spawn_projectile":
                plans.append(RuntimeVfxUsagePlan("projectile", "sprite", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("trail", "sprite_trail", trigger, action, index))
            if action == "summon":
                plans.append(RuntimeVfxUsagePlan("summon_body", "sprite", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("summon_spawn", "sprite", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("summon_idle", "aura_ring", trigger, action, index))

        if trigger == "on_projectile_hit":
            if action in {"damage", "aoe_damage", "apply_status", "spawn_zone"}:
                plans.append(RuntimeVfxUsagePlan("impact", "sprite", trigger, action, index))
            if action == "spawn_vfx_event":
                plans.append(RuntimeVfxUsagePlan("hit_flash", "sprite", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("impact", "sprite", trigger, action, index))
            if action == "spawn_zone":
                plans.append(RuntimeVfxUsagePlan("ground_decal", "ground_plane", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("zone_tick", "ground_plane", "on_zone_tick", action, index))

        if trigger in {"on_zone_tick", "on_status_tick"}:
            plans.append(RuntimeVfxUsagePlan("zone_tick", "ground_plane", trigger, action, index))

        if trigger in {"on_summon_expire", "on_summon_death"}:
            plans.append(RuntimeVfxUsagePlan("summon_expire", "sprite", trigger, action, index))
            if action in {"damage", "aoe_damage", "apply_status", "spawn_zone"}:
                plans.append(RuntimeVfxUsagePlan("impact", "sprite", trigger, action, index))
            if action == "spawn_vfx_event":
                plans.append(RuntimeVfxUsagePlan("hit_flash", "sprite", trigger, action, index))
                plans.append(RuntimeVfxUsagePlan("impact", "sprite", trigger, action, index))
            if action == "spawn_zone":
                plans.append(RuntimeVfxUsagePlan("ground_decal", "ground_plane", trigger, action, index))

        if action == "spawn_vfx_event" and trigger not in {"on_projectile_hit", "on_summon_expire", "on_summon_death"}:
            plans.append(RuntimeVfxUsagePlan("hit_flash", "sprite", trigger, action, index))
            plans.append(RuntimeVfxUsagePlan("impact", "sprite", trigger, action, index))
        if action == "spawn_zone":
            plans.append(RuntimeVfxUsagePlan("ground_decal", "ground_plane", trigger, action, index))
        if action == "apply_status" or effect.status_effects:
            plans.extend(_status_usage_plans(effect.status_effects, trigger, action, index))

    return _dedupe_usage_plans(plans)


def _status_usage_plans(
    status_effects: list,
    trigger: str,
    action: str,
    effect_index: int,
) -> list[RuntimeVfxUsagePlan]:
    plans: list[RuntimeVfxUsagePlan] = []
    for status in status_effects:
        usage, render_mode = STATUS_USAGE_BY_TYPE.get(
            status.type, ("status_loop", "sprite")
        )
        plans.append(
            RuntimeVfxUsagePlan(usage, render_mode, trigger, action, effect_index)
        )
    return plans


def _dedupe_usage_plans(plans: list[RuntimeVfxUsagePlan]) -> list[RuntimeVfxUsagePlan]:
    seen: set[tuple[str, str | None, str | None, int | None]] = set()
    result: list[RuntimeVfxUsagePlan] = []
    for plan in plans:
        key = (plan.usage, plan.trigger, plan.action, plan.effect_index)
        if key in seen:
            continue
        seen.add(key)
        result.append(plan)
    return result


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
