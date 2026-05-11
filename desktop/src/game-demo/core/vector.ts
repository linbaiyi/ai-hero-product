import type { Vec2, WorldBounds } from "./types";

export function vec2(x: number, z: number): Vec2 {
  return { x, z };
}

export function addVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x + right.x, z: left.z + right.z };
}

export function subVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x - right.x, z: left.z - right.z };
}

export function scaleVec2(value: Vec2, scale: number): Vec2 {
  return { x: value.x * scale, z: value.z * scale };
}

export function lengthVec2(value: Vec2): number {
  return Math.hypot(value.x, value.z);
}

export function normalizeVec2(value: Vec2): Vec2 {
  const length = lengthVec2(value);
  if (length === 0) {
    return { x: 0, z: 0 };
  }
  return { x: value.x / length, z: value.z / length };
}

export function distanceVec2(left: Vec2, right: Vec2): number {
  return lengthVec2(subVec2(left, right));
}

export function clampVec2ToBounds(position: Vec2, bounds: WorldBounds): Vec2 {
  return {
    x: Math.min(bounds.max_x, Math.max(bounds.min_x, position.x)),
    z: Math.min(bounds.max_z, Math.max(bounds.min_z, position.z)),
  };
}
