import { describe, expect, it } from "vitest";
import { defaultTrainingMap } from "../src/game-demo/maps";
import * as playtestModule from "../src/game-demo/playtest";
import {
  createInputController,
  createSkillSlotFromNumberKey,
} from "../src/game-demo/playtest/inputController";
import {
  createPlaytestInitialState,
  createPlaytestSnapshot,
  getSkillTargetInFrontOfHero,
  resetPlaytestState,
} from "../src/game-demo/playtest/playtestRuntime";

describe("playtest runtime helpers", () => {
  it("inputController initializes and destroys without throwing", () => {
    const controller = createInputController(window);

    expect(() => controller.destroy()).not.toThrow();
  });

  it("inputController updates movement on keydown and keyup", () => {
    const controller = createInputController(window);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));

    expect(controller.state.move).toEqual({ x: 1, z: 1 });

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));

    expect(controller.state.move).toEqual({ x: 1, z: 0 });

    controller.destroy();
  });

  it("number keys 1/2/3/4 map to Q/W/E/R skill slots", () => {
    const controller = createInputController(window);

    expect(createSkillSlotFromNumberKey("1")).toBe("Q");
    expect(createSkillSlotFromNumberKey("2")).toBe("W");
    expect(createSkillSlotFromNumberKey("3")).toBe("E");
    expect(createSkillSlotFromNumberKey("4")).toBe("R");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "4" }));

    expect([...controller.state.pressedSkills]).toEqual(["Q", "W", "E", "R"]);

    controller.destroy();
  });

  it("PlaytestRuntime helper can create initial state from default spec and map", () => {
    const state = createPlaytestInitialState();

    expect(state.time).toBe(0);
    expect(state.hero.position).toEqual(defaultTrainingMap.hero_spawn);
    expect(state.enemies).toHaveLength(defaultTrainingMap.enemies.length);
    expect(state.world.max_x - state.world.min_x).toBe(defaultTrainingMap.width);
  });

  it("skill target helper returns point in front of hero", () => {
    const state = createPlaytestInitialState();
    state.hero.position = { x: 2, z: 3 };
    state.hero.facing = { x: 1, z: 0 };

    expect(getSkillTargetInFrontOfHero(state.hero, 8)).toEqual({ x: 10, z: 3 });
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
});
