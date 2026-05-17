import json
from typing import Any


def build_playable_spec_prompt(
    hero_design: Any,
    style: str = "3d_training_demo",
    complexity: str = "mvp",
) -> str:
    hero_design_text = json.dumps(hero_design, ensure_ascii=False, indent=2)

    return f"""You are converting a generated game hero design into a safe playable demo JSON config.
Think like a Warcraft III ability designer first, then compile that design into this demo runtime.

Output JSON only. Do not output Markdown. Do not output code fences.

Target schema: HeroPlayableSpec v1.
Style: {style}
Complexity: {complexity}

Input hero design:
{hero_design_text}

Hard requirements:
1. version must be "1.0".
2. skills must contain exactly four skills with slots Q, W, E, R.
3. skill type must be one of: projectile, aoe, aoe_dot, dash, buff, summon.
   Use dash only when the hero itself moves/repositions. A wave, shockwave,
   flame surge, fire wall, path-burning area, or forward-moving area must not
   be dash; model it as projectile or aoe_dot with skill.effects.
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
11. If the design mentions burn, poison, slow, mark, stun, ignite, 燃烧, 灼烧, 点燃,
    中毒, 减速, 冰霜, 标记, 印记, 眩晕, 击晕, 定身,
    express that as status_effects on the relevant skill. Supported status_effects:
    burn, poison, slow, mark, stun.

War3 Ability Contract:
- Every skill should include ability_contract. This is the stable semantic contract
  between skill description, demo execution, and Runtime VFX.
- Treat ability_contract like a compact Warcraft III Object Editor + trigger design:
  base_order, cast_type, target filters, missile, area, buff/debuff, summon unit,
  art hooks, and unsupported notes.
- ability_contract.cast_type must be one of:
  instant, unit_target, point_target, area_target, self, passive, toggle, channel.
- ability_contract.primary_target must be one of:
  none, self, enemy_unit, ally_unit, point, area, summoned_unit.
- ability_contract.effect_kinds may use:
  damage, heal, buff, debuff, summon, missile, area_persistent, movement, vfx_only.
- ability_contract.levels should contain at least level 1 with cooldown,
  resource_cost, damage/area/duration when relevant, and notes describing the
  original design intent in plain text.
- ability_contract.art_bindings should map visual hooks to runtime events:
  cast -> on_cast/cast_flash, missile -> on_cast/projectile,
  impact -> on_projectile_hit/hit_flash, area -> on_cast/ground_decal,
  loop -> on_zone_tick/zone_tick, summon -> on_cast/summon_body,
  death -> on_summon_expire/summon_expire, buff -> on_status_tick/status_loop.
- If a War3 mechanic is too rich for the current runtime, keep the closest
  executable behavior in skill.effects and record the limitation in
  ability_contract.unsupported_notes. Do not drop the mechanic silently.

Semantic mapping rules:
- First map each skill description into a structured intent:
  status_effects, trigger, target, duration, damage_rule.
- trigger should be one of: on_hit, on_tick, on_cast, on_summon_attack, passive.
- target should be one of: enemy, enemies_in_radius, summon, hero, ground_zone.
- damage_rule should describe whether the effect is direct_damage, dot_damage,
  slow_only, mark_damage_taken_bonus, stun_only, or mixed.
  - The final JSON must still match HeroPlayableSpec v1. Encode executable parts
    in skill.status_effects using only: type, duration, tick_interval, damage, value.
  - For compound mechanics, use skill.effects rather than inventing new skill types.
  - Supported effects triggers: on_cast, on_projectile_hit, on_zone_tick,
    on_zone_expire, on_summon_attack, on_summon_expire, on_summon_death,
    on_status_tick, on_status_expire.
  - Supported effects actions: damage, aoe_damage, apply_status, spawn_zone,
    summon, spawn_projectile, spawn_vfx_event.
  - Supported effects targets: self, target_position, target_enemy,
    enemies_in_radius, projectile_position, summon_position, zone_center.
  - Example: "summon explodes when it disappears" should become an
    on_summon_expire + aoe_damage effect targeting summon_position.
  - Example: "projectile leaves a burning field on hit" should become an
    on_projectile_hit + spawn_zone effect targeting projectile_position.
  - If the original skill description or vfx.impact mentions hit feedback,
    explosion, burst, impact, shockwave, burning hit, 命中, 爆炸, 冲击,
    燃烧, 受击反馈, then also add an on_projectile_hit + spawn_vfx_event
    effect targeting projectile_position for projectile skills, or an
    equivalent spawn_vfx_event at the damage point for area/summon effects.
    This event is visual only and lets Runtime VFX generate hit_flash/impact/status_loop assets.
  - Example: "a flame wave surges forward and burns the path" should not be
    dash. Use projectile + on_projectile_hit spawn_zone/apply_status effects.
  - Example: "召唤火灵，消失时爆炸" should be summon with
    ability_contract.summon.enabled=true, on_cast summon, and
    on_summon_expire aoe_damage/spawn_vfx_event.
  - Example: "火焰波向前推进并在路径留下燃烧地面" should be projectile or aoe_dot,
    not dash, with missile/area_persistent in ability_contract.effect_kinds.
  - Use damage for burn/poison tick damage.
- Use value for slow movement reduction, mark damage taken bonus, and stun control strength.
- Do not invent unsupported scripts or custom behavior.

Skill required fields:
- projectile: damage, range, radius, speed
- aoe: damage, radius
- aoe_dot: damage, radius, duration, tick_interval
- dash: distance
- buff: duration
- summon: duration; optional damage, radius, range, tick_interval

Return only one JSON object matching HeroPlayableSpec v1."""
