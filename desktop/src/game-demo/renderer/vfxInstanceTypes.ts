import type * as THREE from "three";
import type { RuntimeVfxSlot, RuntimeVfxUsage } from "../vfx-assets";

export type RuntimeVfxInstanceKind =
  | "projectile"
  | "trail"
  | "impact"
  | "ground_decal"
  | "aura"
  | "summon_body";

export type RuntimeVfxFollowTarget = "hero" | "projectile" | "zone" | "summon";

export type RuntimeVfxInstance = {
  id: string;
  kind: RuntimeVfxInstanceKind;
  slot: RuntimeVfxSlot;
  usage: RuntimeVfxUsage;
  object3d: THREE.Object3D;
  age: number;
  duration: number;
  base_scale: number;
  base_scale_x?: number;
  base_scale_y?: number;
  base_scale_z?: number;
  base_opacity: number;
  rotation_speed: number;
  source_id?: string;
  follow_target?: RuntimeVfxFollowTarget;
  persistent?: boolean;
};
