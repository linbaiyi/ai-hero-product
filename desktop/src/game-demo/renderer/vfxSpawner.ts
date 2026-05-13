import * as THREE from "three";
import type {
  RuntimeVfxAssetEntry,
  RuntimeVfxSlot,
  RuntimeVfxUsage,
} from "../vfx-assets";
import type { RuntimeVfxInstance, RuntimeVfxInstanceKind } from "./vfxInstanceTypes";

export type RuntimeVfxScale =
  | number
  | {
      x: number;
      y: number;
      z?: number;
    };

export function createMaterialForRuntimeAsset(
  asset: RuntimeVfxAssetEntry,
  texture: THREE.Texture,
): THREE.SpriteMaterial | THREE.MeshBasicMaterial {
  const options = {
    map: texture,
    color: "#ffffff",
    transparent: true,
    opacity: asset.opacity ?? 1,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.03,
    blending: getThreeBlendingMode(asset.blend_mode),
  };

  if (asset.render_mode === "ground_plane" || asset.render_mode === "aura_ring") {
    return new THREE.MeshBasicMaterial({
      ...options,
      side: THREE.DoubleSide,
    });
  }

  return new THREE.SpriteMaterial(options);
}

export function getThreeBlendingMode(
  blendMode: RuntimeVfxAssetEntry["blend_mode"],
): THREE.Blending {
  return blendMode === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending;
}

export function createRuntimeVfxInstance({
  id,
  slot,
  usage,
  kind,
  asset,
  texture,
  position,
  scale,
  duration,
  sourceId,
  followTarget,
  persistent,
}: {
  id: string;
  slot: RuntimeVfxSlot;
  usage: RuntimeVfxUsage;
  kind: RuntimeVfxInstanceKind;
  asset: RuntimeVfxAssetEntry;
  texture: THREE.Texture;
  position: { x: number; y: number; z: number };
  scale: RuntimeVfxScale;
  duration?: number;
  sourceId?: string;
  followTarget?: RuntimeVfxInstance["follow_target"];
  persistent?: boolean;
}): RuntimeVfxInstance {
  const material = createMaterialForRuntimeAsset(asset, texture);
  const object3d =
    asset.render_mode === "ground_plane" ||
    asset.render_mode === "aura_ring" ||
    kind === "ground_decal" ||
    kind === "aura"
      ? new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
      : new THREE.Sprite(material as THREE.SpriteMaterial);

  object3d.name = `texture-vfx:${kind}:${id}`;
  object3d.position.set(position.x, position.y, position.z);
  const normalizedScale = normalizeRuntimeVfxScale(scale);
  object3d.scale.set(normalizedScale.x, normalizedScale.y, normalizedScale.z);
  object3d.renderOrder = getRenderOrder(kind);

  if (object3d instanceof THREE.Mesh) {
    object3d.rotation.x = -Math.PI / 2;
  }

  return {
    id,
    kind,
    slot,
    usage,
    object3d,
    age: 0,
    duration: Math.max(0.01, duration ?? asset.duration ?? 0.35),
    base_scale: Math.max(normalizedScale.x, normalizedScale.y, normalizedScale.z),
    base_scale_x: normalizedScale.x,
    base_scale_y: normalizedScale.y,
    base_scale_z: normalizedScale.z,
    base_opacity: asset.opacity ?? 1,
    rotation_speed: asset.rotation_speed ?? getDefaultRotationSpeed(kind),
    source_id: sourceId,
    follow_target: followTarget,
    persistent,
  };
}

function normalizeRuntimeVfxScale(scale: RuntimeVfxScale): {
  x: number;
  y: number;
  z: number;
} {
  if (typeof scale === "number") {
    const value = Math.max(0.01, scale);
    return { x: value, y: value, z: value };
  }

  return {
    x: Math.max(0.01, scale.x),
    y: Math.max(0.01, scale.y),
    z: Math.max(0.01, scale.z ?? 1),
  };
}

function getRenderOrder(kind: RuntimeVfxInstanceKind): number {
  if (kind === "ground_decal" || kind === "aura") {
    return 2;
  }
  if (kind === "trail") {
    return 3;
  }
  return 4;
}

function getDefaultRotationSpeed(kind: RuntimeVfxInstanceKind): number {
  if (kind === "aura") {
    return 0.45;
  }
  if (kind === "ground_decal") {
    return 0.2;
  }
  if (kind === "projectile") {
    return 0.8;
  }
  return 0;
}
