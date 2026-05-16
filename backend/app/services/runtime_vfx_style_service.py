from dataclasses import dataclass
import re

from app.schemas.hero_schema import HeroDesign
from app.schemas.playable_schema import HeroPlayableSpec, SkillSpec
from app.schemas.vfx_schema import VfxDesign


HEX_COLOR_RE = re.compile(r"#[0-9a-fA-F]{6}")

DEFAULT_THEME_COLORS = {
    "fire": "#ff5a1f",
    "ice": "#7dd3fc",
    "thunder": "#facc15",
    "poison": "#84cc16",
    "dark": "#8b5cf6",
    "holy": "#ffd700",
    "arcane": "#9cc9ff",
    "wind": "#7dd3fc",
    "earth": "#a16207",
}

THEME_TOKENS = {
    "fire": (
        "fire",
        "flame",
        "burn",
        "ignite",
        "lava",
        "magma",
        "ember",
        "pyro",
        "red",
        "orange",
        "火",
        "炎",
        "焰",
        "燃",
        "灼",
        "熔",
        "烬",
        "赤",
        "红",
        "岩浆",
        "余烬",
        "烈焰",
    ),
    "ice": ("ice", "frost", "snow", "freeze", "cryo", "冰", "霜", "雪", "冻"),
    "thunder": (
        "thunder",
        "lightning",
        "electric",
        "storm",
        "雷",
        "电",
        "闪电",
    ),
    "poison": ("poison", "toxic", "venom", "acid", "毒", "剧毒", "腐蚀"),
    "dark": ("dark", "shadow", "void", "night", "abyss", "暗", "影", "黑", "虚空"),
    "holy": ("holy", "light", "solar", "radiant", "sacred", "圣", "光", "神圣", "太阳"),
    "wind": ("wind", "air", "storm", "gale", "风", "气流", "飓"),
    "earth": ("earth", "stone", "rock", "sand", "ground", "土", "石", "岩", "沙"),
}


@dataclass(frozen=True)
class RuntimeVfxStyle:
    theme: str
    primary_color: str
    palette: tuple[str, ...]
    keywords: tuple[str, ...]


def resolve_runtime_vfx_styles(
    playable_spec: HeroPlayableSpec,
    element_theme: str | None = None,
    hero_design: HeroDesign | None = None,
    vfx_designs: list[VfxDesign] | None = None,
) -> dict[str, RuntimeVfxStyle]:
    vfx_by_slot = _vfx_designs_by_slot(playable_spec, hero_design, vfx_designs or [])
    global_theme = infer_theme([element_theme or "", *playable_spec.gameplay_tags])
    styles: dict[str, RuntimeVfxStyle] = {}

    for skill in playable_spec.skills:
        vfx_design = vfx_by_slot.get(skill.slot)
        styles[skill.slot] = _style_for_skill(
            skill=skill,
            vfx_design=vfx_design,
            global_theme=global_theme,
            element_theme=element_theme,
        )

    return styles


def infer_theme(values: list[str] | tuple[str, ...]) -> str | None:
    combined = " ".join(value for value in values if value).lower()
    for theme, tokens in THEME_TOKENS.items():
        if any(token.lower() in combined for token in tokens):
            return theme
    return None


def _style_for_skill(
    skill: SkillSpec,
    vfx_design: VfxDesign | None,
    global_theme: str | None,
    element_theme: str | None,
) -> RuntimeVfxStyle:
    palette = _palette_from_vfx_design(vfx_design)
    vfx_theme = _theme_from_vfx_design(vfx_design)
    skill_theme = skill.vfx.theme
    theme = vfx_theme or global_theme or skill_theme
    primary_color = _primary_color_for_theme(
        theme=theme,
        palette=palette,
        fallback=skill.vfx.color,
    )
    keywords = _style_keywords(
        skill=skill,
        vfx_design=vfx_design,
        element_theme=element_theme,
        theme=theme,
        primary_color=primary_color,
        palette=palette,
    )
    return RuntimeVfxStyle(
        theme=theme,
        primary_color=primary_color,
        palette=tuple(palette),
        keywords=tuple(keywords),
    )


def _vfx_designs_by_slot(
    playable_spec: HeroPlayableSpec,
    hero_design: HeroDesign | None,
    vfx_designs: list[VfxDesign],
) -> dict[str, VfxDesign]:
    if not vfx_designs:
        return {}

    by_slot: dict[str, VfxDesign] = {}
    by_name = {_normalize_name(vfx.skill_name): vfx for vfx in vfx_designs}

    for skill in playable_spec.skills:
        matched = by_name.get(_normalize_name(skill.name))
        if matched:
            by_slot[skill.slot] = matched

    if hero_design:
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


def _theme_from_vfx_design(vfx_design: VfxDesign | None) -> str | None:
    if vfx_design is None:
        return None
    return infer_theme(
        [
            vfx_design.skill_name,
            vfx_design.vfx_category,
            vfx_design.camera_suggestion,
            vfx_design.sound_suggestion,
            *(vfx_design.visual_keywords or []),
            *vfx_design.color_palette.keys(),
        ]
    )


def _palette_from_vfx_design(vfx_design: VfxDesign | None) -> list[str]:
    if vfx_design is None:
        return []
    colors: list[str] = []
    for value in vfx_design.color_palette.values():
        match = HEX_COLOR_RE.fullmatch(value.strip())
        if match and match.group(0).lower() not in colors:
            colors.append(match.group(0).lower())
    return colors


def _primary_color_for_theme(
    theme: str,
    palette: list[str],
    fallback: str,
) -> str:
    if palette:
        if theme == "fire":
            return max(palette, key=_fire_color_score)
        return palette[0]
    fallback_color = fallback.strip().lower()
    if HEX_COLOR_RE.fullmatch(fallback_color) and _color_matches_theme(
        fallback_color, theme
    ):
        return fallback_color
    return DEFAULT_THEME_COLORS.get(theme, fallback_color if fallback_color else "#ffffff")


def _style_keywords(
    skill: SkillSpec,
    vfx_design: VfxDesign | None,
    element_theme: str | None,
    theme: str,
    primary_color: str,
    palette: list[str],
) -> list[str]:
    keywords = [
        f"{theme} theme",
        f"primary color {primary_color}",
        *palette,
        skill.vfx.shape,
        skill.vfx.impact,
        skill.vfx.trail,
    ]
    if element_theme:
        keywords.append(element_theme)
    if vfx_design:
        keywords.extend(vfx_design.visual_keywords)
        keywords.append(vfx_design.vfx_category)
        keywords.extend(stage.description for stage in vfx_design.stages[:2])
    return _dedupe_text(keywords)


def _color_matches_theme(color: str, theme: str) -> bool:
    red, green, blue = _rgb(color)
    if theme == "fire":
        return red >= 180 and red >= blue * 1.35 and green >= blue * 0.7
    if theme == "ice":
        return blue >= red and blue >= green * 0.8
    if theme == "poison":
        return green >= red and green >= blue
    return True


def _fire_color_score(color: str) -> int:
    red, green, blue = _rgb(color)
    warmth = red * 3 + green - blue * 3
    brightness = red + green + blue
    return warmth * 10 + brightness


def _rgb(color: str) -> tuple[int, int, int]:
    text = color.lstrip("#")
    return int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16)


def _normalize_name(value: str) -> str:
    return re.sub(r"\s+", "", value or "").casefold()


def _dedupe_text(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = (value or "").strip()
        key = cleaned.casefold()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result
