import { describe, expect, it } from "vitest";
import {
  defaultSkillVfxRecipes,
  recipeHasUsage,
} from "../src/game-demo/renderer/skillVfxRecipes";

describe("skill VFX recipes", () => {
  it("Q recipe contains projectile, trail, and impact", () => {
    const recipe = defaultSkillVfxRecipes.Q;

    expect(recipeHasUsage(recipe, "projectile")).toBe(true);
    expect(recipeHasUsage(recipe, "trail")).toBe(true);
    expect(recipeHasUsage(recipe, "impact")).toBe(true);
  });

  it("W recipe contains ground_decal", () => {
    expect(recipeHasUsage(defaultSkillVfxRecipes.W, "ground_decal")).toBe(true);
  });

  it("E recipe contains aura", () => {
    expect(recipeHasUsage(defaultSkillVfxRecipes.E, "aura")).toBe(true);
  });

  it("R recipe contains ground_decal and impact", () => {
    expect(recipeHasUsage(defaultSkillVfxRecipes.R, "ground_decal")).toBe(true);
    expect(recipeHasUsage(defaultSkillVfxRecipes.R, "impact")).toBe(true);
  });

  it("missing usage can be skipped by composition system", () => {
    expect(recipeHasUsage(defaultSkillVfxRecipes.W, "projectile")).toBe(false);
  });
});
