import type { SkillSlot, SkillStatusEffectSpec } from "../specs/playableSpecTypes";
import { applyDamageToEnemy } from "./damage";
import type { EnemyState, GameEvent } from "./types";

const DEFAULT_TICK_INTERVAL = 1;

export function applyStatusEffectsToEnemy(
  enemy: EnemyState,
  effects: SkillStatusEffectSpec[] | undefined,
  sourceSkillSlot: SkillSlot,
): GameEvent[] {
  if (!enemy.is_alive || !effects?.length) {
    return [];
  }

  const events: GameEvent[] = [];
  for (const effect of effects) {
    const tickInterval = effect.tick_interval ?? DEFAULT_TICK_INTERVAL;
    const existing = enemy.status_effects.find(
      (item) => item.type === effect.type && item.source_skill_slot === sourceSkillSlot,
    );

    if (existing) {
      existing.duration_remaining = Math.max(existing.duration_remaining, effect.duration);
      existing.tick_interval = tickInterval;
      existing.tick_timer = Math.min(existing.tick_timer, tickInterval);
      existing.damage = effect.damage ?? existing.damage;
      existing.value = effect.value ?? existing.value;
    } else {
      enemy.status_effects.push({
        id: `${enemy.id}_${sourceSkillSlot}_${effect.type}`,
        type: effect.type,
        source_skill_slot: sourceSkillSlot,
        duration_remaining: effect.duration,
        tick_interval: tickInterval,
        tick_timer: tickInterval,
        damage: effect.damage ?? 0,
        value: effect.value ?? 0,
      });
    }

    events.push({
      type: "status_applied",
      enemy_id: enemy.id,
      status_type: effect.type,
      skill_slot: sourceSkillSlot,
    });
  }
  return events;
}

export function updateEnemyStatusEffects(
  enemies: EnemyState[],
  delta_time: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  const delta = Math.max(0, delta_time);

  for (const enemy of enemies) {
    if (!enemy.is_alive) {
      enemy.status_effects = [];
      continue;
    }

    for (const effect of enemy.status_effects) {
      effect.duration_remaining = Math.max(0, effect.duration_remaining - delta);
      effect.tick_timer -= delta;

      while (
        enemy.is_alive &&
        effect.damage > 0 &&
        effect.tick_interval > 0 &&
        effect.tick_timer <= 0 &&
        effect.duration_remaining >= 0
      ) {
        const damageEvent = applyDamageToEnemy(enemy, effect.damage);
        if (damageEvent) {
          events.push({
            type: "status_tick",
            enemy_id: enemy.id,
            status_type: effect.type,
            amount: damageEvent.amount,
            remaining_hp: damageEvent.remaining_hp,
          });
        }
        effect.tick_timer += effect.tick_interval;
      }

      if (effect.duration_remaining <= 0) {
        events.push({
          type: "status_expired",
          enemy_id: enemy.id,
          status_type: effect.type,
        });
      }
    }

    enemy.status_effects = enemy.status_effects.filter(
      (effect) => effect.duration_remaining > 0 && enemy.is_alive,
    );
  }

  return events;
}
