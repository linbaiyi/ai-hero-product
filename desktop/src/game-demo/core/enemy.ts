import type { EnemyState, Vec2 } from "./types";

export type CreateEnemyParams = {
  id: string;
  name?: string;
  position: Vec2;
  max_hp?: number;
  hp?: number;
  radius?: number;
};

export function createEnemy(params: CreateEnemyParams): EnemyState {
  const max_hp = params.max_hp ?? 100;
  const hp = Math.max(0, Math.min(max_hp, params.hp ?? max_hp));

  return {
    id: params.id,
    name: params.name ?? params.id,
    position: params.position,
    max_hp,
    hp,
    radius: params.radius ?? 0.75,
    is_alive: hp > 0,
  };
}

export function isEnemyAlive(enemy: EnemyState): boolean {
  return enemy.is_alive && enemy.hp > 0;
}

export function damageEnemy(enemy: EnemyState, amount: number): EnemyState {
  if (!isEnemyAlive(enemy)) {
    return enemy;
  }
  enemy.hp = Math.max(0, enemy.hp - Math.max(0, amount));
  if (enemy.hp <= 0) {
    enemy.is_alive = false;
  }
  return enemy;
}

export function killEnemy(enemy: EnemyState): EnemyState {
  enemy.hp = 0;
  enemy.is_alive = false;
  return enemy;
}
