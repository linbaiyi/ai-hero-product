import type { SkillSpec } from "../../specs/playableSpecTypes";
import type { GameEvent, GameState, Vec2 } from "../types";
import { applyDamageToEnemiesInRadius } from "../damage";
import { addVec2, normalizeVec2, scaleVec2, subVec2 } from "../vector";
import { clampPositionToBounds } from "../world";

export function castDashSkill(
  state: GameState,
  skill: SkillSpec,
  target: Vec2,
): GameEvent[] {
  const from = { ...state.hero.position };
  const direction = normalizeVec2(subVec2(target, state.hero.position));
  const distance = skill.distance ?? 0;
  const unclampedTarget = addVec2(state.hero.position, scaleVec2(direction, distance));
  const to = clampPositionToBounds(unclampedTarget, state.world);
  state.hero.position = to;

  const events: GameEvent[] = [{ type: "dash", skill_slot: skill.slot, from, to }];
  if (skill.damage !== undefined) {
    const damageEvents = applyDamageToEnemiesInRadius(
      state.enemies,
      to,
      skill.radius ?? 1.5,
      skill.damage,
    );
    for (const event of damageEvents) {
      events.push({
        type: "damage",
        enemy_id: event.enemy_id,
        amount: event.amount,
        remaining_hp: event.remaining_hp,
      });
    }
  }

  return events;
}
