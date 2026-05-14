import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import { normalizePlayableSpec } from "../src/game-demo/specs/normalizePlayableSpec";
import {
  isPlayableSpec,
  validatePlayableSpec,
} from "../src/game-demo/specs/playableSpecSchema";
import type { HeroPlayableSpec, SkillSpec } from "../src/game-demo/specs/playableSpecTypes";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const docsExamplePath = path.join(
  repoRoot,
  "docs",
  "playable",
  "HeroPlayableSpec.example.json",
);

function cloneSpec(spec: HeroPlayableSpec = defaultPlayableSpec): HeroPlayableSpec {
  return JSON.parse(JSON.stringify(spec)) as HeroPlayableSpec;
}

function loadDocsExample(): HeroPlayableSpec {
  return JSON.parse(readFileSync(docsExamplePath, "utf-8")) as HeroPlayableSpec;
}

function expectInvalid(spec: unknown) {
  const result = validatePlayableSpec(spec);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.errors.length).toBeGreaterThan(0);
  }
}

describe("HeroPlayableSpec desktop validation", () => {
  it("valid defaultPlayableSpec passes", () => {
    const result = validatePlayableSpec(defaultPlayableSpec);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe("1.0");
      expect(result.data.skills.map((skill) => skill.slot).sort()).toEqual([
        "E",
        "Q",
        "R",
        "W",
      ]);
    }
  });

  it("docs example json passes", () => {
    const result = validatePlayableSpec(loadDocsExample());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(new Set(result.data.skills.map((skill) => skill.slot))).toEqual(
        new Set(["Q", "W", "E", "R"]),
      );
    }
  });

  it("accepts null optional numeric fields from backend serialization", () => {
    const spec = cloneSpec();
    for (const skill of spec.skills) {
      skill.damage ??= null as unknown as number;
      skill.range ??= null as unknown as number;
      skill.radius ??= null as unknown as number;
      skill.speed ??= null as unknown as number;
      skill.duration ??= null as unknown as number;
      skill.tick_interval ??= null as unknown as number;
      skill.distance ??= null as unknown as number;
    }

    const result = validatePlayableSpec(spec);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills.map((skill) => skill.slot).sort()).toEqual([
        "E",
        "Q",
        "R",
        "W",
      ]);
    }
  });

  it("invalid version fails", () => {
    expectInvalid({ ...cloneSpec(), version: "2.0" });
  });

  it("invalid skill type fails", () => {
    const spec = cloneSpec();
    spec.skills[0].type = "summon_beast" as SkillSpec["type"];

    expectInvalid(spec);
  });

  it("summon skill type passes with duration", () => {
    const spec = cloneSpec();
    spec.skills[0] = {
      ...spec.skills[0],
      type: "summon",
      duration: 6,
      damage: 15,
      radius: 0.7,
      range: 7,
      tick_interval: 1,
    };

    expect(validatePlayableSpec(spec).success).toBe(true);
  });

  it("status effects pass validation", () => {
    const spec = cloneSpec();
    spec.skills[0].status_effects = [
      {
        type: "burn",
        duration: 3,
        tick_interval: 1,
        damage: 10,
      },
    ];

    expect(validatePlayableSpec(spec).success).toBe(true);
  });

  it("duplicate skill slot fails", () => {
    const spec = cloneSpec();
    spec.skills[1].slot = "Q";

    expectInvalid(spec);
  });

  it("missing skill slot fails", () => {
    const spec = cloneSpec();
    spec.skills = spec.skills.filter((skill) => skill.slot !== "R");

    expectInvalid(spec);
  });

  it("extra skill fails", () => {
    const spec = cloneSpec();
    spec.skills.push({ ...spec.skills[0], name: "Extra Fireball" });

    expectInvalid(spec);
  });

  it("negative damage fails", () => {
    const spec = cloneSpec();
    spec.skills[0].damage = -1;

    expectInvalid(spec);
  });

  it("negative cooldown fails", () => {
    const spec = cloneSpec();
    spec.skills[0].cooldown = -1;

    expectInvalid(spec);
  });

  it("invalid hex color fails", () => {
    const spec = cloneSpec();
    spec.skills[0].vfx.color = "red";

    expectInvalid(spec);
  });

  it("projectile requires speed", () => {
    const spec = cloneSpec();
    delete spec.skills[0].speed;

    expectInvalid(spec);
  });

  it("aoe_dot requires tick_interval", () => {
    const spec = cloneSpec();
    const skill = spec.skills.find((item) => item.type === "aoe_dot");
    expect(skill).toBeDefined();
    delete skill!.tick_interval;

    expectInvalid(spec);
  });

  it("buff requires duration", () => {
    const spec = cloneSpec();
    spec.skills[0] = {
      slot: "Q",
      name: "Flame Guard",
      type: "buff",
      cooldown: 12,
      resource_cost: 30,
      description: "Creates a short-lived flame shield.",
      vfx: {
        theme: "fire",
        color: "#ff5a1f",
        shape: "shield",
        impact: "flame_guard",
        trail: "ember_ring",
      },
    };

    expectInvalid(spec);
  });

  it("blank hero name fails", () => {
    const spec = cloneSpec();
    spec.hero.name = "   ";

    expectInvalid(spec);
  });

  it("skill effects pass validation", () => {
    const spec = cloneSpec();
    spec.skills[0].effects = [
      {
        trigger: "on_cast",
        action: "spawn_projectile",
        target: "target_position",
      },
      {
        trigger: "on_projectile_hit",
        action: "spawn_zone",
        target: "projectile_position",
        radius: 3,
        damage: 10,
        duration: 4,
        tick_interval: 1,
        status_effects: [
          {
            type: "burn",
            duration: 3,
            tick_interval: 1,
            damage: 6,
          },
        ],
      },
    ];

    const result = validatePlayableSpec(spec);

    expect(result.success).toBe(true);
  });

  it("invalid skill effect trigger fails", () => {
    const spec = cloneSpec();
    spec.skills[0].effects = [
      {
        trigger: "after_everything",
        action: "damage",
        target: "target_enemy",
        damage: 10,
      },
    ] as never;

    expectInvalid(spec);
  });

  it("normalize sorts skills by QWER", () => {
    const spec = cloneSpec();
    spec.skills = [spec.skills[2], spec.skills[3], spec.skills[1], spec.skills[0]];

    const normalized = normalizePlayableSpec(spec);

    expect(normalized.skills.map((skill) => skill.slot)).toEqual(["Q", "W", "E", "R"]);
  });

  it("isPlayableSpec returns true for valid spec", () => {
    expect(isPlayableSpec(defaultPlayableSpec)).toBe(true);
  });

  it("isPlayableSpec returns false for invalid spec", () => {
    expect(isPlayableSpec({ ...cloneSpec(), version: "2.0" })).toBe(false);
  });
});
