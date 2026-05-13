import * as THREE from "three";
import { disposeThreeObject } from "./disposeThreeObject";
import {
  clamp01,
  expandAndFade,
  fadeInOut,
  fadeOut,
  pulse,
} from "./vfxAnimationCurves";
import type { RuntimeVfxInstance } from "./vfxInstanceTypes";

export function updateRuntimeVfxInstance(
  instance: RuntimeVfxInstance,
  deltaTime: number,
): boolean {
  instance.age += Math.max(0, deltaTime);
  const progress = clamp01(instance.age / instance.duration);

  if (instance.kind === "trail") {
    setOpacity(instance.object3d, instance.base_opacity * fadeOut(progress));
    applyRuntimeVfxScale(instance, 1 - progress * 0.45);
  } else if (instance.kind === "impact") {
    const curve = expandAndFade(progress);
    setOpacity(instance.object3d, instance.base_opacity * curve.opacity);
    applyRuntimeVfxScale(instance, curve.scale);
  } else if (instance.kind === "ground_decal") {
    const opacity = instance.base_opacity * fadeInOut(progress) * (0.72 + pulse(instance.age, 1.4) * 0.28);
    setOpacity(instance.object3d, opacity);
    applyRuntimeVfxScale(instance, 0.96 + pulse(instance.age, 0.8) * 0.08);
    instance.object3d.rotation.z += instance.rotation_speed * deltaTime;
  } else if (instance.kind === "aura") {
    const opacity = instance.base_opacity * fadeInOut(progress) * (0.78 + pulse(instance.age, 1.15) * 0.22);
    setOpacity(instance.object3d, opacity);
    applyRuntimeVfxScale(instance, 0.94 + pulse(instance.age, 0.9) * 0.12);
    instance.object3d.rotation.z += instance.rotation_speed * deltaTime;
  } else {
    setOpacity(instance.object3d, instance.base_opacity);
    instance.object3d.rotation.z += instance.rotation_speed * deltaTime;
  }

  return Boolean(instance.persistent) || instance.age <= instance.duration;
}

function applyRuntimeVfxScale(instance: RuntimeVfxInstance, multiplier: number): void {
  const safeMultiplier = Math.max(0.01, multiplier);
  const x = instance.base_scale_x ?? instance.base_scale;
  const y = instance.base_scale_y ?? instance.base_scale;
  const z = instance.base_scale_z ?? instance.base_scale;
  instance.object3d.scale.set(
    Math.max(0.01, x * safeMultiplier),
    Math.max(0.01, y * safeMultiplier),
    Math.max(0.01, z * safeMultiplier),
  );
}

export function disposeRuntimeVfxInstance(instance: RuntimeVfxInstance): void {
  disposeThreeObject(instance.object3d);
}

export function setOpacity(object: THREE.Object3D, opacity: number): void {
  const material = object instanceof THREE.Sprite ? object.material : object instanceof THREE.Mesh ? object.material : undefined;
  if (!material) {
    return;
  }

  if (Array.isArray(material)) {
    for (const item of material) {
      item.opacity = opacity;
      item.transparent = true;
    }
    return;
  }

  material.opacity = opacity;
  material.transparent = true;
}
