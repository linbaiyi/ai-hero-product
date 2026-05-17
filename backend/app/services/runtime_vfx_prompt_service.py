from dataclasses import dataclass
import re

from app.prompts.runtime_vfx_prompts import (
    build_runtime_vfx_negative_prompt,
    build_runtime_vfx_prompt,
)
from app.prompts.image_prompts import infer_element_from_vfx_design
from app.schemas.playable_schema import HeroPlayableSpec, SkillSpec
from app.schemas.runtime_vfx_prompt_schema import (
    RuntimeVfxPromptItem,
    RuntimeVfxPromptRequest,
    RuntimeVfxPromptResponse,
)
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.schemas.vfx_schema import VfxDesign


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
        vfx_designs_by_slot = _vfx_designs_by_slot(
            playable_spec,
            parsed_request.hero_design,
            parsed_request.vfx_designs,
        )

        prompts: list[RuntimeVfxPromptItem] = []
        for skill in playable_spec.skills:
            vfx_design = vfx_designs_by_slot.get(skill.slot)
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
                            element=_element_for_skill(skill, vfx_design),
                            primary_color=_primary_color_for_skill(skill, vfx_design),
                            color_palette=(
                                vfx_design.color_palette if vfx_design else None
                            ),
                            visual_keywords=_visual_keywords_for_vfx_design(vfx_design),
                        ),
                        negative_prompt=build_runtime_vfx_negative_prompt(),
                        color_tint=_primary_color_for_skill(skill, vfx_design),
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
            contract_plans = _usage_plans_from_ability_contract(skill)
            effect_plans = _usage_plans_from_skill_effects(skill)
            if contract_plans or effect_plans:
                return _dedupe_usage_plans(
                    [
                        *INFERRED_USAGE_BY_SKILL_TYPE[skill.type],
                        *contract_plans,
                        *effect_plans,
                    ]
                )
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


RENDER_MODE_BY_ART_USAGE = {
    "projectile": "sprite",
    "trail": "sprite_trail",
    "impact": "sprite",
    "hit_flash": "sprite",
    "cast_flash": "sprite",
    "cast_circle": "ground_plane",
    "ground_decal": "ground_plane",
    "zone_tick": "ground_plane",
    "status_loop": "sprite",
    "burn_loop": "sprite",
    "poison_cloud": "sprite",
    "mark_sigil": "ground_plane",
    "stun_stars": "sprite",
    "summon_body": "sprite",
    "summon_spawn": "sprite",
    "summon_idle": "aura_ring",
    "summon_expire": "sprite",
    "aura": "aura_ring",
}

SUPPORTED_RUNTIME_VFX_USAGES = set(RENDER_MODE_BY_ART_USAGE)


def _usage_plans_from_ability_contract(skill: SkillSpec) -> list[RuntimeVfxUsagePlan]:
    contract = skill.ability_contract
    if contract is None:
        return []

    plans: list[RuntimeVfxUsagePlan] = []
    for binding in contract.art_bindings:
        usage = _normalize_art_binding_usage(binding.hook, binding.usage)
        render_mode = RENDER_MODE_BY_ART_USAGE.get(usage)
        if render_mode is None:
            render_mode = "ground_plane" if binding.hook == "area" else "sprite"
        plans.append(
            RuntimeVfxUsagePlan(
                usage,
                render_mode,
                binding.event,
                _action_for_art_binding(binding.hook, usage),
                None,
            )
        )
    return _dedupe_usage_plans(plans)


def _normalize_art_binding_usage(hook: str, usage: str) -> str:
    normalized = (usage or "").strip().lower()
    if normalized in SUPPORTED_RUNTIME_VFX_USAGES:
        return normalized

    hook_name = (hook or "").strip().lower()
    usage_text = normalized.replace("-", "_").replace(" ", "_")

    if any(term in usage_text for term in ("projectile", "missile", "bolt", "fireball")):
        return "projectile"
    if "trail" in usage_text:
        return "trail"
    if any(term in usage_text for term in ("ground", "decal", "circle", "zone", "area", "field", "rune")):
        return "zone_tick" if "tick" in usage_text or "loop" in usage_text else "ground_decal"
    if any(term in usage_text for term in ("summon_body", "creature", "unit", "minion", "familiar")):
        return "summon_body"
    if any(term in usage_text for term in ("summon_spawn", "spawn")):
        return "summon_spawn"
    if any(term in usage_text for term in ("summon_idle", "idle")):
        return "summon_idle"
    if any(term in usage_text for term in ("summon_expire", "death", "expire")):
        return "summon_expire"
    if any(term in usage_text for term in ("aura", "halo", "buff")):
        return "aura"
    if any(term in usage_text for term in ("poison", "toxin", "venom")):
        return "poison_cloud"
    if any(term in usage_text for term in ("mark", "sigil")):
        return "mark_sigil"
    if any(term in usage_text for term in ("stun", "daze", "star")):
        return "stun_stars"
    if any(term in usage_text for term in ("burn", "fire", "flame", "magma", "lava", "ember", "scorch")):
        if hook_name in {"loop", "buff"} or "loop" in usage_text:
            return "burn_loop"
        if hook_name == "area":
            return "ground_decal"
        return "impact"
    if any(term in usage_text for term in ("impact", "eruption", "explosion", "explode", "burst", "hit")):
        return "impact" if hook_name != "cast" else "cast_flash"
    if "cast" in usage_text or hook_name == "cast":
        return "cast_flash"

    hook_defaults = {
        "cast": "cast_flash",
        "missile": "projectile",
        "impact": "impact",
        "area": "ground_decal",
        "buff": "aura",
        "summon": "summon_body",
        "death": "summon_expire",
        "loop": "zone_tick",
    }
    return hook_defaults.get(hook_name, "impact")


def _action_for_art_binding(hook: str, usage: str) -> str | None:
    if usage in {"projectile", "trail"}:
        return "spawn_projectile"
    if usage in {"ground_decal", "zone_tick", "cast_circle"}:
        return "spawn_zone"
    if usage in {"summon_body", "summon_spawn", "summon_idle", "summon_expire"}:
        return "summon"
    if usage in {"hit_flash", "impact", "cast_flash"} or hook == "impact":
        return "spawn_vfx_event"
    return None


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


def _vfx_designs_by_slot(
    playable_spec: HeroPlayableSpec,
    hero_design,
    vfx_designs: list[VfxDesign],
) -> dict[str, VfxDesign]:
    if not vfx_designs:
        return {}

    by_slot: dict[str, VfxDesign] = {}
    by_name = {_normalize_name(design.skill_name): design for design in vfx_designs}

    for skill in playable_spec.skills:
        matched = by_name.get(_normalize_name(skill.name))
        if matched is not None:
            by_slot[skill.slot] = matched

    if hero_design is not None:
        for index, skill_design in enumerate(hero_design.skills):
            if index >= len(vfx_designs):
                continue
            slot = skill_design.slot.strip().upper()
            if slot not in {"Q", "W", "E", "R"}:
                continue
            by_slot.setdefault(slot, vfx_designs[index])
            by_name.setdefault(_normalize_name(skill_design.name), vfx_designs[index])

    for index, skill in enumerate(playable_spec.skills):
        if skill.slot in by_slot or index >= len(vfx_designs):
            continue
        by_slot[skill.slot] = by_name.get(_normalize_name(skill.name), vfx_designs[index])

    return by_slot


def _normalize_name(value: str) -> str:
    return re.sub(r"\s+", "", value or "").casefold()


def _primary_color_for_skill(skill: SkillSpec, vfx_design: VfxDesign | None) -> str:
    if vfx_design is not None:
        for key in ("main", "primary", "core", "dominant", "secondary"):
            value = vfx_design.color_palette.get(key)
            if value:
                return value
        for value in vfx_design.color_palette.values():
            if value:
                return value
    return skill.vfx.color


def _element_for_skill(skill: SkillSpec, vfx_design: VfxDesign | None) -> str:
    if vfx_design is not None:
        return infer_element_from_vfx_design(vfx_design)
    return skill.vfx.theme


def _visual_keywords_for_vfx_design(vfx_design: VfxDesign | None) -> list[str] | None:
    if vfx_design is None:
        return None
    return [vfx_design.vfx_category, *vfx_design.visual_keywords]


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
