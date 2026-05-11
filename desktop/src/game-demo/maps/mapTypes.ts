import type { Vec2 } from "../core/types";

export type MapEnemyType = "dummy" | "melee" | "ranged";
export type MapEnemyBehavior = "static" | "chase" | "patrol";

export type MapEnemyConfig = {
  id: string;
  name: string;
  type: MapEnemyType;
  position: Vec2;
  max_hp: number;
  radius: number;
  behavior: MapEnemyBehavior;
};

export type MapObstacleConfig = {
  id: string;
  position: Vec2;
  width: number;
  depth: number;
  height?: number;
};

export type TrainingMapConfig = {
  id: string;
  name: string;
  width: number;
  depth: number;
  hero_spawn: Vec2;
  enemies: MapEnemyConfig[];
  obstacles: MapObstacleConfig[];
};

export type MapValidationResult =
  | { success: true; errors: [] }
  | { success: false; errors: string[] };

export type MapSpawnOptions = {
  override_hero_spawn?: Vec2;
  include_enemies?: boolean;
};
