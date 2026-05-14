import type { DamageEvent, EnemyState, Vec2 } from "./types";
import { damageEnemy, isEnemyAlive } from "./enemy";
import { findEnemiesInRadius } from "./collision";
import { getStatusDamageTakenMultiplier } from "./statusRules";

export function applyDamageToEnemy(
  enemy: EnemyState,
  amount: number,
): DamageEvent | null {
  if (!isEnemyAlive(enemy)) {
    return null;
  }
  const finalAmount = amount * getDamageTakenMultiplier(enemy);
  damageEnemy(enemy, finalAmount);
  return {
    enemy_id: enemy.id,
    amount: Math.max(0, finalAmount),
    remaining_hp: enemy.hp,
    is_alive: enemy.is_alive,
  };
}

export function applyDamageToEnemiesInRadius(
  enemies: EnemyState[],
  center: Vec2,
  radius: number,
  amount: number,
): DamageEvent[] {
  return findEnemiesInRadius(enemies, center, radius)
    .map((enemy) => applyDamageToEnemy(enemy, amount))
    .filter((event): event is DamageEvent => Boolean(event));
}

function getDamageTakenMultiplier(enemy: EnemyState): number {
  return getStatusDamageTakenMultiplier(enemy.status_effects);
}
