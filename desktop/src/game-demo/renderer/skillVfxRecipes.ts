import type { RuntimeVfxSlot, RuntimeVfxUsage } from "../vfx-assets";

export type SkillVfxTrigger = "cast" | "travel" | "hit" | "active" | "expire";

export type SkillVfxRecipeItem = {
  usage: RuntimeVfxUsage;
  trigger: SkillVfxTrigger;
  follow?: "hero" | "projectile" | "zone" | "summon" | "none";
  duration?: number;
};

export type SkillVfxRecipe = {
  slot: RuntimeVfxSlot;
  items: SkillVfxRecipeItem[];
};

export const defaultSkillVfxRecipes: Record<RuntimeVfxSlot, SkillVfxRecipe> = {
  Q: {
    slot: "Q",
    items: [
      { usage: "projectile", trigger: "travel", follow: "projectile" },
      { usage: "trail", trigger: "travel", follow: "none", duration: 0.28 },
      { usage: "impact", trigger: "hit", follow: "none", duration: 0.4 },
    ],
  },
  W: {
    slot: "W",
    items: [{ usage: "ground_decal", trigger: "active", follow: "zone" }],
  },
  E: {
    slot: "E",
    items: [
      { usage: "summon_body", trigger: "active", follow: "summon" },
      { usage: "aura", trigger: "active", follow: "summon" },
      { usage: "ground_decal", trigger: "active", follow: "summon" },
    ],
  },
  R: {
    slot: "R",
    items: [
      { usage: "ground_decal", trigger: "active", follow: "zone" },
      { usage: "impact", trigger: "hit", follow: "none", duration: 0.65 },
      { usage: "impact", trigger: "expire", follow: "none", duration: 0.65 },
    ],
  },
};

export function getSkillVfxRecipe(slot: RuntimeVfxSlot): SkillVfxRecipe {
  return defaultSkillVfxRecipes[slot];
}

export function recipeHasUsage(
  recipe: SkillVfxRecipe,
  usage: RuntimeVfxUsage,
): boolean {
  return recipe.items.some((item) => item.usage === usage);
}
