import * as THREE from "three";
import { disposeThreeObject } from "./disposeThreeObject";
import { clamp01, expandAndFade, fadeOut, pulse } from "./vfxAnimationCurves";
import type { ProceduralVfxInstance } from "./proceduralVfxTypes";

export function updateProceduralVfxInstances(
  instances: Map<string, ProceduralVfxInstance>,
  deltaTime: number,
): void {
  for (const instance of [...instances.values()]) {
    if (!updateProceduralVfxInstance(instance, deltaTime)) {
      disposeProceduralVfxInstance(instance);
      instances.delete(instance.id);
    }
  }
}

export function updateProceduralVfxInstance(
  instance: ProceduralVfxInstance,
  deltaTime: number,
): boolean {
  instance.age += Math.max(0, deltaTime);
  const progress = clamp01(instance.age / instance.duration);

  if (instance.kind === "shockwave") {
    const curve = expandAndFade(progress);
    instance.object3d.scale.setScalar(instance.base_scale * (0.6 + curve.scale * 1.5));
    setOpacity(instance.object3d, instance.opacity * curve.opacity);
  } else if (instance.kind === "glow_disc") {
    const scale = instance.base_scale * (0.92 + pulse(instance.age, 0.75) * 0.12);
    instance.object3d.scale.setScalar(scale);
    setOpacity(instance.object3d, instance.opacity * (0.65 + pulse(instance.age, 0.55) * 0.25));
  } else if (instance.kind === "particle_burst" || instance.kind === "particle_trail") {
    updateParticles(instance, deltaTime, progress);
    setOpacity(instance.object3d, instance.opacity * fadeOut(progress));
  } else if (instance.kind === "light_flash") {
    if (instance.object3d instanceof THREE.PointLight) {
      instance.object3d.intensity =
        (instance.light_intensity ?? 1.8) * instance.opacity * fadeOut(progress);
    }
  } else if (instance.kind === "rotating_ring") {
    instance.object3d.rotation.z += instance.rotation_speed * deltaTime;
    const scale = instance.base_scale * (0.96 + pulse(instance.age, 0.9) * 0.08);
    instance.object3d.scale.setScalar(scale);
    setOpacity(instance.object3d, instance.opacity * (0.7 + pulse(instance.age, 0.8) * 0.25));
  } else if (instance.kind === "upward_sparks") {
    updateParticles(instance, deltaTime, progress);
    setOpacity(instance.object3d, instance.opacity * fadeOut(progress));
  }

  return Boolean(instance.persistent) || instance.age <= instance.duration;
}

export function disposeProceduralVfxInstance(instance: ProceduralVfxInstance): void {
  disposeThreeObject(instance.object3d);
}

export function clearProceduralVfxInstances(
  instances: Map<string, ProceduralVfxInstance>,
): void {
  for (const instance of instances.values()) {
    disposeProceduralVfxInstance(instance);
  }
  instances.clear();
}

export function enforceProceduralInstanceLimit(
  instances: Map<string, ProceduralVfxInstance>,
  maxCount: number,
): void {
  while (instances.size > maxCount) {
    const oldestId = instances.keys().next().value as string | undefined;
    if (!oldestId) {
      return;
    }
    const oldest = instances.get(oldestId);
    if (oldest) {
      disposeProceduralVfxInstance(oldest);
      oldest.object3d.parent?.remove(oldest.object3d);
    }
    instances.delete(oldestId);
  }
}

function updateParticles(
  instance: ProceduralVfxInstance,
  deltaTime: number,
  progress: number,
): void {
  if (!(instance.object3d instanceof THREE.Points)) {
    return;
  }
  const positionAttribute = instance.object3d.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute | undefined;
  if (!positionAttribute || !instance.velocities) {
    return;
  }

  const positions = positionAttribute.array as Float32Array;
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] += instance.velocities[index] * deltaTime * (1 - progress * 0.25);
    positions[index + 1] += instance.velocities[index + 1] * deltaTime;
    positions[index + 2] += instance.velocities[index + 2] * deltaTime * (1 - progress * 0.25);
  }
  positionAttribute.needsUpdate = true;
}

function setOpacity(object: THREE.Object3D, opacity: number): void {
  const material =
    object instanceof THREE.Points
      ? object.material
      : object instanceof THREE.Mesh
        ? object.material
        : undefined;
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
