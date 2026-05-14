import { describe, expect, it } from "vitest";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import type { HeroPlayableSpec } from "../src/game-demo/specs/playableSpecTypes";
import {
  castSkill,
  createEnemy,
  createInitialGameStateFromSpec,
  updateSimulation,
} from "../src/game-demo/core";

function cloneSpec(): HeroPlayableSpec {
  return JSON.parse(JSON.stringify(defaultPlayableSpec)) as HeroPlayableSpec;
}

function makeExplodingSummonSpec(): HeroPlayableSpec {
  const spec = cloneSpec();
  spec.skills[0] = {
    ...spec.skills[0],
    slot: "Q",
    name: "Volatile Flame Spirit",
    type: "summon",
    cooldown: 0,
    resource_cost: 0,
    damage: 0,
    radius: 0.6,
    range: 6,
    duration: 1,
    tick_interval: 1,
    effects: [
      {
        trigger: "on_cast",
        action: "summon",
        target: "target_position",
        duration: 1,
      },
      {
        trigger: "on_summon_expire",
        action: "aoe_damage",
        target: "summon_position",
        radius: 3,
        damage: 80,
      },
    ],
    description: "Summons a spirit that explodes at its position when it expires.",
  };
  return spec;
}

function makeProjectileCreatesBurningGroundSpec(): HeroPlayableSpec {
  const spec = cloneSpec();
  spec.skills[0] = {
    ...spec.skills[0],
    slot: "Q",
    name: "Fireseed Bolt",
    type: "projectile",
    cooldown: 0,
    resource_cost: 0,
    damage: 40,
    range: 20,
    radius: 0.5,
    speed: 20,
    effects: [
      {
        trigger: "on_cast",
        action: "spawn_projectile",
        target: "target_position",
      },
      {
        trigger: "on_projectile_hit",
        action: "damage",
        target: "target_enemy",
        damage: 40,
      },
      {
        trigger: "on_projectile_hit",
        action: "spawn_zone",
        target: "projectile_position",
        radius: 3,
        damage: 10,
        duration: 3,
        tick_interval: 1,
        status_effects: [
          {
            type: "burn",
            duration: 2,
            tick_interval: 1,
            damage: 6,
          },
        ],
      },
    ],
    description: "A projectile that blooms into burning ground on hit.",
  };
  return spec;
}

function makeProjectileHitVfxSpec(): HeroPlayableSpec {
  const spec = makeProjectileCreatesBurningGroundSpec();
  spec.skills[0].effects?.push({
    trigger: "on_projectile_hit",
    action: "spawn_vfx_event",
    target: "projectile_position",
    radius: 1,
  });
  return spec;
}

describe("event-driven skill effects", () => {
  it("summon can explode at its position when it expires", () => {
    const spec = makeExplodingSummonSpec();
    const enemy = createEnemy({ id: "dummy", position: { x: 2, z: 0 }, max_hp: 200 });
    const state = createInitialGameStateFromSpec(spec, { enemies: [enemy] });

    castSkill(state, spec, "Q", { x: 0, z: 0 });
    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(state.summons).toHaveLength(0);
    expect(enemy.hp).toBe(120);
    expect(state.events.some((event) => event.type === "summon_expired")).toBe(true);
    expect(
      state.events.some(
        (event) => event.type === "damage" && event.enemy_id === "dummy",
      ),
    ).toBe(true);
  });

  it("projectile can spawn burning ground on hit and the zone applies burn ticks", () => {
    const spec = makeProjectileCreatesBurningGroundSpec();
    const enemy = createEnemy({ id: "dummy", position: { x: 10, z: 0 }, max_hp: 200 });
    const state = createInitialGameStateFromSpec(spec, { enemies: [enemy] });

    castSkill(state, spec, "Q", { x: 20, z: 0 });
    updateSimulation(state, { x: 0, z: 0 }, 0.5);

    expect(enemy.hp).toBe(160);
    expect(state.active_zones).toHaveLength(1);
    expect(state.active_zones[0]).toMatchObject({
      radius: 3,
      damage: 10,
      is_alive: true,
    });

    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(enemy.hp).toBe(144);
    expect(enemy.status_effects[0]).toMatchObject({ type: "burn" });

    updateSimulation(state, { x: 0, z: 0 }, 1);

    expect(enemy.hp).toBeLessThan(144);
    expect(state.events.some((event) => event.type === "status_tick")).toBe(true);
  });

  it("spawn_vfx_event emits a runtime visual event at projectile hit position", () => {
    const spec = makeProjectileHitVfxSpec();
    const enemy = createEnemy({ id: "dummy", position: { x: 10, z: 0 }, max_hp: 200 });
    const state = createInitialGameStateFromSpec(spec, { enemies: [enemy] });

    castSkill(state, spec, "Q", { x: 20, z: 0 });
    updateSimulation(state, { x: 0, z: 0 }, 0.5);

    expect(
      state.events.some(
        (event) =>
          event.type === "vfx_event" &&
          event.skill_slot === "Q" &&
          event.usage === "hit_flash" &&
          event.position.x === 10,
      ),
    ).toBe(true);
  });
});
