import * as THREE from "three";
import type { GameState } from "../core";
import type { RenderedGameScene, RangeDebugHandles } from "./rendererTypes";

export type VfxRangeDebugOptions = {
  showVfxRangeDebug?: boolean;
  showEnemies?: boolean;
  showProjectiles?: boolean;
  showZones?: boolean;
};

export function createCircleRangeOverlay(
  radius: number,
  color: THREE.ColorRepresentation,
): THREE.Object3D {
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 1;
  const geometry = new THREE.RingGeometry(safeRadius * 0.98, safeRadius, 96);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 20;
  return mesh;
}

export function createProjectileRangeOverlay(
  radius: number,
  color: THREE.ColorRepresentation,
): THREE.Object3D {
  return createCircleRangeOverlay(radius, color);
}

export function createEnemyCollisionOverlay(
  radius: number,
  color: THREE.ColorRepresentation,
): THREE.Object3D {
  return createCircleRangeOverlay(radius, color);
}

export function updateRangeDebugOverlay(
  sceneHandles: RenderedGameScene,
  state: GameState,
  options: VfxRangeDebugOptions = {},
): void {
  if (!options.showVfxRangeDebug) {
    clearRangeDebugOverlay(sceneHandles);
    return;
  }

  const handles = ensureRangeDebugHandles(sceneHandles);
  const nextIds = new Set<string>();

  if (options.showZones ?? true) {
    for (const zone of state.active_zones) {
      const id = `zone:${zone.id}`;
      nextIds.add(id);
      upsertOverlay(handles, id, createCircleRangeOverlay(zone.radius, "#38bdf8"));
      handles.objects.get(id)?.position.set(zone.center.x, 0.045, zone.center.z);
    }
  }

  if (options.showProjectiles ?? true) {
    for (const projectile of state.projectiles) {
      const id = `projectile:${projectile.id}`;
      nextIds.add(id);
      upsertOverlay(handles, id, createProjectileRangeOverlay(projectile.radius, "#facc15"));
      handles.objects
        .get(id)
        ?.position.set(projectile.position.x, 0.08, projectile.position.z);
    }
  }

  if (options.showEnemies ?? true) {
    for (const enemy of state.enemies) {
      if (!enemy.is_alive) {
        continue;
      }
      const id = `enemy:${enemy.id}`;
      nextIds.add(id);
      upsertOverlay(handles, id, createEnemyCollisionOverlay(enemy.radius, "#ef4444"));
      handles.objects.get(id)?.position.set(enemy.position.x, 0.055, enemy.position.z);
    }
  }

  for (const [id, object] of [...handles.objects.entries()]) {
    if (!nextIds.has(id)) {
      handles.group.remove(object);
      disposeOverlay(object);
      handles.objects.delete(id);
    }
  }
}

export function clearRangeDebugOverlay(sceneHandles: RenderedGameScene): void {
  const handles = sceneHandles.handles.range_debug;
  if (!handles) {
    return;
  }
  for (const object of handles.objects.values()) {
    handles.group.remove(object);
    disposeOverlay(object);
  }
  handles.objects.clear();
  sceneHandles.vfx_group.remove(handles.group);
  sceneHandles.handles.range_debug = undefined;
}

function ensureRangeDebugHandles(sceneHandles: RenderedGameScene): RangeDebugHandles {
  if (!sceneHandles.handles.range_debug) {
    const group = new THREE.Group();
    group.name = "vfx-range-debug";
    sceneHandles.vfx_group.add(group);
    sceneHandles.handles.range_debug = {
      group,
      objects: new Map(),
    };
  }
  return sceneHandles.handles.range_debug;
}

function upsertOverlay(
  handles: RangeDebugHandles,
  id: string,
  nextObject: THREE.Object3D,
): void {
  const existing = handles.objects.get(id);
  if (existing) {
    disposeOverlay(nextObject);
    return;
  }
  handles.group.add(nextObject);
  handles.objects.set(id, nextObject);
}

function disposeOverlay(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
