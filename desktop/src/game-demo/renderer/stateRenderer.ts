import * as THREE from "three";
import type {
  EnemyState,
  GameState,
  ProjectileState,
  SummonState,
  ZoneState,
} from "../core";
import { getStatusEffectColor } from "../core/statusRules";
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
  updateSummons(sceneHandles, state);
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
  sceneHandles.handles.summons.clear();
  sceneHandles.handles.texture_vfx?.projectiles.clear();
  sceneHandles.handles.texture_vfx?.zones.clear();
  sceneHandles.handles.texture_vfx?.buffs.clear();
  sceneHandles.handles.texture_vfx?.summon_bodies.clear();
  sceneHandles.handles.texture_vfx?.summon_auras.clear();
  sceneHandles.handles.texture_vfx?.summon_ground_decals.clear();
  sceneHandles.handles.texture_vfx?.trails.clear();
  sceneHandles.handles.texture_vfx?.impacts.clear();
}

function updateSummons(sceneHandles: RenderedGameScene, state: GameState): void {
  const activeIds = new Set(state.summons.map((summon) => summon.id));
  removeMissingObjects(sceneHandles.handles.summons, activeIds, sceneHandles.entity_group);

  for (const summon of state.summons) {
    const object =
      sceneHandles.handles.summons.get(summon.id) ?? createSummonObject(summon);
    if (!sceneHandles.handles.summons.has(summon.id)) {
      sceneHandles.entity_group.add(object);
      sceneHandles.handles.summons.set(summon.id, object);
    }
    object.position.set(summon.position.x, 0, summon.position.z);
    updateHealthBar(object, summon.hp, summon.max_hp);
  }
}

function updateHero(sceneHandles: RenderedGameScene, state: GameState): void {
  const hero = sceneHandles.handles.hero ?? createHeroObject();
  if (!sceneHandles.handles.hero) {
    sceneHandles.entity_group.add(hero);
    sceneHandles.handles.hero = hero;
  }
  hero.position.set(state.hero.position.x, 0, state.hero.position.z);
  updateHealthBar(hero, state.hero.hp, state.hero.max_hp);
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
    updateHealthBar(object, enemy.hp, enemy.max_hp);
    updateEnemyStatusIndicators(object, enemy);
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
  const healthBar = createHealthBar("#22c55e", 1.35);
  healthBar.position.y = 2.05;
  group.add(body, head, healthBar);
  return group;
}

function createEnemyObject(enemy: EnemyState): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(enemy.radius, enemy.radius, 1, 14),
    createEnemyMaterial(),
  );
  mesh.name = `enemy:${enemy.id}`;
  mesh.position.y = 0.5;
  const healthBar = createHealthBar("#ef4444", Math.max(0.9, enemy.radius * 1.6));
  healthBar.position.y = 0.85;
  mesh.add(healthBar);
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

function createSummonObject(summon: SummonState): THREE.Group {
  const group = new THREE.Group();
  group.name = `summon:${summon.id}`;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(summon.radius * 0.65, summon.radius, 0.9, 12),
    new THREE.MeshBasicMaterial({
      color: "#a855f7",
      transparent: true,
      opacity: 0.92,
      depthWrite: true,
    }),
  );
  body.name = "summon-fallback-body";
  body.position.y = 0.45;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.18, summon.radius * 0.45), 12, 8),
    new THREE.MeshBasicMaterial({
      color: "#f0abfc",
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  core.name = "summon-fallback-core";
  core.position.y = 1.05;

  const healthBar = createHealthBar("#c084fc", Math.max(0.75, summon.radius * 1.5));
  healthBar.position.y = 1.55;

  group.add(body, core, healthBar);
  return group;
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

function createHealthBar(fillColor: THREE.ColorRepresentation, width: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "health-bar";
  group.userData.width = width;

  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.11),
    new THREE.MeshBasicMaterial({
      color: "#111827",
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  background.name = "health-bar-background";

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.075),
    new THREE.MeshBasicMaterial({
      color: fillColor,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  fill.name = "health-bar-fill";
  fill.position.z = 0.01;

  group.add(background, fill);
  return group;
}

function updateHealthBar(object: THREE.Object3D, hp: number, maxHp: number): void {
  const bar = object.getObjectByName("health-bar");
  const fill = object.getObjectByName("health-bar-fill");
  if (!bar || !fill) {
    return;
  }

  const width = typeof bar.userData.width === "number" ? bar.userData.width : 1;
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  fill.scale.x = ratio;
  fill.position.x = -(width * (1 - ratio)) / 2;
  fill.visible = ratio > 0;
}

function updateEnemyStatusIndicators(object: THREE.Object3D, enemy: EnemyState): void {
  const existing = object.getObjectByName("status-effects");
  if (existing) {
    object.remove(existing);
    disposeThreeObject(existing);
  }

  if (!enemy.status_effects.length) {
    return;
  }

  const group = new THREE.Group();
  group.name = "status-effects";
  group.position.y = 1.08;

  for (const [index, effect] of enemy.status_effects.entries()) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.36, enemy.radius * 0.85), 0.025, 6, 32),
      new THREE.MeshBasicMaterial({
        color: statusColor(effect.type),
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    ring.name = `status-ring:${effect.type}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.98 + index * 0.03;
    group.add(ring);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({
        color: statusColor(effect.type),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    marker.name = `status:${effect.type}`;
    marker.position.x = (index - (enemy.status_effects.length - 1) / 2) * 0.22;
    group.add(marker);
  }

  object.add(group);
}

function statusColor(statusType: string): THREE.ColorRepresentation {
  return getStatusEffectColor(statusType);
}
