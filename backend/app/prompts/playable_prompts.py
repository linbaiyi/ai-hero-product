import json
from typing import Any


def build_playable_spec_prompt(
    hero_design: Any,
    style: str = "3d_training_demo",
    complexity: str = "mvp",
) -> str:
    hero_design_text = json.dumps(hero_design, ensure_ascii=False, indent=2)

    return f"""You are converting a generated game hero design into a safe playable demo JSON config.

Output JSON only. Do not output Markdown. Do not output code fences.

Target schema: HeroPlayableSpec v1.
Style: {style}
Complexity: {complexity}

Input hero design:
{hero_design_text}

Hard requirements:
1. version must be "1.0".
2. skills must contain exactly four skills with slots Q, W, E, R.
3. skill type must be one of: projectile, aoe, aoe_dot, dash, buff.
4. runtime must be:
   control_scheme: "wasd_mouse"
   camera: "third_person_follow"
   map_profile: "default_training_arena"
5. resource_type must be one of: mana, energy, rage, none.
6. vfx.theme must be one of: fire, ice, thunder, poison, dark, holy, arcane, wind, earth.
7. vfx.shape must be one of: fireball, beam, circle_zone, meteor, slash, trail, shield, burst, wave, rune.
8. vfx.color must be a strict #RRGGBB hex string, for example "#ff5a1f". Do not append explanations.
9. Do not include scripts, functions, eval, code strings, or arbitrary executable behavior.
10. Keep numbers reasonable for a short fixed 3D training arena demo:
    max_hp 500-2000, move_speed 3-9, attack_damage 0-120, attack_range 0-10,
    cooldown 0-60, resource_cost 0-100, damage 0-400, range 0-20,
    radius 0-8, speed 0-30, duration 0-10, tick_interval 0.25-3, distance 0-10.

Skill required fields:
- projectile: damage, range, radius, speed
- aoe: damage, radius
- aoe_dot: damage, radius, duration, tick_interval
- dash: distance
- buff: duration

Return only one JSON object matching HeroPlayableSpec v1."""
