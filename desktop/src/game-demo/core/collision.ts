import type { EnemyState, Vec2 } from "./types";
import { isEnemyAlive } from "./enemy";
import { distanceVec2 } from "./vector";

export function isCircleHit(
  pointA: Vec2,
  radiusA: number,
  pointB: Vec2,
  radiusB: number,
): boolean {
  return distanceVec2(pointA, pointB) <= radiusA + radiusB;
}

export function findEnemiesInRadius(
  enemies: EnemyState[],
  center: Vec2,
  radius: number,
): EnemyState[] {
  return enemies.filter(
    (enemy) => isEnemyAlive(enemy) && isCircleHit(center, radius, enemy.position, enemy.radius),
  );
}
