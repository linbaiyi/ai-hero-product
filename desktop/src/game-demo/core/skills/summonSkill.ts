import type { SkillSpec } from "../../specs/playableSpecTypes";
import { clampPositionToBounds } from "../world";
import { applyDamageToEnemy } from "../damage";
import { distanceVec2 } from "../vector";
import { applyStatusEffectsToEnemy } from "../statusEffects";
import { isActionBlockedByStatus } from "../statusRules";
import type { GameEvent, GameState, SummonState, Vec2 } from "../types";

const DEFAULT_SUMMON_HP = 120;
const DEFAULT_SUMMON_RADIUS = 0.55;
const DEFAULT_SUMMON_DAMAGE = 12;
const DEFAULT_SUMMON_ATTACK_RANGE = 7;
const DEFAULT_SUMMON_ATTACK_INTERVAL = 1;

export function castSummonSkill(
  state: GameState,
  skill: SkillSpec,
  target: Vec2,
): GameEvent[] {
  const position = clampPositionToBounds(target, state.world);
  const summon: SummonState = {
    id: `summon_${skill.slot}_${Math.round(state.time * 1000)}_${state.summons.length}`,
    skill_slot: skill.slot,
    name: skill.name,
    position,
    max_hp: DEFAULT_SUMMON_HP,
    hp: DEFAULT_SUMMON_HP,
    radius: skill.radius ?? DEFAULT_SUMMON_RADIUS,
    damage: skill.damage ?? DEFAULT_SUMMON_DAMAGE,
    attack_range: skill.range ?? DEFAULT_SUMMON_ATTACK_RANGE,
    attack_interval: skill.tick_interval ?? DEFAULT_SUMMON_ATTACK_INTERVAL,
    attack_timer: 0,
    duration_remaining: skill.duration ?? 0,
    status_effects: skill.status_effects ?? [],
    is_alive: true,
  };

  state.summons.push(summon);
  return [{ type: "summon_spawned", summon_id: summon.id, skill_slot: skill.slot }];
}

export function updateSummons(state: GameState, delta_time: number): void {
  for (const summon of state.summons) {
    if (!summon.is_alive) {
      continue;
    }

    summon.duration_remaining = Math.max(0, summon.duration_remaining - delta_time);
    if (summon.duration_remaining <= 0 || summon.hp <= 0) {
      summon.is_alive = false;
      state.events.push({
        type: "summon_expired",
        summon_id: summon.id,
        skill_slot: summon.skill_slot,
      });
      continue;
    }

    summon.attack_timer -= delta_time;
    if (summon.attack_timer <= 0) {
      attackNearestEnemy(state, summon);
      summon.attack_timer = summon.attack_interval;
    }
  }

  state.summons = state.summons.filter((summon) => summon.is_alive);
}

function attackNearestEnemy(state: GameState, summon: SummonState): void {
  const target = state.enemies
    .filter((enemy) => enemy.is_alive)
    .map((enemy) => ({
      enemy,
      distance: distanceVec2(summon.position, enemy.position),
    }))
    .filter(({ distance }) => distance <= summon.attack_range)
    .sort((a, b) => a.distance - b.distance)[0]?.enemy;

  if (!target) {
    return;
  }
  if (isActionBlockedByStatus(target.status_effects)) {
    return;
  }

  applyDamageToEnemy(target, summon.damage);
  state.events.push(
    ...applyStatusEffectsToEnemy(target, summon.status_effects, summon.skill_slot),
  );
  state.events.push({
    type: "summon_attack",
    summon_id: summon.id,
    enemy_id: target.id,
    amount: summon.damage,
    remaining_hp: target.hp,
  });
}
