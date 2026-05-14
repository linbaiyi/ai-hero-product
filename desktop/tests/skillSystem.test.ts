import { describe, expect, it } from "vitest";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import type { HeroPlayableSpec } from "../src/game-demo/specs/playableSpecTypes";
import {
  castSkill,
  createEnemy,
  createInitialGameStateFromSpec,
  createWorldBounds,
  getCooldownRemaining,
  isCooldownReady,
  setCooldown,
  updateSimulation,
} from "../src/game-demo/core";

function cloneSpec(spec: HeroPlayableSpec = defaultPlayableSpec): HeroPlayableSpec {
  return JSON.parse(JSON.stringify(spec)) as HeroPlayableSpec;
}

function makeBuffSpec(): HeroPlayableSpec {
  const spec = cloneSpec();
  spec.skills[0] = {
    ...spec.skills[0],
    name: "Flame Guard",
    type: "buff",
    cooldown: 0,
    resource_cost: 0,
    duration: 2,
    description: "Temporarily increases movement speed.",
    vfx: {
      theme: "fire",
      color: "#ff5a1f",
      shape: "shield",
      impact: "flame_guard",
      trail: "ember_ring",
    },
  };
  return spec;
}

function makeSummonSpec(): HeroPlayableSpec {
  const spec = cloneSpec();
  spec.skills[0] = {
    ...spec.skills[0],
    name: "Summon Flame Spirit",
    type: "summon",
    cooldown: 0,
    resource_cost: 0,
    damage: 18,
    radius: 0.6,
    range: 6,
    duration: 3,
    tick_interval: 1,
    description: "Summons a flame spirit that attacks nearby enemies.",
    vfx: {
      theme: "fire",
      color: "#ff5a1f",
      shape: "rune",
      impact: "summon_flash",
      trail: "spirit_ember",
    },
  };
  return spec;
}

function makeBurnProjectileSpec(): HeroPlayableSpec {
  const spec = cloneSpec();
  spec.skills[0] = {
    ...spec.skills[0],
    cooldown: 0,
    resource_cost: 0,
    status_effects: [
      {
        type: "burn",
        duration: 3,
        tick_interval: 1,
        damage: 10,
      },
    ],
  };
  return spec;
}

describe("Skill System", () => {
  it("projectile cast creates projectile", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    const target = { x: 10, z: 0 };
    const result = castSkill(state, defaultPlayableSpec, "Q", target);

    expect(result.success).toBe(true);
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0]).toMatchObject({ skill_slot: "Q", is_alive: true });
    expect(state.events[0]).toMatchObject({ type: "skill_cast", target });
  });

  it("projectile consumes resource and sets cooldown", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    expect(state.hero.resource).toBe(80);
    expect(getCooldownRemaining(state.hero.cooldowns, "Q")).toBe(4);
  });

  it("projectile cannot cast during cooldown", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    const result = castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("skill is on cooldown");
    expect(state.projectiles).toHaveLength(1);
  });

  it("projectile cannot cast without enough resource", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    state.hero.resource = 10;

    const result = castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("not enough resource");
    expect(state.projectiles).toHaveLength(0);
  });

  it("projectile moves on simulation update", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    updateSimulation(state, { x: 0, z: 0 }, 0.25);

    expect(state.projectiles[0].position.x).toBeCloseTo(4);
    expect(state.projectiles[0].position.z).toBeCloseTo(0);
  });

  it("projectile damages enemy on hit", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 14, z: 0 }, max_hp: 200 });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });
    castSkill(state, defaultPlayableSpec, "Q", { x: 20, z: 0 });

    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(enemy.hp).toBe(80);
    expect(state.projectiles).toHaveLength(0);
    expect(state.events.some((event) => event.type === "projectile_hit")).toBe(true);
  });

  it("projectile applies burn status and burn ticks damage", () => {
    const spec = makeBurnProjectileSpec();
    const enemy = createEnemy({ id: "dummy", position: { x: 14, z: 0 }, max_hp: 200 });
    const state = createInitialGameStateFromSpec(spec, { enemies: [enemy] });

    castSkill(state, spec, "Q", { x: 20, z: 0 });
    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(enemy.status_effects[0]).toMatchObject({ type: "burn" });
    const hpAfterHit = enemy.hp;

    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(enemy.hp).toBe(hpAfterHit - 10);
    expect(state.events.some((event) => event.type === "status_tick")).toBe(true);
  });

  it("marked enemies take amplified follow-up damage", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 14, z: 0 }, max_hp: 300 });
    enemy.status_effects.push({
      id: "mark_1",
      type: "mark",
      source_skill_slot: "Q",
      duration_remaining: 3,
      tick_interval: 1,
      tick_timer: 1,
      damage: 0,
      value: 0.5,
    });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });

    castSkill(state, defaultPlayableSpec, "Q", { x: 20, z: 0 });
    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(enemy.hp).toBe(120);
    expect(state.events.find((event) => event.type === "damage")).toMatchObject({
      amount: 180,
    });
  });

  it("poison status uses a different lower tick damage rule than burn", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 0, z: 0 }, max_hp: 100 });
    enemy.status_effects.push({
      id: "poison_1",
      type: "poison",
      source_skill_slot: "Q",
      duration_remaining: 3,
      tick_interval: 1,
      tick_timer: 0,
      damage: 10,
      value: 0,
    });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });

    updateSimulation(state, { x: 0, z: 0 }, 0.1);

    expect(enemy.hp).toBe(92);
  });

  it("projectile expires after range", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    castSkill(state, defaultPlayableSpec, "Q", { x: 20, z: 0 });

    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(state.projectiles).toHaveLength(0);
  });

  it("aoe damages enemies inside radius", () => {
    const enemy = createEnemy({ id: "inside", position: { x: 1, z: 0 }, max_hp: 500 });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });

    const result = castSkill(state, defaultPlayableSpec, "R", { x: 0, z: 0 });

    expect(result.success).toBe(true);
    expect(enemy.hp).toBe(180);
  });

  it("aoe does not damage enemies outside radius", () => {
    const enemy = createEnemy({ id: "outside", position: { x: 20, z: 0 }, max_hp: 500 });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });

    castSkill(state, defaultPlayableSpec, "R", { x: 0, z: 0 });

    expect(enemy.hp).toBe(500);
  });

  it("aoe_dot creates zone", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    const result = castSkill(state, defaultPlayableSpec, "W", { x: 0, z: 0 });

    expect(result.success).toBe(true);
    expect(state.active_zones).toHaveLength(1);
    expect(state.active_zones[0]).toMatchObject({ skill_slot: "W", is_alive: true });
  });

  it("aoe_dot ticks damage by interval", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 1, z: 0 }, max_hp: 100 });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });
    castSkill(state, defaultPlayableSpec, "W", { x: 0, z: 0 });

    updateSimulation(state, { x: 0, z: 0 }, 0.5);
    expect(enemy.hp).toBe(100);
    updateSimulation(state, { x: 0, z: 0 }, 0.5);
    expect(enemy.hp).toBe(72);
  });

  it("aoe_dot expires after duration", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    castSkill(state, defaultPlayableSpec, "W", { x: 0, z: 0 });

    updateSimulation(state, { x: 0, z: 0 }, 5);

    expect(state.active_zones).toHaveLength(0);
  });

  it("dash moves hero by configured distance", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    const result = castSkill(state, defaultPlayableSpec, "E", { x: 10, z: 0 });

    expect(result.success).toBe(true);
    expect(state.hero.position.x).toBeCloseTo(7);
    expect(state.hero.position.z).toBeCloseTo(0);
  });

  it("dash clamps hero to world bounds", () => {
    const world = createWorldBounds(4, 4);
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, { world });

    castSkill(state, defaultPlayableSpec, "E", { x: 100, z: 0 });

    expect(state.hero.position.x).toBe(2);
  });

  it("dash can damage enemies near endpoint if damage exists", () => {
    const enemy = createEnemy({ id: "dummy", position: { x: 7, z: 0 }, max_hp: 100 });
    const state = createInitialGameStateFromSpec(defaultPlayableSpec, {
      enemies: [enemy],
    });

    castSkill(state, defaultPlayableSpec, "E", { x: 10, z: 0 });

    expect(enemy.hp).toBe(30);
  });

  it("buff increases move_speed", () => {
    const spec = makeBuffSpec();
    const state = createInitialGameStateFromSpec(spec);
    const originalMoveSpeed = state.hero.move_speed;

    const result = castSkill(state, spec, "Q", { x: 0, z: 1 });

    expect(result.success).toBe(true);
    expect(state.hero.move_speed).toBeCloseTo(originalMoveSpeed * 1.2);
    expect(state.buffs).toHaveLength(1);
  });

  it("buff expires and restores move_speed", () => {
    const spec = makeBuffSpec();
    const state = createInitialGameStateFromSpec(spec);
    const originalMoveSpeed = state.hero.move_speed;
    castSkill(state, spec, "Q", { x: 0, z: 1 });

    updateSimulation(state, { x: 0, z: 0 }, 2);

    expect(state.hero.move_speed).toBe(originalMoveSpeed);
    expect(state.buffs).toHaveLength(0);
    expect(state.events.some((event) => event.type === "buff_expired")).toBe(true);
  });

  it("summon cast creates a summon at target", () => {
    const spec = makeSummonSpec();
    const state = createInitialGameStateFromSpec(spec);

    const result = castSkill(state, spec, "Q", { x: 3, z: 2 });

    expect(result.success).toBe(true);
    expect(state.summons).toHaveLength(1);
    expect(state.summons[0]).toMatchObject({
      skill_slot: "Q",
      position: { x: 3, z: 2 },
      is_alive: true,
    });
    expect(state.events.some((event) => event.type === "summon_spawned")).toBe(true);
  });

  it("summon attacks nearby enemies over time", () => {
    const spec = makeSummonSpec();
    const enemy = createEnemy({ id: "dummy", position: { x: 4, z: 2 }, max_hp: 100 });
    const state = createInitialGameStateFromSpec(spec, { enemies: [enemy] });
    castSkill(state, spec, "Q", { x: 3, z: 2 });

    updateSimulation(state, { x: 0, z: 0 }, 0.1);

    expect(enemy.hp).toBe(82);
    expect(state.events.some((event) => event.type === "summon_attack")).toBe(true);
  });

  it("summon does not attack stunned enemies", () => {
    const spec = makeSummonSpec();
    const enemy = createEnemy({ id: "dummy", position: { x: 4, z: 2 }, max_hp: 100 });
    enemy.status_effects.push({
      id: "stun_1",
      type: "stun",
      source_skill_slot: "Q",
      duration_remaining: 1,
      tick_interval: 1,
      tick_timer: 1,
      damage: 0,
      value: 1,
    });
    const state = createInitialGameStateFromSpec(spec, { enemies: [enemy] });
    castSkill(state, spec, "Q", { x: 3, z: 2 });

    updateSimulation(state, { x: 0, z: 0 }, 0.1);

    expect(enemy.hp).toBe(100);
    expect(state.events.some((event) => event.type === "summon_attack")).toBe(false);
  });

  it("summon expires after duration", () => {
    const spec = makeSummonSpec();
    const state = createInitialGameStateFromSpec(spec);
    castSkill(state, spec, "Q", { x: 3, z: 2 });

    updateSimulation(state, { x: 0, z: 0 }, 3);

    expect(state.summons).toHaveLength(0);
    expect(state.events.some((event) => event.type === "summon_expired")).toBe(true);
  });

  it("duplicate buff does not permanently stack incorrectly", () => {
    const spec = makeBuffSpec();
    const state = createInitialGameStateFromSpec(spec);
    const originalMoveSpeed = state.hero.move_speed;
    castSkill(state, spec, "Q", { x: 0, z: 1 });
    castSkill(state, spec, "Q", { x: 0, z: 1 });

    expect(state.hero.move_speed).toBeCloseTo(originalMoveSpeed * 1.2);
    expect(state.buffs).toHaveLength(1);

    updateSimulation(state, { x: 0, z: 0 }, 2);

    expect(state.hero.move_speed).toBe(originalMoveSpeed);
  });

  it("failed cast does not consume resource", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    state.hero.resource = 0;

    castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    expect(state.hero.resource).toBe(0);
  });

  it("failed cast does not set cooldown", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    state.hero.resource = 0;

    castSkill(state, defaultPlayableSpec, "Q", { x: 10, z: 0 });

    expect(isCooldownReady(state.hero.cooldowns, "Q")).toBe(true);
  });

  it("cast unknown slot fails cleanly", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);

    const result = castSkill(state, defaultPlayableSpec, "X", { x: 0, z: 0 });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("unknown skill slot");
    expect(state.events.at(-1)).toMatchObject({ type: "skill_failed" });
  });

  it("updateSimulation keeps existing movement/cooldown behavior", () => {
    const state = createInitialGameStateFromSpec(defaultPlayableSpec);
    setCooldown(state.hero.cooldowns, "Q", 3);

    updateSimulation(state, { x: 0, z: 1 }, 1);

    expect(state.hero.position.z).toBeCloseTo(defaultPlayableSpec.hero.move_speed);
    expect(getCooldownRemaining(state.hero.cooldowns, "Q")).toBe(2);
  });
});
