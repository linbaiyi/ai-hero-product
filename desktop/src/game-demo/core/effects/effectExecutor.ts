import type {
  SkillEffectAction,
  SkillEffectSpec,
  SkillEffectTrigger,
  SkillSpec,
} from "../../specs/playableSpecTypes";
import { applyDamageToEnemy, applyDamageToEnemiesInRadius } from "../damage";
import { findEnemiesInRadius } from "../collision";
import { applyStatusEffectsToEnemy } from "../statusEffects";
import type {
  GameEvent,
  GameState,
  ProjectileState,
  SummonState,
  Vec2,
  ZoneState,
} from "../types";
import { addVec2, normalizeVec2, scaleVec2, subVec2 } from "../vector";
import { clampPositionToBounds } from "../world";
import type { SkillEffectContext } from "./effectTypes";
import { getSkillEffects } from "./effectTriggers";

const DEFAULT_SUMMON_HP = 120;
const DEFAULT_SUMMON_RADIUS = 0.55;
const DEFAULT_SUMMON_DAMAGE = 12;
const DEFAULT_SUMMON_ATTACK_RANGE = 7;
const DEFAULT_SUMMON_ATTACK_INTERVAL = 1;

export function executeSkillEffects(
  state: GameState,
  skill: SkillSpec,
  effects: SkillEffectSpec[],
  trigger: SkillEffectTrigger,
  context: SkillEffectContext,
): GameEvent[] {
  const events: GameEvent[] = [];
  for (const effect of effects) {
    if (effect.trigger !== trigger) {
      continue;
    }
    events.push(...executeSkillEffect(state, skill, effect, context));
  }
  return events;
}

export function executeSkillEffect(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  switch (effect.action) {
    case "damage":
      return executeDamage(state, skill, effect, context);
    case "aoe_damage":
      return executeAoeDamage(state, skill, effect, context);
    case "apply_status":
      return executeApplyStatus(state, skill, effect, context);
    case "spawn_zone":
      return executeSpawnZone(state, skill, effect, context);
    case "summon":
      return executeSummon(state, skill, effect, context);
    case "spawn_projectile":
      return executeSpawnProjectile(state, skill, effect, context);
    case "spawn_vfx_event":
      return executeSpawnVfxEvent(state, skill, effect, context);
  }
}

function executeDamage(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const enemy = resolveEnemyTarget(state, effect, context);
  if (!enemy) {
    return [];
  }
  const damageEvent = applyDamageToEnemy(enemy, effect.damage ?? skill.damage ?? 0);
  return damageEvent
    ? [
        {
          type: "damage",
          enemy_id: damageEvent.enemy_id,
          amount: damageEvent.amount,
          remaining_hp: damageEvent.remaining_hp,
        },
      ]
    : [];
}

function executeAoeDamage(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const center = resolvePositionTarget(state, effect, context);
  if (!center) {
    return [];
  }
  return applyDamageToEnemiesInRadius(
    state.enemies,
    center,
    effect.radius ?? skill.radius ?? 0,
    effect.damage ?? skill.damage ?? 0,
  ).map((event) => ({
    type: "damage",
    enemy_id: event.enemy_id,
    amount: event.amount,
    remaining_hp: event.remaining_hp,
  }));
}

function executeApplyStatus(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const statusEffects = effect.status_effects ?? skill.status_effects ?? [];
  if (statusEffects.length === 0) {
    return [];
  }

  if (effect.target === "target_enemy") {
    const enemy = resolveEnemyTarget(state, effect, context);
    return enemy ? applyStatusEffectsToEnemy(enemy, statusEffects, skill.slot) : [];
  }

  const center = resolvePositionTarget(state, effect, context);
  if (!center) {
    return [];
  }
  return findEnemiesInRadius(state.enemies, center, effect.radius ?? skill.radius ?? 0).flatMap(
    (enemy) => applyStatusEffectsToEnemy(enemy, statusEffects, skill.slot),
  );
}

function executeSpawnZone(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const center = resolvePositionTarget(state, effect, context);
  if (!center) {
    return [];
  }
  const zone: ZoneState = {
    id: `zone_${state.time}_${state.active_zones.length + 1}`,
    skill_slot: skill.slot,
    center: { ...center },
    radius: effect.radius ?? skill.radius ?? 0,
    damage: effect.damage ?? skill.damage ?? 0,
    duration_remaining: effect.duration ?? skill.duration ?? 0,
    tick_interval: effect.tick_interval ?? skill.tick_interval ?? 1,
    tick_timer: effect.tick_interval ?? skill.tick_interval ?? 1,
    status_effects: effect.status_effects ?? skill.status_effects ?? [],
    effects: getSkillEffects(skill),
    is_alive: true,
  };
  state.active_zones.push(zone);
  return [{ type: "zone_spawned", zone_id: zone.id, skill_slot: skill.slot }];
}

function executeSummon(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const target = resolvePositionTarget(state, effect, context);
  if (!target) {
    return [];
  }
  const summon: SummonState = {
    id: `summon_${skill.slot}_${Math.round(state.time * 1000)}_${state.summons.length}`,
    skill_slot: skill.slot,
    name: skill.name,
    position: clampPositionToBounds(target, state.world),
    max_hp: DEFAULT_SUMMON_HP,
    hp: DEFAULT_SUMMON_HP,
    radius: skill.radius ?? DEFAULT_SUMMON_RADIUS,
    damage: skill.damage ?? DEFAULT_SUMMON_DAMAGE,
    attack_range: skill.range ?? DEFAULT_SUMMON_ATTACK_RANGE,
    attack_interval: skill.tick_interval ?? DEFAULT_SUMMON_ATTACK_INTERVAL,
    attack_timer: 0,
    duration_remaining: effect.duration ?? skill.duration ?? 0,
    status_effects: skill.status_effects ?? [],
    effects: getSkillEffects(skill),
    is_alive: true,
  };
  state.summons.push(summon);
  return [{ type: "summon_spawned", summon_id: summon.id, skill_slot: skill.slot }];
}

function executeSpawnProjectile(
  state: GameState,
  skill: SkillSpec,
  _effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const target = context.target_position;
  if (!target) {
    return [];
  }
  const direction = normalizeVec2(subVec2(target, state.hero.position));
  const projectile: ProjectileState = {
    id: `projectile_${state.time}_${state.projectiles.length + 1}`,
    skill_slot: skill.slot,
    position: { ...state.hero.position },
    direction,
    speed: skill.speed ?? 0,
    radius: skill.radius ?? 0,
    damage: skill.damage ?? 0,
    remaining_range: skill.range ?? 0,
    status_effects: skill.status_effects ?? [],
    effects: getSkillEffects(skill),
    is_alive: true,
  };
  if (projectile.remaining_range <= 0) {
    projectile.position = addVec2(projectile.position, scaleVec2(direction, 0));
  }
  state.projectiles.push(projectile);
  return [
    {
      type: "projectile_spawned",
      projectile_id: projectile.id,
      skill_slot: skill.slot,
    },
  ];
}

function executeSpawnVfxEvent(
  state: GameState,
  skill: SkillSpec,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): GameEvent[] {
  const position = resolvePositionTarget(state, effect, context);
  if (!position) {
    return [];
  }
  return [
    {
      type: "vfx_event",
      skill_slot: skill.slot,
      usage: inferVfxEventUsage(effect),
      position: { ...position },
      radius: effect.radius ?? skill.radius,
      source_trigger: effect.trigger,
    },
  ];
}

function inferVfxEventUsage(effect: SkillEffectSpec): string {
  if (effect.status_effects && effect.status_effects.length > 0) {
    return "status_loop";
  }
  if (effect.trigger === "on_projectile_hit" || effect.target === "target_enemy") {
    return "hit_flash";
  }
  return "impact";
}

function resolveEnemyTarget(
  _state: GameState,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
) {
  if (effect.target === "target_enemy") {
    return context.target_enemy;
  }
  return undefined;
}

function resolvePositionTarget(
  state: GameState,
  effect: SkillEffectSpec,
  context: SkillEffectContext,
): Vec2 | undefined {
  switch (effect.target) {
    case "self":
      return state.hero.position;
    case "target_position":
      return context.target_position;
    case "projectile_position":
      return context.effect_position;
    case "summon_position":
      return context.summon?.position ?? context.effect_position;
    case "zone_center":
      return context.zone?.center ?? context.effect_position;
    case "enemies_in_radius":
      return context.effect_position ?? context.target_position ?? context.summon?.position;
    case "target_enemy":
      return context.target_enemy?.position;
  }
}
