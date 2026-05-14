import type { EnemyStatusEffectState } from "./types";

export type StatusEffectRuntimeRule = {
  label: string;
  icon: string;
  color: string;
  damage_taken_bonus: number;
  movement_multiplier: number;
  action_blocked: boolean;
  tick_damage_multiplier: number;
};

const STATUS_RULES: Record<string, StatusEffectRuntimeRule> = {
  burn: {
    label: "灼烧",
    icon: "🔥",
    color: "#ff5a1f",
    damage_taken_bonus: 0,
    movement_multiplier: 1,
    action_blocked: false,
    tick_damage_multiplier: 1,
  },
  poison: {
    label: "中毒",
    icon: "☣",
    color: "#84cc16",
    damage_taken_bonus: 0,
    movement_multiplier: 1,
    action_blocked: false,
    tick_damage_multiplier: 0.8,
  },
  slow: {
    label: "减速",
    icon: "❄",
    color: "#7ddcff",
    damage_taken_bonus: 0,
    movement_multiplier: 0.65,
    action_blocked: false,
    tick_damage_multiplier: 0,
  },
  mark: {
    label: "易伤",
    icon: "◇",
    color: "#facc15",
    damage_taken_bonus: 0.25,
    movement_multiplier: 1,
    action_blocked: false,
    tick_damage_multiplier: 0,
  },
  stun: {
    label: "眩晕",
    icon: "✦",
    color: "#e5e7eb",
    damage_taken_bonus: 0,
    movement_multiplier: 0,
    action_blocked: true,
    tick_damage_multiplier: 0,
  },
};

const FALLBACK_RULE: StatusEffectRuntimeRule = {
  label: "状态",
  icon: "•",
  color: "#e5e7eb",
  damage_taken_bonus: 0,
  movement_multiplier: 1,
  action_blocked: false,
  tick_damage_multiplier: 1,
};

export function getStatusEffectRule(type: string): StatusEffectRuntimeRule {
  return STATUS_RULES[type] ?? FALLBACK_RULE;
}

export function getStatusEffectLabel(type: string): string {
  return getStatusEffectRule(type).label;
}

export function getStatusEffectColor(type: string): string {
  return getStatusEffectRule(type).color;
}

export function getStatusDamageTakenMultiplier(
  effects: EnemyStatusEffectState[],
): number {
  const bonus = effects
    .filter((effect) => effect.duration_remaining > 0)
    .reduce((maxBonus, effect) => {
      const ruleBonus = getStatusEffectRule(effect.type).damage_taken_bonus;
      const explicitBonus = effect.type === "mark" ? effect.value || ruleBonus : ruleBonus;
      return Math.max(maxBonus, explicitBonus);
    }, 0);
  return 1 + Math.max(0, Math.min(bonus, 2));
}

export function getStatusMovementMultiplier(
  effects: EnemyStatusEffectState[],
): number {
  return effects
    .filter((effect) => effect.duration_remaining > 0)
    .reduce(
      (multiplier, effect) =>
        Math.min(multiplier, getStatusEffectRule(effect.type).movement_multiplier),
      1,
    );
}

export function isActionBlockedByStatus(effects: EnemyStatusEffectState[]): boolean {
  return effects.some(
    (effect) =>
      effect.duration_remaining > 0 && getStatusEffectRule(effect.type).action_blocked,
  );
}

export function getStatusTickDamage(effect: EnemyStatusEffectState): number {
  return Math.max(0, effect.damage * getStatusEffectRule(effect.type).tick_damage_multiplier);
}
