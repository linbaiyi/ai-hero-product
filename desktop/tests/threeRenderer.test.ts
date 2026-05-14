import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import { createInitialGameStateFromSpecAndMap, defaultTrainingMap } from "../src/game-demo/maps";
import type { GameState } from "../src/game-demo/core";
import {
  createBaseScene,
  createDefaultCamera,
  disposeThreeObject,
  renderGameState,
  renderTrainingMap,
  clearGameState,
  updateGameState,
} from "../src/game-demo/renderer";

function createState(): GameState {
  return createInitialGameStateFromSpecAndMap(defaultPlayableSpec, defaultTrainingMap);
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

describe("Three renderer", () => {
  it("createBaseScene creates scene and groups", () => {
    const handles = createBaseScene();

    expect(handles.scene).toBeInstanceOf(THREE.Scene);
    expect(handles.root).toBeInstanceOf(THREE.Group);
    expect(handles.map_group).toBeInstanceOf(THREE.Group);
    expect(handles.entity_group).toBeInstanceOf(THREE.Group);
    expect(handles.vfx_group).toBeInstanceOf(THREE.Group);
    expect(handles.scene.children).toContain(handles.root);
  });

  it("createDefaultCamera creates perspective camera", () => {
    const camera = createDefaultCamera(defaultTrainingMap);

    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(camera.position.y).toBeGreaterThan(0);
  });

  it("renderTrainingMap creates ground and obstacles", () => {
    const handles = createBaseScene();

    renderTrainingMap(handles, defaultTrainingMap);

    expect(handles.map_group.getObjectByName("training-ground")).toBeInstanceOf(
      THREE.Mesh,
    );
    expect(handles.map_group.getObjectByName("training-boundary")).toBeInstanceOf(
      THREE.LineLoop,
    );
    expect(handles.handles.obstacles.size).toBe(defaultTrainingMap.obstacles.length);
  });

  it("renderTrainingMap creates obstacle handles for defaultTrainingMap", () => {
    const handles = createBaseScene();

    renderTrainingMap(handles, defaultTrainingMap);

    for (const obstacle of defaultTrainingMap.obstacles) {
      expect(handles.handles.obstacles.get(obstacle.id)).toBeInstanceOf(THREE.Mesh);
    }
  });

  it("createInitialGameStateFromSpecAndMap + renderGameState creates hero mesh", () => {
    const handles = createBaseScene();
    const state = createState();

    renderGameState(handles, state);

    expect(handles.handles.hero).toBeInstanceOf(THREE.Group);
    expect(handles.entity_group.children).toContain(handles.handles.hero);
    expect(handles.handles.hero?.getObjectByName("health-bar")).toBeInstanceOf(
      THREE.Group,
    );
  });

  it("renderGameState creates enemy meshes from map state", () => {
    const handles = createBaseScene();
    const state = createState();

    renderGameState(handles, state);

    expect(handles.handles.enemies.size).toBe(state.enemies.length);
    expect(handles.handles.enemies.get("dummy_1")).toBeInstanceOf(THREE.Mesh);
    expect(
      handles.handles.enemies.get("dummy_1")?.getObjectByName("health-bar"),
    ).toBeInstanceOf(THREE.Group);
  });

  it("updates enemy health bar when hp changes", () => {
    const handles = createBaseScene();
    const state = createState();
    renderGameState(handles, state);
    state.enemies[0].hp = state.enemies[0].max_hp / 2;

    updateGameState(handles, state);

    const fill = handles.handles.enemies
      .get(state.enemies[0].id)
      ?.getObjectByName("health-bar-fill");
    expect(fill?.scale.x).toBeCloseTo(0.5);
  });

  it("renders enemy status effect markers", () => {
    const handles = createBaseScene();
    const state = createState();
    state.enemies[0].status_effects.push({
      id: "burn_1",
      type: "burn",
      source_skill_slot: "Q",
      duration_remaining: 3,
      tick_interval: 1,
      tick_timer: 1,
      damage: 10,
      value: 0,
    });

    renderGameState(handles, state);

    const enemy = handles.handles.enemies.get(state.enemies[0].id);
    expect(enemy?.getObjectByName("status-effects")).toBeInstanceOf(THREE.Group);
    expect(enemy?.getObjectByName("status:burn")).toBeInstanceOf(THREE.Mesh);
    expect(enemy?.getObjectByName("status-ring:burn")).toBeInstanceOf(THREE.Mesh);
  });

  it("updateGameState updates hero mesh position after movement", () => {
    const handles = createBaseScene();
    const state = createState();
    renderGameState(handles, state);
    state.hero.position = { x: 3, z: -2 };

    updateGameState(handles, state);

    expect(handles.handles.hero?.position.x).toBe(3);
    expect(handles.handles.hero?.position.z).toBe(-2);
  });

  it("projectile state creates projectile mesh", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);

    const projectile = handles.handles.projectiles.get("projectile_1");
    expect(projectile).toBeInstanceOf(THREE.Mesh);
    expect(projectile?.position.x).toBe(2);
    expect(projectile?.position.z).toBe(1);
  });

  it("active zone state creates zone mesh", () => {
    const handles = createBaseScene();
    const state = createState();
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 4, z: 3 },
      radius: 5,
      damage: 20,
      duration_remaining: 4,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);

    const zone = handles.handles.zones.get("zone_1");
    expect(zone).toBeInstanceOf(THREE.Mesh);
    expect(zone?.position.x).toBe(4);
    expect(zone?.position.z).toBe(3);
  });

  it("summon state creates summon mesh", () => {
    const handles = createBaseScene();
    const state = createState();
    state.summons.push({
      id: "summon_1",
      skill_slot: "Q",
      name: "Flame Spirit",
      position: { x: 2, z: -1 },
      max_hp: 120,
      hp: 90,
      radius: 0.6,
      damage: 18,
      attack_range: 6,
      attack_interval: 1,
      attack_timer: 0,
      duration_remaining: 3,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);

    const summon = handles.handles.summons.get("summon_1");
    expect(summon).toBeInstanceOf(THREE.Group);
    expect(summon?.position.x).toBe(2);
    expect(summon?.position.z).toBe(-1);
    expect(summon?.getObjectByName("health-bar")).toBeInstanceOf(THREE.Group);
  });

  it("clearGameState removes summon meshes", () => {
    const handles = createBaseScene();
    const state = createState();
    state.summons.push({
      id: "summon_1",
      skill_slot: "Q",
      name: "Flame Spirit",
      position: { x: 2, z: -1 },
      max_hp: 120,
      hp: 120,
      radius: 0.6,
      damage: 18,
      attack_range: 6,
      attack_interval: 1,
      attack_timer: 0,
      duration_remaining: 3,
      status_effects: [],
      is_alive: true,
    });
    renderGameState(handles, state);

    clearGameState(handles);

    expect(handles.handles.summons.size).toBe(0);
  });

  it("dead enemy is hidden or rendered with dead state", () => {
    const handles = createBaseScene();
    const state = createState();
    state.enemies[0].hp = 0;
    state.enemies[0].is_alive = false;

    renderGameState(handles, state);

    const enemy = handles.handles.enemies.get(state.enemies[0].id);
    expect(enemy).toBeInstanceOf(THREE.Mesh);
    expect(enemy?.visible).toBe(true);
  });

  it("clearGameState removes entity meshes", () => {
    const handles = createBaseScene();
    const state = createState();
    renderGameState(handles, state);

    clearGameState(handles);

    expect(handles.entity_group.children).toHaveLength(0);
    expect(handles.vfx_group.children).toHaveLength(0);
    expect(handles.handles.hero).toBeUndefined();
    expect(handles.handles.enemies.size).toBe(0);
  });

  it("disposeThreeObject does not throw", () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));

    expect(() => disposeThreeObject(group)).not.toThrow();
  });

  it("renderer does not mutate GameState", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    const before = cloneState(state);

    renderTrainingMap(handles, defaultTrainingMap);
    renderGameState(handles, state);
    updateGameState(handles, state);

    expect(state).toEqual(before);
  });
});
