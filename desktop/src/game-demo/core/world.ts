import type { Vec2, WorldBounds } from "./types";
import { clampVec2ToBounds } from "./vector";

export function createWorldBounds(width: number, depth: number): WorldBounds {
  return {
    min_x: -width / 2,
    max_x: width / 2,
    min_z: -depth / 2,
    max_z: depth / 2,
  };
}

export function isInsideBounds(position: Vec2, bounds: WorldBounds): boolean {
  return (
    position.x >= bounds.min_x &&
    position.x <= bounds.max_x &&
    position.z >= bounds.min_z &&
    position.z <= bounds.max_z
  );
}

export function clampPositionToBounds(position: Vec2, bounds: WorldBounds): Vec2 {
  return clampVec2ToBounds(position, bounds);
}
