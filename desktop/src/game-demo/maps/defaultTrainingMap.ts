import type {
  MapObstacleConfig,
  MapValidationResult,
  TrainingMapConfig,
} from "./mapTypes";
import type { Vec2, WorldBounds } from "../core/types";
import { createWorldBounds, isInsideBounds } from "../core/world";

export const defaultTrainingMap: TrainingMapConfig = {
  id: "default_training_arena",
  name: "默认英雄训练场",
  width: 40,
  depth: 40,
  hero_spawn: { x: 0, z: 0 },
  enemies: [
    {
      id: "dummy_1",
      name: "静态木桩 1",
      type: "dummy",
      position: { x: 8, z: 0 },
      max_hp: 500,
      radius: 0.8,
      behavior: "static",
    },
    {
      id: "dummy_2",
      name: "静态木桩 2",
      type: "dummy",
      position: { x: 12, z: 4 },
      max_hp: 500,
      radius: 0.8,
      behavior: "static",
    },
    {
      id: "dummy_3",
      name: "静态木桩 3",
      type: "dummy",
      position: { x: 12, z: -4 },
      max_hp: 500,
      radius: 0.8,
      behavior: "static",
    },
    {
      id: "melee_1",
      name: "近战测试怪",
      type: "melee",
      position: { x: -8, z: 5 },
      max_hp: 300,
      radius: 0.9,
      behavior: "static",
    },
    {
      id: "ranged_1",
      name: "远程测试怪",
      type: "ranged",
      position: { x: -10, z: -6 },
      max_hp: 250,
      radius: 0.8,
      behavior: "static",
    },
  ],
  obstacles: [
    {
      id: "box_1",
      position: { x: 4, z: 5 },
      width: 2,
      depth: 4,
      height: 1,
    },
    {
      id: "box_2",
      position: { x: -5, z: -4 },
      width: 4,
      depth: 2,
      height: 1,
    },
    {
      id: "box_3",
      position: { x: 0, z: 10 },
      width: 6,
      depth: 1.5,
      height: 1,
    },
  ],
};

export function validateTrainingMap(map: TrainingMapConfig): MapValidationResult {
  const errors: string[] = [];

  if (!map.id?.trim()) {
    errors.push("map.id must not be blank");
  }
  if (!map.name?.trim()) {
    errors.push("map.name must not be blank");
  }
  if (!Number.isFinite(map.width) || map.width <= 0) {
    errors.push("map.width must be greater than 0");
  }
  if (!Number.isFinite(map.depth) || map.depth <= 0) {
    errors.push("map.depth must be greater than 0");
  }
  if (!Array.isArray(map.enemies)) {
    errors.push("map.enemies must be an array");
  }
  if (!Array.isArray(map.obstacles)) {
    errors.push("map.obstacles must be an array");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const bounds = createWorldBounds(map.width, map.depth);
  if (!isInsideBounds(map.hero_spawn, bounds)) {
    errors.push("map.hero_spawn must be inside bounds");
  }

  validateEnemyIds(map, errors);
  validateObstacleIds(map, errors);
  validateEnemies(map, bounds, errors);
  validateObstacles(map, bounds, errors);

  return errors.length === 0 ? { success: true, errors: [] } : { success: false, errors };
}

function validateEnemyIds(map: TrainingMapConfig, errors: string[]) {
  const ids = new Set<string>();
  for (const enemy of map.enemies) {
    if (ids.has(enemy.id)) {
      errors.push(`duplicate enemy id: ${enemy.id}`);
    }
    ids.add(enemy.id);
  }
}

function validateObstacleIds(map: TrainingMapConfig, errors: string[]) {
  const ids = new Set<string>();
  for (const obstacle of map.obstacles) {
    if (ids.has(obstacle.id)) {
      errors.push(`duplicate obstacle id: ${obstacle.id}`);
    }
    ids.add(obstacle.id);
  }
}

function validateEnemies(
  map: TrainingMapConfig,
  bounds: WorldBounds,
  errors: string[],
) {
  for (const enemy of map.enemies) {
    if (!enemy.id?.trim()) {
      errors.push("enemy.id must not be blank");
    }
    if (!isInsideBounds(enemy.position, bounds)) {
      errors.push(`enemy ${enemy.id} must be inside bounds`);
    }
    if (!Number.isFinite(enemy.max_hp) || enemy.max_hp <= 0) {
      errors.push(`enemy ${enemy.id} max_hp must be greater than 0`);
    }
    if (!Number.isFinite(enemy.radius) || enemy.radius <= 0) {
      errors.push(`enemy ${enemy.id} radius must be greater than 0`);
    }
  }
}

function validateObstacles(
  map: TrainingMapConfig,
  bounds: WorldBounds,
  errors: string[],
) {
  for (const obstacle of map.obstacles) {
    if (!obstacle.id?.trim()) {
      errors.push("obstacle.id must not be blank");
    }
    if (!Number.isFinite(obstacle.width) || obstacle.width <= 0) {
      errors.push(`obstacle ${obstacle.id} width must be greater than 0`);
    }
    if (!Number.isFinite(obstacle.depth) || obstacle.depth <= 0) {
      errors.push(`obstacle ${obstacle.id} depth must be greater than 0`);
    }
    if (!isObstacleInsideBounds(obstacle, bounds)) {
      errors.push(`obstacle ${obstacle.id} must be inside bounds`);
    }
    if (isPointInsideObstacle(map.hero_spawn, obstacle)) {
      errors.push(`obstacle ${obstacle.id} must not cover hero_spawn`);
    }
  }
}

export function isObstacleInsideBounds(
  obstacle: MapObstacleConfig,
  bounds: WorldBounds,
): boolean {
  const halfWidth = obstacle.width / 2;
  const halfDepth = obstacle.depth / 2;
  return (
    obstacle.position.x - halfWidth >= bounds.min_x &&
    obstacle.position.x + halfWidth <= bounds.max_x &&
    obstacle.position.z - halfDepth >= bounds.min_z &&
    obstacle.position.z + halfDepth <= bounds.max_z
  );
}

export function isPointInsideObstacle(
  point: Vec2,
  obstacle: MapObstacleConfig,
): boolean {
  const halfWidth = obstacle.width / 2;
  const halfDepth = obstacle.depth / 2;
  return (
    point.x >= obstacle.position.x - halfWidth &&
    point.x <= obstacle.position.x + halfWidth &&
    point.z >= obstacle.position.z - halfDepth &&
    point.z <= obstacle.position.z + halfDepth
  );
}
