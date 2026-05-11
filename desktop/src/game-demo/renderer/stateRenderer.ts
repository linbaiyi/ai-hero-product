import * as THREE from "three";
import type { EnemyState, GameState, ProjectileState, ZoneState } from "../core";
import {
  createDeadEnemyMaterial,
  createEnemyMaterial,
  createHeroMaterial,
  createProjectileMaterial,
  createZoneMaterial,
} from "./materials";
import { disposeThreeObject } from "./disposeThreeObject";
import type { RenderedGameScene } from "./rendererTypes";

export function renderGameState(
  sceneHandles: RenderedGameScene,
  state: GameState,
): void {
  clearGameState(sceneHandles);
  updateGameState(sceneHandles, state);
}

export function updateGameState(
  sceneHandles: RenderedGameScene,
  state: GameState,
): void {
  updateHero(sceneHandles, state);
  updateEnemies(sceneHandles, state);
  updateProjectiles(sceneHandles, state);
  updateZones(sceneHandles, state);
}

export function clearGameState(sceneHandles: RenderedGameScene): void {
  for (const child of [...sceneHandles.entity_group.children]) {
    sceneHandles.entity_group.remove(child);
    disposeThreeObject(child);
  }
  for (const child of [...sceneHandles.vfx_group.children]) {
    sceneHandles.vfx_group.remove(child);
    disposeThreeObject(child);
  }
  sceneHandles.handles.hero = undefined;
  sceneHandles.handles.enemies.clear();
  sceneHandles.handles.projectiles.clear();
  sceneHandles.handles.zones.clear();
}

function updateHero(sceneHandles: RenderedGameScene, state: GameState): void {
  const hero = sceneHandles.handles.hero ?? createHeroObject();
  if (!sceneHandles.handles.hero) {
    sceneHandles.entity_group.add(hero);
    sceneHandles.handles.hero = hero;
  }
  hero.position.set(state.hero.position.x, 0, state.hero.position.z);
}

function updateEnemies(sceneHandles: RenderedGameScene, state: GameState): void {
  const activeIds = new Set(state.enemies.map((enemy) => enemy.id));
  removeMissingObjects(sceneHandles.handles.enemies, activeIds, sceneHandles.entity_group);

  for (const enemy of state.enemies) {
    const object = sceneHandles.handles.enemies.get(enemy.id) ?? createEnemyObject(enemy);
    if (!sceneHandles.handles.enemies.has(enemy.id)) {
      sceneHandles.entity_group.add(object);
      sceneHandles.handles.enemies.set(enemy.id, object);
    }
    object.position.set(enemy.position.x, 0, enemy.position.z);
    object.visible = enemy.is_alive;
    if (!enemy.is_alive && object instanceof THREE.Mesh) {
      object.material = createDeadEnemyMaterial();
      object.visible = true;
    }
  }
}

function updateProjectiles(sceneHandles: RenderedGameScene, state: GameState): void {
  const activeIds = new Set(state.projectiles.map((projectile) => projectile.id));
  removeMissingObjects(sceneHandles.handles.projectiles, activeIds, sceneHandles.vfx_group);

  for (const projectile of state.projectiles) {
    const object =
      sceneHandles.handles.projectiles.get(projectile.id) ??
      createProjectileObject(projectile);
    if (!sceneHandles.handles.projectiles.has(projectile.id)) {
      sceneHandles.vfx_group.add(object);
      sceneHandles.handles.projectiles.set(projectile.id, object);
    }
    object.position.set(projectile.position.x, 0.45, projectile.position.z);
  }
}

function updateZones(sceneHandles: RenderedGameScene, state: GameState): void {
  const activeIds = new Set(state.active_zones.map((zone) => zone.id));
  removeMissingObjects(sceneHandles.handles.zones, activeIds, sceneHandles.vfx_group);

  for (const zone of state.active_zones) {
    const object = sceneHandles.handles.zones.get(zone.id) ?? createZoneObject(zone);
    if (!sceneHandles.handles.zones.has(zone.id)) {
      sceneHandles.vfx_group.add(object);
      sceneHandles.handles.zones.set(zone.id, object);
    }
    object.position.set(zone.center.x, 0.06, zone.center.z);
  }
}

function createHeroObject(): THREE.Group {
  const group = new THREE.Group();
  group.name = "hero";
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.25, 16), createHeroMaterial());
  body.position.y = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), createHeroMaterial());
  head.position.y = 1.45;
  group.add(body, head);
  return group;
}

function createEnemyObject(enemy: EnemyState): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(enemy.radius, enemy.radius, 1, 14),
    createEnemyMaterial(),
  );
  mesh.name = `enemy:${enemy.id}`;
  mesh.position.y = 0.5;
  return mesh;
}

function createProjectileObject(projectile: ProjectileState): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.15, projectile.radius * 0.35), 12, 8),
    createProjectileMaterial(),
  );
  mesh.name = `projectile:${projectile.id}`;
  return mesh;
}

function createZoneObject(zone: ZoneState): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(zone.radius, 48),
    createZoneMaterial(),
  );
  mesh.name = `zone:${zone.id}`;
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function removeMissingObjects(
  handles: Map<string, THREE.Object3D>,
  activeIds: Set<string>,
  parent: THREE.Group,
): void {
  for (const [id, object] of handles) {
    if (activeIds.has(id)) {
      continue;
    }
    parent.remove(object);
    disposeThreeObject(object);
    handles.delete(id);
  }
}
