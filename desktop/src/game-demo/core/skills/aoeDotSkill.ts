import type { SkillSpec } from "../../specs/playableSpecTypes";
import type { GameEvent, GameState, Vec2, ZoneState } from "../types";
import { applyDamageToEnemiesInRadius } from "../damage";

export function castAoeDotSkill(
  state: GameState,
  skill: SkillSpec,
  target: Vec2,
): GameEvent[] {
  const zone: ZoneState = {
    id: createZoneId(state),
    skill_slot: skill.slot,
    center: { ...target },
    radius: skill.radius ?? 0,
    damage: skill.damage ?? 0,
    duration_remaining: skill.duration ?? 0,
    tick_interval: skill.tick_interval ?? 1,
    tick_timer: skill.tick_interval ?? 1,
    is_alive: true,
  };

  state.active_zones.push(zone);
  return [{ type: "zone_spawned", zone_id: zone.id, skill_slot: skill.slot }];
}

export function updateAoeDotZones(state: GameState, delta_time: number): GameEvent[] {
  const events: GameEvent[] = [];
  const delta = Math.max(0, delta_time);

  for (const zone of state.active_zones) {
    if (!zone.is_alive) {
      continue;
    }

    zone.duration_remaining = Math.max(0, zone.duration_remaining - delta);
    zone.tick_timer -= delta;

    while (zone.is_alive && zone.tick_timer <= 0 && zone.duration_remaining >= 0) {
      const damageEvents = applyDamageToEnemiesInRadius(
        state.enemies,
        zone.center,
        zone.radius,
        zone.damage,
      );
      const hitEnemyIds = damageEvents.map((event) => event.enemy_id);
      for (const event of damageEvents) {
        events.push({
          type: "damage",
          enemy_id: event.enemy_id,
          amount: event.amount,
          remaining_hp: event.remaining_hp,
        });
      }
      events.push({ type: "zone_tick", zone_id: zone.id, hit_enemy_ids: hitEnemyIds });
      zone.tick_timer += zone.tick_interval;

      if (zone.tick_interval <= 0) {
        break;
      }
    }

    if (zone.duration_remaining <= 0) {
      zone.is_alive = false;
    }
  }

  state.active_zones = state.active_zones.filter((zone) => zone.is_alive);
  state.events.push(...events);
  return events;
}

function createZoneId(state: GameState): string {
  return `zone_${state.time}_${state.active_zones.length + 1}`;
}
