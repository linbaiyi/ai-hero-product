import { describe, expect, it } from "vitest";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import {
  applyDamageToEnemiesInRadius,
  applyDamageToEnemy,
  createCooldownState,
  createEnemy,
  createInitialGameStateFromSpec,
  createWorldBounds,
  damageEnemy,
  getCooldownRemaining,
  isCooldownReady,
  killEnemy,
  moveHero,
  normalizeVec2,
  setCooldown,
  setHeroFacing,
  tickCooldowns,
  updateSimulation,
} from "../src/game-demo/core";

describe("Game Core", () => {
  it("createInitialGameStateFromSpec creates hero from defaultPlayableSpec", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    expect(state.hero.id).toBe(defaultPlayableSpec.hero.id);
    expect(state.hero.name).toBe(defaultPlayableSpec.hero.name);
    expect(state.hero.position).toEqual({ x: 0, z: 0 });
    expect(state.hero.facing).toEqual({ x: 0, z: 1 });
  });

  it("hero initial hp/resource equals max values", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    expect(state.hero.hp).toBe(state.hero.max_hp);
    expect(state.hero.resource).toBe(state.hero.max_resource);
  });

  it("hero moves by input direction", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    moveHero(state.hero, { x: 1, z: 0 }, 1, state.world);

    expect(state.hero.position.x).toBeCloseTo(defaultPlayableSpec.hero.move_speed);
    expect(state.hero.position.z).toBe(0);
  });

  it("diagonal movement is normalized", () => {
    const straight = createInitialGameStateFromSpec(defaultPlayableSpec);
    const diagonal = createInitialGameStateFromSpec(defaultPlayableSpec);

    moveHero(straight.hero, { x: 1, z: 0 }, 1, straight.world);
    moveHero(diagonal.hero, { x: 1, z: 1 }, 1, diagonal.world);

    const straightDistance = Math.hypot(
      straight.hero.position.x,
      straight.hero.position.z,
    );
    const diagonalDistance = Math.hypot(
      diagonal.hero.position.x,
      diagonal.hero.position.z,
    );
    expect(diagonalDistance).toBeCloseTo(straightDistance);
  });

  it("hero cannot move outside world bounds", () => {
    const world = createWorldBounds(4, 4);
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, { world });

    moveHero(state.hero, { x: 1, z: 0 }, 100, state.world);

    expect(state.hero.position.x).toBe(world.max_x);
    expect(state.hero.position.z).toBe(0);
  });

  it("setHeroFacing normalizes direction", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    setHeroFacing(state.hero, { x: 10, z: 0 });

    expect(state.hero.facing).toEqual({ x: 1, z: 0 });
  });

  it("enemy takes damage", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 0, z: 0 }, max_hp: 100 });

    damageEnemy(enemy, 25);

    expect(enemy.hp).toBe(75);
    expect(enemy.is_alive).toBe(true);
  });

  it("enemy dies when hp reaches zero", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 0, z: 0 }, max_hp: 100 });

    damageEnemy(enemy, 100);

    expect(enemy.hp).toBe(0);
    expect(enemy.is_alive).toBe(false);
  });

  it("damage cannot reduce enemy hp below zero", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 0, z: 0 }, max_hp: 100 });

    damageEnemy(enemy, 150);

    expect(enemy.hp).toBe(0);
  });

  it("applyDamageToEnemiesInRadius only damages enemies inside radius", () => {
    const inside = createEnemy({ id: "inside", position: { x: 1, z: 0 }, max_hp: 100 });
    const outside = createEnemy({ id: "outside", position: { x: 10, z: 0 }, max_hp: 100 });
    const dead = killEnemy(
      createEnemy({ id: "dead", position: { x: 0, z: 1 }, max_hp: 100 }),
    );

    const events = applyDamageToEnemiesInRadius(
      [inside, outside, dead],
      { x: 0, z: 0 },
      2,
      30,
    );

    expect(events.map((event) => event.enemy_id)).toEqual(["inside"]);
    expect(inside.hp).toBe(70);
    expect(outside.hp).toBe(100);
    expect(dead.hp).toBe(0);
  });

  it("cooldown can be set and ticks down", () => {
    const cooldowns = createCooldownState();

    setCooldown(cooldowns, "Q", 5);
    tickCooldowns(cooldowns, 2);

    expect(getCooldownRemaining(cooldowns, "Q")).toBe(3);
  });

  it("cooldown never goes below zero", () => {
    const cooldowns = createCooldownState();

    setCooldown(cooldowns, "Q", 1);
    tickCooldowns(cooldowns, 5);

    expect(getCooldownRemaining(cooldowns, "Q")).toBe(0);
  });

  it("isCooldownReady works", () => {
    const cooldowns = createCooldownState();

    expect(isCooldownReady(cooldowns, "Q")).toBe(true);
    setCooldown(cooldowns, "Q", 1);
    expect(isCooldownReady(cooldowns, "Q")).toBe(false);
    tickCooldowns(cooldowns, 1);
    expect(isCooldownReady(cooldowns, "Q")).toBe(true);
  });

  it("simulation update advances time", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    updateSimulation(state, { x: 0, z: 0 }, 0.5);

    expect(state.time).toBe(0.5);
  });

  it("simulation update moves hero and ticks cooldowns", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    setCooldown(state.hero.cooldowns, "Q", 3);

    updateSimulation(state, { x: 0, z: 1 }, 1);

    expect(state.hero.position.z).toBeCloseTo(defaultPlayableSpec.hero.move_speed);
    expect(getCooldownRemaining(state.hero.cooldowns, "Q")).toBe(2);
  });

  it("zero vector normalize is safe", () => {
    expect(normalizeVec2({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
  });

  it("applyDamageToEnemy returns a damage event", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 0, z: 0 }, max_hp: 100 });

    const event = applyDamageToEnemy(enemy, 40);

    expect(event).toEqual({
      enemy_id: "dummy",
      amount: 40,
      remaining_hp: 60,
      is_alive: true,
    });
  });
});
