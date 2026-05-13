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
    spec = prefer_summon_skill_when_requested(spec, hero_design)
    return add_status_effects_when_requested(spec, hero_design)


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
    status_type = _infer_status_effect_type(hero_design)
    if status_type is None:
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
        if any(isinstance(effect, dict) and effect.get("type") == status_type for effect in effects):
            continue
        effects.append(
            {
                "type": status_type,
                "duration": 3.0 if status_type == "burn" else 4.0,
                "tick_interval": 1.0,
                "damage": _status_damage_for_skill(skill, status_type),
            }
        )
    return spec


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


def _infer_status_effect_type(source: Any | None) -> str | None:
    text = _to_searchable_text(source)
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
        return "burn"
    if any(keyword in text for keyword in ["poison", "toxin", "venom", "中毒", "毒"]):
        return "poison"
    return None


def _skill_can_apply_status(skill: dict[str, Any]) -> bool:
    skill_type = skill.get("type")
    return skill_type in {"projectile", "aoe", "aoe_dot", "dash", "summon"}


def _status_damage_for_skill(skill: dict[str, Any], status_type: str) -> float:
    base_damage = skill.get("damage")
    if not isinstance(base_damage, (int, float)):
        return 8.0 if status_type == "burn" else 6.0
    multiplier = 0.12 if status_type == "burn" else 0.1
    return max(4.0, min(30.0, round(float(base_damage) * multiplier, 2)))


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
