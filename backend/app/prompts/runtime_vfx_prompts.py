from app.prompts.image_prompts import build_vfx_texture_prompt
from app.schemas.playable_schema import SkillSpec


USAGE_DETAILS = {
    "projectile": "single projectile core, compact energy ball, arrow, bolt, or magic missile",
    "impact": "radial burst, explosion, shockwave, concentrated hit flash",
    "ground_decal": (
        "strict top-down view, flat circular ground decal, flat magic circle texture, "
        "painted-on-ground area marker, no dome, no sphere, no shield, no vertical wall, "
        "no 3D object, no perspective view, no horizon, no volumetric flame mound"
    ),
    "aura": "circular aura ring, buff halo, energy loop around the hero",
    "trail": "streak trail, motion smear, fading particles, directional afterimage",
    "summon_body": (
        "single summoned creature body sprite, readable magical unit silhouette, "
        "front-facing three-quarter view, no environment, no baked ground plane"
    ),
    "cast_flash": "brief casting flash, hand or origin burst, compact magical ignition sprite",
    "cast_circle": (
        "strict top-down casting circle, flat rune ring, readable activation marker, "
        "centered circular texture"
    ),
    "zone_tick": (
        "top-down recurring damage pulse texture, flat area tick marker, soft rhythmic glow"
    ),
    "summon_spawn": "summoning arrival flash, portal pop, compact spawn burst sprite",
    "summon_idle": "summoned unit idle aura, small follow halo, readable support glow",
    "summon_expire": "summoned unit expiration burst, death pop explosion, radial sprite",
    "status_loop": "looping status effect sprite, compact readable debuff marker",
    "burn_loop": "looping flame status effect, small persistent fire lick sprite",
    "poison_cloud": "looping toxic cloud status effect, small green vapor puff sprite",
    "mark_sigil": "flat target mark sigil, readable magical debuff seal",
    "mark_sigial": "flat target mark sigil, readable magical debuff seal",
    "stun_stars": "small orbiting stun stars sprite, readable daze marker",
}

USAGE_NEGATIVE_DETAILS = {
    "ground_decal": (
        "no dome, no sphere, no shield, no hemisphere, no vertical perspective, "
        "no side view, no 3D object, no mound, no wall of fire, no raised barrier"
    ),
    "cast_circle": "no side view, no vertical pillar, no raised 3D object",
    "zone_tick": "no side view, no vertical wall, no character, no environment",
}


def build_runtime_vfx_negative_prompt() -> str:
    return (
        "no character, no environment, no text, no logo, no watermark, "
        "no UI, no frame, no background scenery, no weapon model, no full illustration, "
        "do not draw checkerboard background, no transparency preview pattern, "
        "no white background, no gray background, no colored square background, "
        "no rectangular tile background, no dome, no sphere, no shield, no vertical wall"
    )


def build_runtime_vfx_prompt(
    skill: SkillSpec,
    usage: str,
    render_mode: str,
    transparent_background: bool = True,
) -> str:
    background_instruction = (
        "transparent background, real alpha transparency, transparent PNG with real alpha channel, PNG with alpha if supported"
        if transparent_background
        else "black background fallback for additive blending"
    )
    usage_detail = USAGE_DETAILS.get(usage, "single isolated visual effect element")
    usage_negative = USAGE_NEGATIVE_DETAILS.get(usage, "")
    texture_prompt = build_vfx_texture_prompt(
        resource_type=usage,
        skill_name=skill.name,
        element=skill.vfx.theme,
        keywords=[
            skill.vfx.color,
            skill.vfx.shape,
            skill.vfx.impact,
            skill.vfx.trail,
            f"{render_mode} render target",
        ],
    )

    return (
        f"isolated game VFX texture asset for runtime Playtest rendering, "
        f"{texture_prompt}, "
        f"{background_instruction}, single effect element, centered composition, "
        f"clean alpha edges, additive blending style, no character, no environment, "
        f"no text, no logo, no watermark, do not draw checkerboard background, "
        f"no transparency preview pattern, no white background, no gray background, "
        f"no colored square background, no rectangular tile background, skill slot {skill.slot}, "
        f"skill name {skill.name}, skill type {skill.type}, usage {usage}, "
        f"render mode {render_mode}, {usage_detail}, "
        f"{usage_negative}, "
        f"{skill.vfx.theme} theme, primary color {skill.vfx.color}, "
        f"shape language {skill.vfx.shape}, impact style {skill.vfx.impact}, "
        f"trail style {skill.vfx.trail}"
    )
