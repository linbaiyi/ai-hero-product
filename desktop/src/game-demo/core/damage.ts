import type { DamageEvent, EnemyState, Vec2 } from "./types";
import { damageEnemy, isEnemyAlive } from "./enemy";
import { findEnemiesInRadius } from "./collision";

export function applyDamageToEnemy(
  enemy: EnemyState,
  amount: number,
): DamageEvent | null {
  if (!isEnemyAlive(enemy)) {
    return null;
  }
  damageEnemy(enemy, amount);
  return {
    enemy_id: enemy.id,
    amount: Math.max(0, amount),
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
