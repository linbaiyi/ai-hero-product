import { describe, expect, it } from "vitest";
import { defaultTrainingMap } from "../src/game-demo/maps";
import * as playtestModule from "../src/game-demo/playtest";
import { defaultRuntimeVfxAssetSpec } from "../src/game-demo/vfx-assets/defaultRuntimeVfxAssetSpec";
import {
  createInputController,
  createSkillSlotFromKey,
} from "../src/game-demo/playtest/inputController";
import {
  createPlaytestInitialState,
  createPlaytestSnapshot,
  getMoveInputTowardDestination,
  getSkillTargetInFrontOfHero,
  resetPlaytestState,
} from "../src/game-demo/playtest/playtestRuntime";

describe("playtest runtime helpers", () => {
  it("inputController initializes and destroys without throwing", () => {
    const controller = createInputController(window);

    expect(() => controller.destroy()).not.toThrow();
  });

  it("inputController stores right-click movement destination", () => {
    const target = document.createElement("div");
    const controller = createInputController(target, {
      keyboardTarget: window,
      resolvePointerTarget: () => ({ x: 4, z: 5 }),
    });

    target.dispatchEvent(new MouseEvent("mousedown", { button: 2 }));

    expect(controller.state.moveDestination).toEqual({ x: 4, z: 5 });

    controller.clearMoveDestination();

    expect(controller.state.moveDestination).toBeUndefined();

    controller.destroy();
  });

  it("inputController stores left-click skill target", () => {
    const target = document.createElement("div");
    const controller = createInputController(target, {
      keyboardTarget: window,
      resolvePointerTarget: () => ({ x: 7, z: 8 }),
    });

    target.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));

    expect(controller.state.pointerTarget).toEqual({ x: 7, z: 8 });

    controller.destroy();
  });

  it("inputController updates skill target from mouse position", () => {
    const target = document.createElement("div");
    const controller = createInputController(target, {
      keyboardTarget: window,
      resolvePointerTarget: () => ({ x: 9, z: -3 }),
    });

    target.dispatchEvent(new MouseEvent("mousemove"));

    expect(controller.state.pointerTarget).toEqual({ x: 9, z: -3 });

    controller.destroy();
  });

  it("Q/W/E/R keys map to Q/W/E/R skill slots", () => {
    const target = document.createElement("div");
    const controller = createInputController(target, { keyboardTarget: window });

    expect(createSkillSlotFromKey("q")).toBe("Q");
    expect(createSkillSlotFromKey("W")).toBe("W");
    expect(createSkillSlotFromKey("e")).toBe("E");
    expect(createSkillSlotFromKey("R")).toBe("R");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "q" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));

    expect([...controller.state.pressedSkills]).toEqual(["Q", "W", "E", "R"]);

    controller.destroy();
  });

  it("PlaytestRuntime helper can create initial state from default spec and map", () => {
    const state = createPlaytestInitialState();

    expect(state.time).toBe(0);
    expect(state.hero.position).toEqual(defaultTrainingMap.hero_spawn);
    expect(state.enemies).toHaveLength(defaultTrainingMap.enemies.length);
    expect(state.world.max_x - state.world.min_x).toBe(defaultTrainingMap.width);
    expect(state.hero.hp).toBe(9999999);
    expect(state.hero.max_hp).toBe(9999999);
    expect(state.hero.resource).toBe(9999999);
    expect(state.hero.max_resource).toBe(9999999);
  });

  it("skill target helper returns point in front of hero", () => {
    const state = createPlaytestInitialState();
    state.hero.position = { x: 2, z: 3 };
    state.hero.facing = { x: 1, z: 0 };

    expect(getSkillTargetInFrontOfHero(state.hero, 8)).toEqual({ x: 10, z: 3 });
  });

  it("move input helper points toward right-click destination", () => {
    const state = createPlaytestInitialState();
    state.hero.position = { x: 0, z: 0 };

    expect(getMoveInputTowardDestination(state.hero, { x: 10, z: 0 })).toEqual({
      x: 1,
      z: 0,
    });
    expect(getMoveInputTowardDestination(state.hero, { x: 0.05, z: 0 })).toEqual({
      x: 0,
      z: 0,
    });
  });

  it("reset creates a fresh state", () => {
    const dirtyState = createPlaytestInitialState();
    dirtyState.hero.hp = 1;
    dirtyState.enemies = [];

    const resetState = resetPlaytestState();

    expect(resetState.hero.hp).toBe(resetState.hero.max_hp);
    expect(resetState.enemies).toHaveLength(defaultTrainingMap.enemies.length);
  });

  it("runtime module exports expected APIs", () => {
    expect(playtestModule.PlaytestRuntime).toBeTypeOf("function");
    expect(playtestModule.createInputController).toBeTypeOf("function");
    expect(playtestModule.createPlaytestInitialState).toBeTypeOf("function");
    expect(playtestModule.getSkillTargetInFrontOfHero).toBeTypeOf("function");
  });

  it("createPlaytestSnapshot exposes hero and cooldown status", () => {
    const state = createPlaytestInitialState();
    state.hero.cooldowns.Q = 2.5;

    const snapshot = createPlaytestSnapshot(state);

    expect(snapshot.hero_name).toBe(state.hero.name);
    expect(snapshot.skills.find((skill) => skill.slot === "Q")?.cooldown_remaining).toBe(
      2.5,
    );
  });

  it("runtime helpers initialize without runtimeVfxAssetSpec", () => {
    const state = createPlaytestInitialState();
    const snapshot = createPlaytestSnapshot(state);

    expect(snapshot.runtime_vfx_enabled).toBe(false);
    expect(snapshot.runtime_vfx_composition_enabled).toBe(false);
    expect(snapshot.runtime_vfx_warnings).toEqual([]);
    expect(snapshot.runtime_vfx_instance_count).toBe(0);
    expect(snapshot.no_cooldown_enabled).toBe(false);
    expect(snapshot.show_vfx_range_debug).toBe(false);
  });

  it("runtime helpers accept runtimeVfxAssetSpec status", () => {
    const state = createPlaytestInitialState();
    const snapshot = createPlaytestSnapshot(state, undefined, {
      runtimeVfxEnabled: Boolean(defaultRuntimeVfxAssetSpec),
      runtimeVfxWarnings: ["missing texture fallback"],
      runtimeVfxInstanceCount: 4,
      noCooldownEnabled: true,
      showVfxRangeDebug: true,
    });

    expect(snapshot.runtime_vfx_enabled).toBe(true);
    expect(snapshot.runtime_vfx_composition_enabled).toBe(true);
    expect(snapshot.runtime_vfx_warnings).toEqual(["missing texture fallback"]);
    expect(snapshot.runtime_vfx_instance_count).toBe(4);
    expect(snapshot.no_cooldown_enabled).toBe(true);
    expect(snapshot.show_vfx_range_debug).toBe(true);
  });
});
