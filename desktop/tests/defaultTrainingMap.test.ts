import { describe, expect, it } from "vitest";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import {
  createInitialGameStateFromSpecAndMap,
  defaultTrainingMap,
  isObstacleInsideBounds,
  validateTrainingMap,
} from "../src/game-demo/maps";
import type { TrainingMapConfig } from "../src/game-demo/maps";
import { createWorldBounds, isInsideBounds } from "../src/game-demo/core";

function cloneMap(map: TrainingMapConfig = defaultTrainingMap): TrainingMapConfig {
  return JSON.parse(JSON.stringify(map)) as TrainingMapConfig;
}

describe("defaultTrainingMap", () => {
  it("defaultTrainingMap validates successfully", () => {
    const result = validateTrainingMap(defaultTrainingMap);

    expect(result.success).toBe(true);
  });

  it("defaultTrainingMap has expected id and size", () => {
    expect(defaultTrainingMap.id).toBe("default_training_arena");
    expect(defaultTrainingMap.width).toBe(40);
    expect(defaultTrainingMap.depth).toBe(40);
  });

  it("hero spawn is inside bounds", () => {
    const bounds = createWorldBounds(defaultTrainingMap.width, defaultTrainingMap.depth);

    expect(isInsideBounds(defaultTrainingMap.hero_spawn, bounds)).toBe(true);
  });

  it("all enemies are inside bounds", () => {
    const bounds = createWorldBounds(defaultTrainingMap.width, defaultTrainingMap.depth);

    expect(
      defaultTrainingMap.enemies.every((enemy) => isInsideBounds(enemy.position, bounds)),
    ).toBe(true);
  });

  it("all obstacles are inside bounds", () => {
    const bounds = createWorldBounds(defaultTrainingMap.width, defaultTrainingMap.depth);

    expect(
      defaultTrainingMap.obstacles.every((obstacle) =>
        isObstacleInsideBounds(obstacle, bounds),
      ),
    ).toBe(true);
  });

  it("duplicate enemy id fails validation", () => {
    const map = cloneMap();
    map.enemies[1].id = map.enemies[0].id;

    const result = validateTrainingMap(map);

    expect(result.success).toBe(false);
  });

  it("duplicate obstacle id fails validation", () => {
    const map = cloneMap();
    map.obstacles[1].id = map.obstacles[0].id;

    const result = validateTrainingMap(map);

    expect(result.success).toBe(false);
  });

  it("enemy outside bounds fails validation", () => {
    const map = cloneMap();
    map.enemies[0].position = { x: 100, z: 0 };

    const result = validateTrainingMap(map);

    expect(result.success).toBe(false);
  });

  it("obstacle outside bounds fails validation", () => {
    const map = cloneMap();
    map.obstacles[0].position = { x: 20, z: 0 };

    const result = validateTrainingMap(map);

    expect(result.success).toBe(false);
  });

  it("invalid map size fails validation", () => {
    const map = cloneMap();
    map.width = 0;

    const result = validateTrainingMap(map);

    expect(result.success).toBe(false);
  });

  it("obstacle covering hero spawn fails validation", () => {
    const map = cloneMap();
    map.obstacles[0] = {
      id: "spawn_blocker",
      position: { x: 0, z: 0 },
      width: 2,
      depth: 2,
    };

    const result = validateTrainingMap(map);

    expect(result.success).toBe(false);
  });

  it("createInitialGameStateFromSpecAndMap creates hero at map spawn", () => {
    const state = createInitialGameStateFromSpecAndMap(
      defaultPlayableSpec,
      defaultTrainingMap,
    );

    expect(state.hero.position).toEqual(defaultTrainingMap.hero_spawn);
  });

  it("createInitialGameStateFromSpecAndMap creates enemies from map", () => {
    const state = createInitialGameStateFromSpecAndMap(
      defaultPlayableSpec,
      defaultTrainingMap,
    );

    expect(state.enemies).toHaveLength(defaultTrainingMap.enemies.length);
    expect(state.enemies[0]).toMatchObject({
      id: defaultTrainingMap.enemies[0].id,
      hp: defaultTrainingMap.enemies[0].max_hp,
      radius: defaultTrainingMap.enemies[0].radius,
    });
  });

  it("createInitialGameStateFromSpecAndMap respects include_enemies=false", () => {
    const state = createInitialGameStateFromSpecAndMap(
      defaultPlayableSpec,
      defaultTrainingMap,
      { include_enemies: false },
    );

    expect(state.enemies).toEqual([]);
  });

  it("createInitialGameStateFromSpecAndMap uses map bounds", () => {
    const state = createInitialGameStateFromSpecAndMap(
      defaultPlayableSpec,
      defaultTrainingMap,
    );

    expect(state.world).toEqual(createWorldBounds(40, 40));
  });

  it("override_hero_spawn works when inside bounds", () => {
    const state = createInitialGameStateFromSpecAndMap(
      defaultPlayableSpec,
      defaultTrainingMap,
      { override_hero_spawn: { x: 2, z: -3 } },
    );

    expect(state.hero.position).toEqual({ x: 2, z: -3 });
  });

  it("override_hero_spawn fails when outside bounds", () => {
    expect(() =>
      createInitialGameStateFromSpecAndMap(defaultPlayableSpec, defaultTrainingMap, {
        override_hero_spawn: { x: 100, z: 0 },
      }),
    ).toThrow("override_hero_spawn must be inside map bounds");
  });
});
