import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  defaultRuntimeVfxAssetSpec,
  isRuntimeVfxAssetSpec,
  normalizeRuntimeVfxAssetSpec,
  validateRuntimeVfxAssetSpec,
} from "../src/game-demo/vfx-assets";

function cloneSpec(input: unknown = defaultRuntimeVfxAssetSpec): any {
  return JSON.parse(JSON.stringify(input));
}

function loadDocsExample(): any {
  const path = resolve(
    process.cwd(),
    "../docs/playable/RuntimeVfxAssetSpec.example.json",
  );
  return JSON.parse(readFileSync(path, "utf8"));
}

function firstAsset(spec: any) {
  return spec.skills.Q.assets[Object.keys(spec.skills.Q.assets)[0]];
}

function expectInvalid(spec: unknown) {
  expect(validateRuntimeVfxAssetSpec(spec).success).toBe(false);
}

describe("RuntimeVfxAssetSpec validation", () => {
  it("defaultRuntimeVfxAssetSpec passes validation", () => {
    const result = validateRuntimeVfxAssetSpec(defaultRuntimeVfxAssetSpec);

    expect(result.success).toBe(true);
  });

  it("docs example json passes validation", () => {
    const result = validateRuntimeVfxAssetSpec(loadDocsExample());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe("1.0");
      expect(Object.keys(result.data.skills)).toEqual(["Q", "W", "E", "R"]);
    }
  });

  it("invalid version fails", () => {
    const spec = cloneSpec();
    spec.version = "2.0";

    expectInvalid(spec);
  });

  it("missing skill slot fails", () => {
    const spec = cloneSpec();
    delete spec.skills.R;

    expectInvalid(spec);
  });

  it("extra skill slot fails", () => {
    const spec = cloneSpec();
    spec.skills.X = cloneSpec().skills.Q;

    expectInvalid(spec);
  });

  it("blank hero_id fails", () => {
    const spec = cloneSpec();
    spec.hero_id = "   ";

    expectInvalid(spec);
  });

  it("invalid usage fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).usage = "unknown";

    expectInvalid(spec);
  });

  it("invalid render_mode fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).render_mode = "mesh";

    expectInvalid(spec);
  });

  it("invalid blend_mode fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).blend_mode = "screen";

    expectInvalid(spec);
  });

  it("invalid color_tint fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).color_tint = "red";

    expectInvalid(spec);
  });

  it("scale must be positive", () => {
    const spec = cloneSpec();
    firstAsset(spec).scale = 0;

    expectInvalid(spec);
  });

  it("duration cannot be negative", () => {
    const spec = cloneSpec();
    firstAsset(spec).duration = -1;

    expectInvalid(spec);
  });

  it("opacity must be 0..1", () => {
    const spec = cloneSpec();
    firstAsset(spec).opacity = 2;

    expectInvalid(spec);
  });

  it("optional nullable asset fields pass validation", () => {
    const spec = cloneSpec();
    const asset = firstAsset(spec);
    asset.opacity = null;
    asset.rotation_speed = null;
    asset.spawn_offset = null;
    asset.follow_target = null;
    asset.color_tint = null;

    const result = validateRuntimeVfxAssetSpec(spec);

    expect(result.success).toBe(true);
    if (result.success) {
      const normalizedAsset =
        result.data.skills.Q.assets[Object.keys(result.data.skills.Q.assets)[0]];
      expect(normalizedAsset.opacity).toBeUndefined();
      expect(normalizedAsset.rotation_speed).toBeUndefined();
      expect(normalizedAsset.spawn_offset).toBeUndefined();
      expect(normalizedAsset.follow_target).toBeUndefined();
      expect(normalizedAsset.color_tint).toBeUndefined();
    }
  });

  it("empty path fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).path = "   ";

    expectInvalid(spec);
  });

  it("remote URL path fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).path = "https://example.com/a.png";

    expectInvalid(spec);
  });

  it("javascript path fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).path = "javascript:alert(1)";

    expectInvalid(spec);
  });

  it("parent traversal path fails", () => {
    const spec = cloneSpec();
    firstAsset(spec).path = "../secret.png";

    expectInvalid(spec);
  });

  it("ground_decal requires ground_plane", () => {
    const spec = cloneSpec();
    spec.skills.W.assets.ground_decal.render_mode = "sprite";

    expectInvalid(spec);
  });

  it("projectile skill requires projectile asset", () => {
    const spec = cloneSpec();
    delete spec.skills.Q.assets.projectile;

    expectInvalid(spec);
  });

  it("aoe_dot requires ground_decal", () => {
    const spec = cloneSpec();
    delete spec.skills.W.assets.ground_decal;

    expectInvalid(spec);
  });

  it("buff requires aura", () => {
    const spec = cloneSpec();
    spec.skills.Q.skill_type = "buff";
    spec.skills.Q.assets = {
      impact: spec.skills.Q.assets.impact,
    };

    expectInvalid(spec);
  });

  it("summon_body asset passes for summon skill", () => {
    const spec = cloneSpec();
    spec.skills.Q.skill_type = "summon";
    spec.skills.Q.assets = {
      summon_body: {
        path: "runtime_textures/Q_summon_body.png",
        usage: "summon_body",
        blend_mode: "alpha",
        render_mode: "sprite",
        scale: 1.6,
        duration: 8,
        loop: false,
        color_tint: "#ff5a1f",
      },
    };

    const result = validateRuntimeVfxAssetSpec(spec);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills.Q.skill_type).toBe("summon");
      expect(result.data.skills.Q.assets.summon_body.usage).toBe("summon_body");
    }
  });

  it("summon skill requires summon_body", () => {
    const spec = cloneSpec();
    spec.skills.Q.skill_type = "summon";
    spec.skills.Q.assets = {
      aura: {
        path: "runtime_textures/Q_summon_aura.png",
        usage: "aura",
        blend_mode: "additive",
        render_mode: "aura_ring",
        scale: 2,
        duration: 8,
        loop: true,
      },
    };

    expectInvalid(spec);
  });

  it("summon_body requires sprite or billboard plane", () => {
    const spec = cloneSpec();
    spec.skills.Q.skill_type = "summon";
    spec.skills.Q.assets = {
      summon_body: {
        path: "runtime_textures/Q_summon_body.png",
        usage: "summon_body",
        blend_mode: "alpha",
        render_mode: "ground_plane",
        scale: 1.6,
        duration: 8,
        loop: false,
      },
    };

    expectInvalid(spec);
  });

  it("status runtime vfx usages pass validation", () => {
    const spec = cloneSpec();
    spec.skills.Q.assets.status = {
      path: "runtime_textures/Q_burn_loop.png",
      usage: "burn_loop",
      blend_mode: "additive",
      render_mode: "sprite",
      scale: 1,
      duration: 3,
      loop: true,
    };

    expect(validateRuntimeVfxAssetSpec(spec).success).toBe(true);
  });

  it("normalizeRuntimeVfxAssetSpec sorts skills Q/W/E/R", () => {
    const spec = cloneSpec();
    spec.skills = {
      R: spec.skills.R,
      W: spec.skills.W,
      E: spec.skills.E,
      Q: spec.skills.Q,
    };

    const normalized = normalizeRuntimeVfxAssetSpec(spec);

    expect(Object.keys(normalized.skills)).toEqual(["Q", "W", "E", "R"]);
  });

  it("isRuntimeVfxAssetSpec returns true for valid input", () => {
    expect(isRuntimeVfxAssetSpec(defaultRuntimeVfxAssetSpec)).toBe(true);
  });

  it("isRuntimeVfxAssetSpec returns false for invalid input", () => {
    const spec = cloneSpec();
    spec.hero_id = "";

    expect(isRuntimeVfxAssetSpec(spec)).toBe(false);
  });
});
