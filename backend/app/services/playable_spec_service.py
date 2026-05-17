import json
from typing import Any

from pydantic import ValidationError

from app.clients.llm_client import LLMClient
from app.prompts.playable_prompts import build_playable_spec_prompt
from app.schemas.playable_schema import HeroPlayableSpec


class PlayableSpecService:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def generate(
        self,
        hero_design: Any,
        style: str = "3d_training_demo",
        complexity: str = "mvp",
    ) -> HeroPlayableSpec:
        prompt = build_playable_spec_prompt(
            hero_design=hero_design,
            style=style,
            complexity=complexity,
        )
        try:
            raw_spec = self.llm_client.generate_json(prompt, schema_name="playable_spec")
        except Exception:
            return HeroPlayableSpec.model_validate(build_safe_default_spec(hero_design))

        try:
            raw_spec = apply_design_mechanic_mapping(raw_spec, hero_design)
            return HeroPlayableSpec.model_validate(raw_spec)
        except ValidationError:
            return HeroPlayableSpec.model_validate(build_safe_default_spec(hero_design))

    def validate(self, playable_spec: Any) -> tuple[bool, list[str]]:
        return validate_playable_spec(playable_spec)


def validate_playable_spec(playable_spec: Any) -> tuple[bool, list[str]]:
    try:
        HeroPlayableSpec.model_validate(playable_spec)
    except ValidationError as exc:
        return False, [format_validation_error(error) for error in exc.errors()]

    return True, []


def format_validation_error(error: dict[str, Any]) -> str:
    location = ".".join(str(part) for part in error.get("loc", ()))
    message = str(error.get("msg", "invalid value"))
    return f"{location}: {message}" if location else message


def build_safe_default_spec(hero_design: Any | None = None) -> dict[str, Any]:
    hero_name = _extract_text(hero_design, ["hero_name", "name"], "Training Hero")
    hero_title = _extract_text(hero_design, ["hero_title", "title"], "Playable Demo Hero")
    role = _extract_text(hero_design, ["role", "hero_role"], "fighter")
    theme = _infer_theme(hero_design)
    color = _theme_color(theme)

    spec = {
        "version": "1.0",
        "hero": {
            "id": _slugify(hero_name),
            "name": hero_name,
            "title": hero_title,
            "role": role,
            "max_hp": 1000,
            "move_speed": 5.5,
            "attack_damage": 45,
            "attack_range": 6,
            "resource_type": "mana",
            "max_resource": 100,
        },
        "gameplay_tags": [theme, "training_demo", "mvp"],
        "skills": [
            {
                "slot": "Q",
                "name": "Arc Shot",
                "type": "projectile",
                "cooldown": 4,
                "resource_cost": 20,
                "damage": 110,
                "range": 14,
                "radius": 1,
                "speed": 16,
                "description": "Fire a compact training projectile toward the target direction.",
                "vfx": {
                    "theme": theme,
                    "color": color,
                    "shape": "fireball" if theme == "fire" else "rune",
                    "impact": "compact_burst",
                    "trail": "energy_trail",
                },
            },
            {
                "slot": "W",
                "name": "Field Pulse",
                "type": "aoe_dot",
                "cooldown": 10,
                "resource_cost": 35,
                "damage": 26,
                "range": 10,
                "radius": 4,
                "duration": 5,
                "tick_interval": 1,
                "description": "Create a short-lived damaging training zone.",
                "vfx": {
                    "theme": theme,
                    "color": color,
                    "shape": "circle_zone",
                    "impact": "ground_pulse",
                    "trail": "rising_energy",
                },
            },
            {
                "slot": "E",
                "name": "Battle Dash",
                "type": "dash",
                "cooldown": 8,
                "resource_cost": 25,
                "damage": 65,
                "distance": 7,
                "radius": 1.5,
                "duration": 0.35,
                "description": "Dash forward and damage nearby enemies at the endpoint.",
                "vfx": {
                    "theme": theme,
                    "color": color,
                    "shape": "trail",
                    "impact": "dash_sweep",
                    "trail": "dash_afterimage",
                },
            },
            {
                "slot": "R",
                "name": "Arena Breaker",
                "type": "aoe",
                "cooldown": 45,
                "resource_cost": 70,
                "damage": 300,
                "range": 16,
                "radius": 5,
                "duration": 1,
                "description": "Call down a large arena impact at the target point.",
                "vfx": {
                    "theme": theme,
                    "color": color,
                    "shape": "meteor" if theme == "fire" else "burst",
                    "impact": "large_impact",
                    "trail": "falling_energy",
                },
            },
        ],
        "runtime": {
            "control_scheme": "wasd_mouse",
            "camera": "third_person_follow",
            "map_profile": "default_training_arena",
        },
    }
    return apply_design_mechanic_mapping(spec, hero_design)


def apply_design_mechanic_mapping(
    spec: dict[str, Any],
    hero_design: Any | None,
) -> dict[str, Any]:
    spec = normalize_directional_area_skills(spec, hero_design)
    spec = prefer_summon_skill_when_requested(spec, hero_design)
    spec = add_status_effects_when_requested(spec, hero_design)
    spec = ensure_executable_effect_contracts(spec)
    spec = ensure_hit_feedback_vfx_events(spec, hero_design)
    return ensure_war3_ability_contracts(spec)


def ensure_executable_effect_contracts(spec: dict[str, Any]) -> dict[str, Any]:
    skills = spec.get("skills")
    if not isinstance(skills, list):
        return spec

    for skill in skills:
        if not isinstance(skill, dict):
            continue
        effects = skill.setdefault("effects", [])
        if not isinstance(effects, list):
            skill["effects"] = effects = []
        for required_effect in _legacy_effects_for_skill(skill):
            if not _has_equivalent_effect(effects, required_effect):
                effects.append(required_effect)
    return spec


def _has_equivalent_effect(
    effects: list[Any],
    required_effect: dict[str, Any],
) -> bool:
    for effect in effects:
        if not isinstance(effect, dict):
            continue
        if (
            effect.get("trigger") == required_effect.get("trigger")
            and effect.get("action") == required_effect.get("action")
            and effect.get("target") == required_effect.get("target")
        ):
            return True
    return False


def ensure_war3_ability_contracts(spec: dict[str, Any]) -> dict[str, Any]:
    skills = spec.get("skills")
    if not isinstance(skills, list):
        return spec

    for skill in skills:
        if not isinstance(skill, dict):
            continue
        existing = skill.get("ability_contract")
        generated = _war3_contract_for_skill(skill)
        if isinstance(existing, dict):
            skill["ability_contract"] = _merge_war3_contract(existing, generated)
        else:
            skill["ability_contract"] = generated
    return spec


def _merge_war3_contract(
    existing: dict[str, Any],
    generated: dict[str, Any],
) -> dict[str, Any]:
    merged = dict(generated)
    for key, value in existing.items():
        if value not in (None, "", [], {}):
            merged[key] = value

    for nested_key in ("target_filters", "missile", "area", "buff", "summon"):
        generated_nested = generated.get(nested_key)
        existing_nested = existing.get(nested_key)
        if isinstance(generated_nested, dict) and isinstance(existing_nested, dict):
            nested = dict(generated_nested)
            nested.update(
                {
                    key: value
                    for key, value in existing_nested.items()
                    if value not in (None, "", [], {})
                }
            )
            merged[nested_key] = nested

    if not merged.get("levels"):
        merged["levels"] = generated["levels"]
    if not merged.get("art_bindings"):
        merged["art_bindings"] = generated["art_bindings"]
    if not merged.get("effect_kinds"):
        merged["effect_kinds"] = generated["effect_kinds"]
    return merged


def _war3_contract_for_skill(skill: dict[str, Any]) -> dict[str, Any]:
    skill_type = str(skill.get("type", "aoe"))
    slot = str(skill.get("slot", "Q"))
    name = str(skill.get("name") or f"{slot} Skill")
    status_effects = skill.get("status_effects")
    effects = skill.get("effects")

    cast_type_by_skill = {
        "projectile": "point_target",
        "aoe": "area_target",
        "aoe_dot": "area_target",
        "dash": "point_target",
        "buff": "self",
        "summon": "point_target",
    }
    target_by_skill = {
        "projectile": "point",
        "aoe": "area",
        "aoe_dot": "area",
        "dash": "point",
        "buff": "self",
        "summon": "point",
    }
    effect_kinds = _war3_effect_kinds_for_skill(skill, effects, status_effects)

    return {
        "ability_id": f"{slot.lower()}_{_slugify(name)}",
        "base_order": _war3_order_for_skill_type(skill_type, slot),
        "cast_type": cast_type_by_skill.get(skill_type, "area_target"),
        "primary_target": target_by_skill.get(skill_type, "area"),
        "target_filters": _war3_target_filters_for_skill_type(skill_type),
        "effect_kinds": effect_kinds,
        "levels": [
            {
                "level": 1,
                "cooldown": _number_or_default(skill.get("cooldown"), 0),
                "resource_cost": _number_or_default(skill.get("resource_cost"), 0),
                "damage": _optional_number(skill.get("damage")),
                "area": _optional_number(skill.get("radius")),
                "duration": _optional_number(skill.get("duration")),
                "notes": _war3_level_notes(skill),
            }
        ],
        "missile": {
            "enabled": skill_type == "projectile"
            or _effects_include_action(effects, "spawn_projectile"),
            "speed": _optional_number(skill.get("speed")),
            "arc": 0.0,
            "homing": False,
        },
        "area": {
            "enabled": skill_type in {"aoe", "aoe_dot"}
            or _effects_include_action(effects, "aoe_damage")
            or _effects_include_action(effects, "spawn_zone"),
            "radius": _optional_number(skill.get("radius")),
            "duration": _optional_number(skill.get("duration")),
            "tick_interval": _optional_number(skill.get("tick_interval")),
        },
        "buff": _war3_buff_contract(status_effects),
        "summon": {
            "enabled": skill_type == "summon" or _effects_include_action(effects, "summon"),
            "unit_name": f"{name} Unit" if skill_type == "summon" else None,
            "duration": _optional_number(skill.get("duration")),
            "attack_damage": _optional_number(skill.get("damage")),
            "attack_range": _optional_number(skill.get("range")),
        },
        "art_bindings": _war3_art_bindings_for_skill(skill, effects),
        "unsupported_notes": _war3_unsupported_notes(skill),
    }


def _war3_order_for_skill_type(skill_type: str, slot: str) -> str:
    orders = {
        "projectile": "acidbomb",
        "aoe": "flamestrike",
        "aoe_dot": "blizzard",
        "dash": "blink",
        "buff": "innerfire",
        "summon": "summonwaterelemental",
    }
    return orders.get(skill_type, f"channel_{slot.lower()}")


def _war3_target_filters_for_skill_type(skill_type: str) -> dict[str, Any]:
    if skill_type == "buff":
        return {
            "allowed": ["self"],
            "enemy": False,
            "ally": False,
            "self": True,
            "ground": False,
            "summoned": False,
        }
    if skill_type == "summon":
        return {
            "allowed": ["point", "summoned_unit"],
            "enemy": False,
            "ally": False,
            "self": False,
            "ground": True,
            "summoned": True,
        }
    if skill_type in {"aoe", "aoe_dot"}:
        return {
            "allowed": ["point", "area", "enemy_unit"],
            "enemy": True,
            "ally": False,
            "self": False,
            "ground": True,
            "summoned": False,
        }
    return {
        "allowed": ["point", "enemy_unit"],
        "enemy": True,
        "ally": False,
        "self": False,
        "ground": True,
        "summoned": False,
    }


def _war3_effect_kinds_for_skill(
    skill: dict[str, Any],
    effects: Any,
    status_effects: Any,
) -> list[str]:
    kinds: list[str] = []
    skill_type = skill.get("type")
    if skill_type == "projectile" or _effects_include_action(effects, "spawn_projectile"):
        kinds.extend(["missile", "damage"])
    if skill_type in {"aoe", "aoe_dot"} or _effects_include_action(effects, "spawn_zone"):
        kinds.append("area_persistent" if skill_type == "aoe_dot" else "damage")
    if skill_type == "dash":
        kinds.append("movement")
    if skill_type == "summon" or _effects_include_action(effects, "summon"):
        kinds.append("summon")
    if isinstance(status_effects, list) and status_effects:
        kinds.append("debuff")
    if _effects_include_action(effects, "spawn_vfx_event"):
        kinds.append("vfx_only")
    return list(dict.fromkeys(kinds or ["damage"]))


def _war3_level_notes(skill: dict[str, Any]) -> str:
    parts = [str(skill.get("description", "")).strip()]
    if skill.get("type") == "summon":
        parts.append("Compiled as a War3-style summon ability with a timed unit.")
    if skill.get("type") == "aoe_dot":
        parts.append("Compiled as a persistent area effect with periodic ticks.")
    return " ".join(part for part in parts if part)


def _war3_buff_contract(status_effects: Any) -> dict[str, Any]:
    if not isinstance(status_effects, list) or not status_effects:
        return {"enabled": False}
    first = next((effect for effect in status_effects if isinstance(effect, dict)), None)
    if first is None:
        return {"enabled": False}
    return {
        "enabled": True,
        "buff_type": first.get("type"),
        "duration": _optional_number(first.get("duration")),
        "tick_interval": _optional_number(first.get("tick_interval")),
        "value": _optional_number(first.get("value")),
    }


def _war3_art_bindings_for_skill(skill: dict[str, Any], effects: Any) -> list[dict[str, Any]]:
    skill_type = skill.get("type")
    bindings: list[dict[str, Any]] = [{"hook": "cast", "event": "on_cast", "usage": "cast_flash"}]
    if skill_type == "projectile" or _effects_include_action(effects, "spawn_projectile"):
        bindings.append({"hook": "missile", "event": "on_cast", "usage": "projectile"})
        bindings.append({"hook": "impact", "event": "on_projectile_hit", "usage": "hit_flash"})
    if skill_type in {"aoe", "aoe_dot"} or _effects_include_action(effects, "spawn_zone"):
        bindings.append({"hook": "area", "event": "on_cast", "usage": "ground_decal"})
        bindings.append({"hook": "loop", "event": "on_zone_tick", "usage": "zone_tick"})
    if skill_type == "summon" or _effects_include_action(effects, "summon"):
        bindings.append({"hook": "summon", "event": "on_cast", "usage": "summon_body"})
        bindings.append({"hook": "death", "event": "on_summon_expire", "usage": "summon_expire"})
    if isinstance(skill.get("status_effects"), list) and skill["status_effects"]:
        bindings.append({"hook": "buff", "event": "on_status_tick", "usage": "status_loop"})
    return bindings


def _war3_unsupported_notes(skill: dict[str, Any]) -> list[str]:
    text = _to_searchable_text(skill)
    notes: list[str] = []
    unsupported_terms = {
        "channel": "Channeling is recorded in ability_contract but compiled to instant demo effects.",
        "passive": "Passive abilities are recorded but the current demo runtime executes active Q/W/E/R casts.",
        "toggle": "Toggle abilities are recorded but compiled to a timed buff/area where possible.",
        "aura": "Aura behavior is recorded as buff/art hooks; full War3 aura ownership is not implemented yet.",
    }
    for term, note in unsupported_terms.items():
        if term in text:
            notes.append(note)
    return notes


def _effects_include_action(effects: Any, action: str) -> bool:
    return isinstance(effects, list) and any(
        isinstance(effect, dict) and effect.get("action") == action
        for effect in effects
    )


def normalize_directional_area_skills(
    spec: dict[str, Any],
    hero_design: Any | None,
) -> dict[str, Any]:
    skills = spec.get("skills")
    if not isinstance(skills, list):
        return spec

    for skill in skills:
        if not isinstance(skill, dict) or skill.get("type") != "dash":
            continue
        if not _skill_is_directional_area_not_self_dash(skill, hero_design):
            continue
        _convert_dash_to_directional_projectile(skill)
    return spec


def _skill_is_directional_area_not_self_dash(
    skill: dict[str, Any],
    hero_design: Any | None,
) -> bool:
    skill_text = _to_searchable_text(
        {
            "name": skill.get("name"),
            "description": skill.get("description"),
            "tags": skill.get("tags"),
        }
    )
    full_text = f"{skill_text} {_to_searchable_text(hero_design)}"
    directional_area_terms = [
        "wave",
        "shockwave",
        "flame wave",
        "fire wave",
        "flame wall",
        "wall of fire",
        "path",
        "ground",
        "field",
        "zone",
        "area",
        "推进",
        "波浪",
        "火焰波",
        "冲击波",
        "路径",
        "地面",
        "领域",
        "区域",
        "火海",
        "熔岩",
    ]
    self_dash_terms = [
        "blink",
        "leap",
        "charge",
        "teleport",
        "self",
        "hero moves",
        "hero dashes",
        "位移",
        "冲刺",
        "闪现",
        "跳跃",
        "自身",
        "英雄向前",
        "英雄冲刺",
    ]
    has_directional_area = any(term in full_text for term in directional_area_terms)
    has_self_dash = any(term in skill_text for term in self_dash_terms)
    return has_directional_area and not has_self_dash


def _convert_dash_to_directional_projectile(skill: dict[str, Any]) -> None:
    damage = _number_or_default(skill.get("damage"), 80)
    radius = _number_or_default(skill.get("radius"), 2.5)
    distance = _number_or_default(skill.get("distance"), 10)
    duration = _number_or_default(skill.get("duration"), 3)
    tick_interval = _number_or_default(skill.get("tick_interval"), 1)

    skill["type"] = "projectile"
    skill["damage"] = damage
    skill["range"] = max(_number_or_default(skill.get("range"), distance), distance, 8)
    skill["radius"] = max(radius, 1.5)
    skill["speed"] = _number_or_default(skill.get("speed"), 14)
    skill.pop("distance", None)
    skill["effects"] = [
        {
            "trigger": "on_cast",
            "action": "spawn_projectile",
            "target": "target_position",
        },
        {
            "trigger": "on_projectile_hit",
            "action": "damage",
            "target": "target_enemy",
            "damage": damage,
        },
        {
            "trigger": "on_projectile_hit",
            "action": "spawn_zone",
            "target": "projectile_position",
            "radius": max(radius, 2.5),
            "damage": max(4, round(damage * 0.18, 2)),
            "duration": min(max(duration, 2), 6),
            "tick_interval": tick_interval,
            "status_effects": [
                {
                    "type": "burn",
                    "duration": min(max(duration, 2), 5),
                    "tick_interval": tick_interval,
                    "damage": max(4, round(damage * 0.1, 2)),
                }
            ],
        },
    ]


def prefer_summon_skill_when_requested(
    spec: dict[str, Any],
    hero_design: Any | None,
) -> dict[str, Any]:
    if not _hero_design_requests_summon(hero_design):
        return spec
    skills = spec.get("skills")
    if not isinstance(skills, list) or any(skill.get("type") == "summon" for skill in skills if isinstance(skill, dict)):
        return spec

    target_skill = _find_summon_candidate_skill(skills)
    if target_skill is None:
        return spec

    target_skill["type"] = "summon"
    target_skill.setdefault("duration", 8)
    target_skill.setdefault("damage", 18)
    target_skill.setdefault("radius", 0.75)
    target_skill.setdefault("range", 7)
    target_skill.setdefault("tick_interval", 1)
    if not str(target_skill.get("description", "")).strip():
        target_skill["description"] = "Summon an allied entity that attacks nearby training enemies."
    elif "summon" not in str(target_skill.get("description", "")).lower():
        target_skill["description"] = (
            f"{target_skill['description']} Summons an allied entity that attacks nearby enemies."
        )
    return spec


def add_status_effects_when_requested(
    spec: dict[str, Any],
    hero_design: Any | None,
) -> dict[str, Any]:
    status_types = _infer_status_effect_types(hero_design)
    if not status_types:
        return spec

    skills = spec.get("skills")
    if not isinstance(skills, list):
        return spec

    for skill in skills:
        if not isinstance(skill, dict) or not _skill_can_apply_status(skill):
            continue
        effects = skill.setdefault("status_effects", [])
        if not isinstance(effects, list):
            skill["status_effects"] = effects = []
        for status_type in status_types:
            if any(isinstance(effect, dict) and effect.get("type") == status_type for effect in effects):
                continue
            effects.append(_status_effect_for_skill(skill, status_type))
    return spec


def ensure_hit_feedback_vfx_events(
    spec: dict[str, Any],
    hero_design: Any | None,
) -> dict[str, Any]:
    skills = spec.get("skills")
    if not isinstance(skills, list):
        return spec

    design_text = _to_searchable_value_text(hero_design)
    for skill in skills:
        if not isinstance(skill, dict):
            continue
        if not _skill_needs_hit_feedback_vfx(skill, design_text):
            continue
        effects = skill.setdefault("effects", [])
        if not isinstance(effects, list):
            skill["effects"] = effects = []
        if not effects:
            effects.extend(_legacy_effects_for_skill(skill))
        trigger, target = _hit_feedback_trigger_and_target(skill)
        if any(
            isinstance(effect, dict)
            and effect.get("action") == "spawn_vfx_event"
            and effect.get("trigger") == trigger
            and effect.get("target") == target
            for effect in effects
        ):
            continue
        effects.append(
            {
                "trigger": trigger,
                "action": "spawn_vfx_event",
                "target": target,
                "radius": _number_or_default(skill.get("radius"), 1.0),
            }
        )
    return spec


def _legacy_effects_for_skill(skill: dict[str, Any]) -> list[dict[str, Any]]:
    skill_type = skill.get("type")
    if skill_type == "projectile":
        effects: list[dict[str, Any]] = [
            {
                "trigger": "on_cast",
                "action": "spawn_projectile",
                "target": "target_position",
            },
            {
                "trigger": "on_projectile_hit",
                "action": "damage",
                "target": "target_enemy",
                "damage": _number_or_default(skill.get("damage"), 0),
            },
        ]
        status_effects = skill.get("status_effects")
        if isinstance(status_effects, list) and status_effects:
            effects.append(
                {
                    "trigger": "on_projectile_hit",
                    "action": "apply_status",
                    "target": "target_enemy",
                    "radius": _number_or_default(skill.get("radius"), 1),
                    "status_effects": status_effects,
                }
            )
        return effects
    if skill_type == "aoe":
        return [
            {
                "trigger": "on_cast",
                "action": "aoe_damage",
                "target": "enemies_in_radius",
                "radius": _number_or_default(skill.get("radius"), 0),
                "damage": _number_or_default(skill.get("damage"), 0),
            }
        ]
    if skill_type == "aoe_dot":
        return [
            {
                "trigger": "on_cast",
                "action": "spawn_zone",
                "target": "target_position",
                "radius": _number_or_default(skill.get("radius"), 0),
                "damage": _number_or_default(skill.get("damage"), 0),
                "duration": _number_or_default(skill.get("duration"), 1),
                "tick_interval": _number_or_default(skill.get("tick_interval"), 1),
                "status_effects": skill.get("status_effects") if isinstance(skill.get("status_effects"), list) else [],
            }
        ]
    if skill_type == "summon":
        return [
            {
                "trigger": "on_cast",
                "action": "summon",
                "target": "target_position",
                "duration": _number_or_default(skill.get("duration"), 8),
            }
        ]
    return []


def _skill_needs_hit_feedback_vfx(skill: dict[str, Any], design_text: str) -> bool:
    skill_text = _to_searchable_value_text(
        {
            "name": skill.get("name"),
            "description": skill.get("description"),
            "vfx": skill.get("vfx"),
            "effects": skill.get("effects"),
        }
    )
    combined = f"{skill_text} {design_text}"
    hit_feedback_terms = [
        "hit",
        "impact",
        "explosion",
        "explode",
        "burst",
        "shockwave",
        "burning hit",
        "ignite",
        "scorch",
        "命中",
        "爆炸",
        "冲击",
        "燃烧",
        "击中反馈",
        "受击",
    ]
    return any(term in combined for term in hit_feedback_terms)


def _to_searchable_value_text(source: Any) -> str:
    if isinstance(source, dict):
        return " ".join(_to_searchable_value_text(value) for value in source.values())
    if isinstance(source, list):
        return " ".join(_to_searchable_value_text(value) for value in source)
    if source is None:
        return ""
    return str(source).lower()


def _hit_feedback_trigger_and_target(skill: dict[str, Any]) -> tuple[str, str]:
    skill_type = skill.get("type")
    if skill_type == "projectile":
        return "on_projectile_hit", "projectile_position"
    if skill_type == "summon":
        return "on_summon_attack", "target_enemy"
    return "on_cast", "target_position"


def _extract_text(source: Any, keys: list[str], fallback: str) -> str:
    if isinstance(source, str):
        try:
            parsed = json.loads(source)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            return _extract_text(parsed, keys, fallback)

    if isinstance(source, dict):
        for key in keys:
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    if isinstance(source, str) and source.strip():
        return source.strip().splitlines()[0][:80]

    return fallback


def _hero_design_requests_summon(source: Any | None) -> bool:
    text = _to_searchable_text(source)
    strong_keywords = [
        "summon",
        "summoner",
        "minion",
        "pet",
        "familiar",
        "clone",
        "totem",
        "召唤",
        "召喚",
        "分身",
        "宠物",
        "寵物",
        "使魔",
        "火灵",
        "炎灵",
        "灵体",
        "灵火",
        "图腾",
        "炮台",
        "傀儡",
    ]
    return any(keyword in text for keyword in strong_keywords)


def _find_summon_candidate_skill(skills: list[Any]) -> dict[str, Any] | None:
    for skill in skills:
        if isinstance(skill, dict) and _skill_mentions_summon(skill):
            return skill

    for preferred_type in ("buff", "aoe_dot", "aoe"):
        for skill in skills:
            if isinstance(skill, dict) and skill.get("type") == preferred_type:
                return skill

    for skill in skills:
        if isinstance(skill, dict):
            return skill
    return None


def _skill_mentions_summon(skill: dict[str, Any]) -> bool:
    text = _to_searchable_text(
        {
            "name": skill.get("name"),
            "description": skill.get("description"),
            "vfx": skill.get("vfx"),
        }
    )
    keywords = [
        "summon",
        "minion",
        "pet",
        "familiar",
        "clone",
        "spirit",
        "guardian",
        "召唤",
        "召喚",
        "分身",
        "宠物",
        "寵物",
        "使魔",
        "火灵",
        "炎灵",
        "灵体",
        "守卫",
        "守護",
        "幻影",
        "傀儡",
    ]
    return any(keyword in text for keyword in keywords)


def _infer_status_effect_types(source: Any | None) -> list[str]:
    text = _to_searchable_text(source)
    status_types: list[str] = []
    if any(
        keyword in text
        for keyword in [
            "burn",
            "burning",
            "ignite",
            "scorch",
            "灼烧",
            "燃烧",
            "点燃",
            "灼燒",
            "火焰标记",
            "火焰印记",
        ]
    ):
        status_types.append("burn")
    if any(keyword in text for keyword in ["poison", "toxin", "venom", "中毒", "毒"]):
        status_types.append("poison")
    if any(
        keyword in text
        for keyword in ["slow", "snare", "frost", "chill", "freeze", "减速", "冰霜", "寒冷"]
    ):
        status_types.append("slow")
    if any(
        keyword in text
        for keyword in ["mark", "marked", "sigil", "vulnerable", "易伤", "标记", "印记"]
    ):
        status_types.append("mark")
    if any(keyword in text for keyword in ["stun", "daze", "disable", "眩晕", "击晕", "定身"]):
        status_types.append("stun")
    return status_types


def _skill_can_apply_status(skill: dict[str, Any]) -> bool:
    skill_type = skill.get("type")
    return skill_type in {"projectile", "aoe", "aoe_dot", "dash", "summon"}


def _status_damage_for_skill(skill: dict[str, Any], status_type: str) -> float:
    base_damage = skill.get("damage")
    if not isinstance(base_damage, (int, float)):
        return 8.0 if status_type == "burn" else 6.0
    multiplier = 0.12 if status_type == "burn" else 0.1
    return max(4.0, min(30.0, round(float(base_damage) * multiplier, 2)))


def _status_effect_for_skill(skill: dict[str, Any], status_type: str) -> dict[str, Any]:
    if status_type in {"burn", "poison"}:
        return {
            "type": status_type,
            "duration": 3.0 if status_type == "burn" else 4.0,
            "tick_interval": 1.0,
            "damage": _status_damage_for_skill(skill, status_type),
        }
    if status_type == "slow":
        return {
            "type": "slow",
            "duration": 3.0,
            "value": 0.35,
        }
    if status_type == "mark":
        return {
            "type": "mark",
            "duration": 4.0,
            "value": 0.25,
        }
    return {
        "type": "stun",
        "duration": 1.0,
        "value": 1.0,
    }


def _number_or_default(value: Any, fallback: float) -> float:
    return float(value) if isinstance(value, (int, float)) else float(fallback)


def _optional_number(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) else None


def _to_searchable_text(value: Any | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.lower()
    try:
        return json.dumps(value, ensure_ascii=False).lower()
    except TypeError:
        return str(value).lower()


def _infer_theme(source: Any) -> str:
    text = str(source).lower()
    if any(term in text for term in ["fire", "flame", "ember", "burn"]):
        return "fire"
    if any(term in text for term in ["ice", "frost", "crystal"]):
        return "ice"
    if any(term in text for term in ["thunder", "lightning", "storm"]):
        return "thunder"
    if any(term in text for term in ["poison", "toxin", "venom"]):
        return "poison"
    if any(term in text for term in ["dark", "shadow", "night"]):
        return "dark"
    if any(term in text for term in ["holy", "light", "solar"]):
        return "holy"
    if any(term in text for term in ["wind", "gale", "air"]):
        return "wind"
    if any(term in text for term in ["earth", "stone", "rock"]):
        return "earth"
    return "arcane"


def _theme_color(theme: str) -> str:
    colors = {
        "fire": "#ff5a1f",
        "ice": "#7ddcff",
        "thunder": "#facc15",
        "poison": "#84cc16",
        "dark": "#6d4cff",
        "holy": "#ffd700",
        "arcane": "#9cc9ff",
        "wind": "#67e8f9",
        "earth": "#a3a3a3",
    }
    return colors.get(theme, "#9cc9ff")


def _slugify(value: str) -> str:
    slug = "".join(char.lower() if char.isalnum() else "_" for char in value)
    slug = "_".join(part for part in slug.split("_") if part)
    return slug[:48] or "training_hero"
