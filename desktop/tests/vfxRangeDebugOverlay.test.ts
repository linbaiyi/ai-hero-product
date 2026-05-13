import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createInitialGameStateFromSpecAndMap, defaultTrainingMap } from "../src/game-demo/maps";
import {
  clearRangeDebugOverlay,
  createBaseScene,
  createCircleRangeOverlay,
  createEnemyCollisionOverlay,
  createProjectileRangeOverlay,
  updateRangeDebugOverlay,
} from "../src/game-demo/renderer";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";

function createState() {
  return createInitialGameStateFromSpecAndMap(defaultPlayableSpec, defaultTrainingMap);
}

describe("VFX range debug overlay", () => {
  it("creates circle range overlay using the input radius", () => {
    const overlay = createCircleRangeOverlay(3, "#fff");
    const mesh = overlay as THREE.Mesh;
    const geometry = mesh.geometry as THREE.RingGeometry;

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(geometry).toBeInstanceOf(THREE.RingGeometry);
  });

  it("creates projectile and enemy overlays", () => {
    expect(createProjectileRangeOverlay(1, "#fff")).toBeInstanceOf(THREE.Object3D);
    expect(createEnemyCollisionOverlay(1, "#fff")).toBeInstanceOf(THREE.Object3D);
  });

  it("does not mutate GameState", () => {
    const handles = createBaseScene();
    const state = createState();
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 1, z: 2 },
      radius: 3,
      damage: 1,
      duration_remaining: 1,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });
    const before = JSON.parse(JSON.stringify(state));

    updateRangeDebugOverlay(handles, state, { showVfxRangeDebug: true });

    expect(state).toEqual(before);
  });

  it("showVfxRangeDebug false does not create overlay", () => {
    const handles = createBaseScene();

    updateRangeDebugOverlay(handles, createState(), { showVfxRangeDebug: false });

    expect(handles.handles.range_debug).toBeUndefined();
  });

  it("showVfxRangeDebug true creates active zone and enemy overlays", () => {
    const handles = createBaseScene();
    const state = createState();
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 1, z: 2 },
      radius: 3,
      damage: 1,
      duration_remaining: 1,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });

    updateRangeDebugOverlay(handles, state, { showVfxRangeDebug: true });

    expect(handles.handles.range_debug?.objects.has("zone:zone_1")).toBe(true);
    expect(handles.handles.range_debug?.objects.has(`enemy:${state.enemies[0].id}`)).toBe(true);
  });

  it("clearRangeDebugOverlay does not throw", () => {
    const handles = createBaseScene();
    updateRangeDebugOverlay(handles, createState(), { showVfxRangeDebug: true });

    expect(() => clearRangeDebugOverlay(handles)).not.toThrow();
    expect(handles.handles.range_debug).toBeUndefined();
  });
});
