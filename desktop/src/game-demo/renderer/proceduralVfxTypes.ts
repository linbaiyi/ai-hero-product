import type * as THREE from "three";

export type ProceduralVfxKind =
  | "shockwave"
  | "glow_disc"
  | "particle_burst"
  | "particle_trail"
  | "light_flash"
  | "rotating_ring"
  | "upward_sparks";

export type ProceduralVfxFollowTarget = "hero" | "projectile" | "zone" | "summon";

export type ProceduralVfxInstance = {
  id: string;
  kind: ProceduralVfxKind;
  object3d: THREE.Object3D;
  age: number;
  duration: number;
  opacity: number;
  base_scale: number;
  light_intensity?: number;
  rotation_speed: number;
  source_id?: string;
  follow_target?: ProceduralVfxFollowTarget;
  persistent?: boolean;
  velocities?: Float32Array;
  initial_positions?: Float32Array;
};

export type ProceduralVfxOptions = {
  id?: string;
  color?: THREE.ColorRepresentation;
  opacity?: number;
  duration?: number;
  scale?: number;
  rotation_speed?: number;
  particle_count?: number;
  radius?: number;
  spread_radius?: number;
  particle_size?: number;
  light_intensity?: number;
  light_distance?: number;
  source_id?: string;
  follow_target?: ProceduralVfxFollowTarget;
  persistent?: boolean;
};
