import type { SkillSpec } from "../../specs/playableSpecTypes";
import type { GameEvent, GameState, Vec2 } from "../types";
import { applyDamageToEnemiesInRadius } from "../damage";
import { findEnemiesInRadius } from "../collision";
import { applyStatusEffectsToEnemy } from "../statusEffects";

export function castAoeSkill(
  state: GameState,
  skill: SkillSpec,
  target: Vec2,
): GameEvent[] {
  const events = applyDamageToEnemiesInRadius(
    state.enemies,
    target,
    skill.radius ?? 0,
    skill.damage ?? 0,
  ).map((event): GameEvent => ({
    type: "damage",
    enemy_id: event.enemy_id,
    amount: event.amount,
    remaining_hp: event.remaining_hp,
  }));

  for (const enemy of findEnemiesInRadius(state.enemies, target, skill.radius ?? 0)) {
    events.push(...applyStatusEffectsToEnemy(enemy, skill.status_effects, skill.slot));
  }

  return events;
}
