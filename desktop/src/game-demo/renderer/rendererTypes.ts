import * as THREE from "three";
import type { ProceduralVfxInstance } from "./proceduralVfxTypes";
import type { RuntimeVfxInstance } from "./vfxInstanceTypes";

export type GameSceneHandles = {
  hero?: THREE.Object3D;
  enemies: Map<string, THREE.Object3D>;
  obstacles: Map<string, THREE.Object3D>;
  projectiles: Map<string, THREE.Object3D>;
  zones: Map<string, THREE.Object3D>;
  summons: Map<string, THREE.Object3D>;
  texture_vfx?: TextureVfxHandles;
  range_debug?: RangeDebugHandles;
};

export type TextureVfxHandles = {
  projectiles: Map<string, THREE.Object3D>;
  zones: Map<string, THREE.Object3D>;
  buffs: Map<string, THREE.Object3D>;
  summon_bodies: Map<string, THREE.Object3D>;
  summon_auras: Map<string, THREE.Object3D>;
  trails: Map<string, THREE.Object3D>;
  impacts: Map<string, THREE.Object3D>;
  instances: Map<string, RuntimeVfxInstance>;
  procedural_instances: Map<string, ProceduralVfxInstance>;
  processed_events: Set<string>;
  last_trail_spawn_time: Map<string, number>;
  projectile_slots: Map<string, string>;
  projectile_radii: Map<string, number>;
  projectile_last_positions: Map<string, { x: number; z: number }>;
  last_update_time: number | null;
  warnings: string[];
};

export type RangeDebugHandles = {
  group: THREE.Group;
  objects: Map<string, THREE.Object3D>;
};

export type RenderedGameScene = {
  scene: THREE.Scene;
  root: THREE.Group;
  map_group: THREE.Group;
  entity_group: THREE.Group;
  vfx_group: THREE.Group;
  camera?: THREE.PerspectiveCamera;
  handles: GameSceneHandles;
};

export type RendererOptions = {
  background_color?: THREE.ColorRepresentation;
};

export type RenderedEntityHandles = GameSceneHandles;
