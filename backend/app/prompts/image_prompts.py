from app.schemas.vfx_schema import VfxDesign

VFX_TEXTURE_RESOURCE_TYPES = (
    "projectile",
    "impact",
    "hit_flash",
    "ground_decal",
    "aura",
    "trail",
    "particle",
    "beam",
    "summon_body",
    "cast_flash",
    "cast_circle",
    "zone_tick",
    "summon_spawn",
    "summon_idle",
    "summon_expire",
    "status_loop",
    "burn_loop",
    "poison_cloud",
    "mark_sigil",
    "mark_sigial",
    "stun_stars",
)

VFX_PROMPT_TEMPLATES: dict[str, str] = {
    "projectile": (
        "isolated projectile sprite for {skill_name}, {element} element, {keywords}, "
        "single subject, bright core, soft glowing edges, compact flying energy shape, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "billboard sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "impact": (
        "isolated impact explosion sprite for {skill_name}, {element} element, {keywords}, "
        "radial explosion shape, bright center, outward energy burst, shockwave fragments, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "hit_flash": (
        "isolated hit feedback flash sprite for {skill_name}, {element} element, {keywords}, "
        "compact enemy-hit spark, bright contact point, short radial burst, readable damage feedback, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "ground_decal": (
        "top-down circular ground decal for {skill_name}, {element} element, {keywords}, "
        "flat magical pattern, centered and symmetrical, clean readable area indicator, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "ground projection, plane decal rendering, transparent background, centered composition, "
        "no perspective camera angle, no character, no environment, no text, no logo, no watermark"
    ),
    "aura": (
        "top-down aura ring for {skill_name}, {element} element, {keywords}, "
        "circular energy ring, soft glow, buff halo, clean transparent inner and outer edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "rotating aura effect, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "trail": (
        "elongated energy trail texture for {skill_name}, {element} element, {keywords}, "
        "directional flow, motion smear, fading tail, soft transparent edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "stretching, trail rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "particle": (
        "small isolated particle sprite for {skill_name}, {element} element, {keywords}, "
        "simple readable shape, clean glowing particle, spark shard ember crystal fragment, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "particle systems, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "beam": (
        "isolated beam effect for {skill_name}, {element} element, {keywords}, "
        "elongated magical energy beam, bright core, glowing edges, clean directional column, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "beam rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "summon_body": (
        "isolated summoned creature sprite for {skill_name}, {element} element, {keywords}, "
        "single readable summon entity, compact creature silhouette, glowing magical body, "
        "front-facing three-quarter game unit sprite, clean outline, no ground shadow baked in, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "billboard sprite rendering, transparent background, centered composition, "
        "no environment, no text, no logo, no watermark"
    ),
    "cast_flash": (
        "isolated casting flash sprite for {skill_name}, {element} element, {keywords}, "
        "brief origin burst, compact activation spark, bright center, soft glow edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "cast_circle": (
        "top-down casting circle decal for {skill_name}, {element} element, {keywords}, "
        "flat rune activation ring, centered symmetrical circle, clean readable telegraph marker, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "ground projection, plane decal rendering, transparent background, centered composition, "
        "no perspective camera angle, no character, no environment, no text, no logo, no watermark"
    ),
    "zone_tick": (
        "top-down recurring zone tick decal for {skill_name}, {element} element, {keywords}, "
        "flat pulsing area texture, circular damage rhythm marker, soft transparent edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "ground projection, plane decal rendering, additive blending, transparent background, centered composition, "
        "no perspective camera angle, no character, no environment, no text, no logo, no watermark"
    ),
    "summon_spawn": (
        "isolated summon spawn burst sprite for {skill_name}, {element} element, {keywords}, "
        "arrival flash, compact portal pop, bright magical emergence, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "summon_idle": (
        "small summon idle aura texture for {skill_name}, {element} element, {keywords}, "
        "compact follow halo, readable minion support glow, circular loop energy, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "aura ring rendering, additive blending, transparent background, centered composition, "
        "no environment, no text, no logo, no watermark"
    ),
    "summon_expire": (
        "isolated summon expiration burst sprite for {skill_name}, {element} element, {keywords}, "
        "death pop explosion, radial release, bright center, outward fragments, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "status_loop": (
        "small looping status effect sprite for {skill_name}, {element} element, {keywords}, "
        "readable debuff marker, compact magical loop, clean silhouette, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "burn_loop": (
        "small looping burn fire sprite for {skill_name}, fire element, {keywords}, "
        "persistent flame lick, readable burning debuff marker, clean glowing edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "poison_cloud": (
        "small looping poison cloud sprite for {skill_name}, {element} element, {keywords}, "
        "toxic vapor puff, readable poison debuff marker, soft transparent edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
    "mark_sigil": (
        "top-down target mark sigil decal for {skill_name}, {element} element, {keywords}, "
        "flat readable debuff seal, centered magical symbol, clean circular marker, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "ground projection, plane decal rendering, transparent background, centered composition, "
        "no perspective camera angle, no character, no environment, no text, no logo, no watermark"
    ),
    "mark_sigial": (
        "top-down target mark sigil decal for {skill_name}, {element} element, {keywords}, "
        "flat readable debuff seal, centered magical symbol, clean circular marker, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "ground projection, plane decal rendering, transparent background, centered composition, "
        "no perspective camera angle, no character, no environment, no text, no logo, no watermark"
    ),
    "stun_stars": (
        "small orbiting stun stars sprite for {skill_name}, {element} element, {keywords}, "
        "readable daze marker, bright small star shapes, clean transparent edges, "
        "game-ready VFX texture, optimized for real-time rendering, suitable for Three.js or Babylon.js, "
        "sprite rendering, additive blending, transparent background, centered composition, "
        "no character, no environment, no text, no logo, no watermark"
    ),
}

SKILL_TYPE_TEXTURE_RESOURCE_MAP: dict[str, tuple[str, ...]] = {
    "projectile": ("projectile", "trail", "impact", "particle"),
    "aoe": ("ground_decal", "impact", "particle"),
    "aoe_dot": ("ground_decal", "aura", "particle"),
    "dash": ("trail", "impact", "particle"),
    "buff": ("aura", "particle"),
    "beam": ("beam", "impact", "particle"),
    "summon": ("summon_body", "aura", "impact", "particle"),
}

VFX_TEXTURE_NEGATIVE_PROMPT = (
    "text, logo, watermark, character, full scene, environment, UI, frame, border, "
    "concept art poster, design board, screenshot, blurry edges, dirty alpha, solid background"
)


def build_image_prompt_generation_prompt(
    vfx_design: VfxDesign,
    style_hint: str | None = None,
) -> str:
    stages = "\n".join(
        f"- {stage.stage}: {stage.description}" for stage in vfx_design.stages
    )
    palette = ", ".join(
        f"{name}: {value}" for name, value in vfx_design.color_palette.items()
    )
    keywords = ", ".join(vfx_design.visual_keywords)

    return f"""你是一个游戏概念美术 Prompt 工程师，需要把技能特效拆解转成英文图像生成 Prompt。
skill_name: {vfx_design.skill_name}
vfx_category: {vfx_design.vfx_category}
visual_keywords: {keywords}
stages:
{stages}
color_palette: {palette}
camera_suggestion: {vfx_design.camera_suggestion}
sound_suggestion: {vfx_design.sound_suggestion}
style_hint: {style_hint or "high-end game VFX concept art"}

请严格输出符合 ImagePromptResult Schema 的 JSON。要求：
1. prompt 必须是英文。
2. prompt 必须包含：game VFX concept art、dark background、no text、no logo、no watermark。
3. 只生成单个技能特效缩略图。
4. 不要生成整张设计板。
5. 不要输出 Markdown。
6. 不要输出代码块。
7. 只输出 JSON。"""


def get_vfx_texture_prompt_template(resource_type: str) -> str:
    normalized = normalize_resource_type(resource_type)
    return VFX_PROMPT_TEMPLATES[normalized]


def get_texture_resource_types_for_skill_type(skill_type: str) -> tuple[str, ...]:
    normalized = (skill_type or "").strip().lower()
    return SKILL_TYPE_TEXTURE_RESOURCE_MAP.get(normalized, ("impact", "particle"))


def build_vfx_texture_prompt(
    resource_type: str,
    skill_name: str,
    element: str,
    keywords: list[str] | tuple[str, ...] | str | None = None,
) -> str:
    template = get_vfx_texture_prompt_template(resource_type)
    return template.format(
        skill_name=clean_prompt_text(skill_name, fallback="skill effect"),
        element=clean_prompt_text(element, fallback="arcane"),
        keywords=format_keywords(keywords),
    )


def generate_texture_prompts_for_skill(
    skill_name: str,
    skill_type: str,
    element: str,
    keywords: list[str] | tuple[str, ...] | str | None = None,
    resource_types: list[str] | tuple[str, ...] | None = None,
) -> dict:
    selected_resource_types = (
        tuple(normalize_resource_type(item) for item in resource_types)
        if resource_types
        else get_texture_resource_types_for_skill_type(skill_type)
    )
    return {
        "skill_name": clean_prompt_text(skill_name, fallback="skill effect"),
        "element": clean_prompt_text(element, fallback="arcane"),
        "prompts": {
            resource_type: build_vfx_texture_prompt(
                resource_type=resource_type,
                skill_name=skill_name,
                element=element,
                keywords=keywords,
            )
            for resource_type in selected_resource_types
        },
        "negative_prompt": VFX_TEXTURE_NEGATIVE_PROMPT,
    }


def generate_texture_prompts_for_vfx_design(
    vfx_design: VfxDesign,
    skill_type: str,
    element: str | None = None,
    resource_types: list[str] | tuple[str, ...] | None = None,
) -> dict:
    return generate_texture_prompts_for_skill(
        skill_name=vfx_design.skill_name,
        skill_type=skill_type,
        element=element or infer_element_from_vfx_design(vfx_design),
        keywords=vfx_design.visual_keywords,
        resource_types=resource_types,
    )


def normalize_resource_type(resource_type: str) -> str:
    normalized = (resource_type or "").strip().lower()
    if normalized not in VFX_PROMPT_TEMPLATES:
        raise ValueError(f"Unsupported VFX texture resource type: {resource_type}")
    return normalized


def format_keywords(keywords: list[str] | tuple[str, ...] | str | None) -> str:
    if isinstance(keywords, str):
        return clean_prompt_text(keywords, fallback="clean magical energy")
    if keywords:
        cleaned = [item.strip() for item in keywords if item and item.strip()]
        if cleaned:
            return ", ".join(cleaned)
    return "clean magical energy, readable silhouette"


def clean_prompt_text(value: str | None, fallback: str) -> str:
    if value and value.strip():
        return value.strip()
    return fallback


def infer_element_from_vfx_design(vfx_design: VfxDesign) -> str:
    combined = " ".join(
        [vfx_design.vfx_category, *vfx_design.visual_keywords]
    ).lower()
    if any(token in combined for token in ["fire", "flame", "burn", "火", "炎"]):
        return "fire"
    if any(token in combined for token in ["ice", "frost", "snow", "冰", "霜"]):
        return "ice"
    if any(token in combined for token in ["thunder", "lightning", "雷", "电"]):
        return "thunder"
    if any(token in combined for token in ["holy", "light", "圣", "光"]):
        return "holy"
    if any(token in combined for token in ["dark", "shadow", "暗", "影"]):
        return "dark"
    return "arcane"
