import type {
  RuntimeVfxAssetEntry,
  RuntimeVfxAssetSpec,
  RuntimeVfxSlot,
} from "./runtimeVfxTypes";
import { assertRuntimeVfxAssetSpec } from "./runtimeVfxAssetSchema";

const SLOT_ORDER: RuntimeVfxSlot[] = ["Q", "W", "E", "R"];

export function normalizeRuntimeVfxAssetSpec(
  input: unknown,
): RuntimeVfxAssetSpec {
  const spec = assertRuntimeVfxAssetSpec(input);

  const skills = {} as RuntimeVfxAssetSpec["skills"];
  for (const slot of SLOT_ORDER) {
    const skill = spec.skills[slot];
    skills[slot] = {
      skill_name: skill.skill_name.trim(),
      skill_type: skill.skill_type,
      assets: normalizeAssets(skill.assets),
    };
  }

  return {
    version: "1.0",
    hero_id: spec.hero_id.trim(),
    map_profile: "default_training_arena",
    assets_base_path: spec.assets_base_path.trim(),
    skills,
  };
}

function normalizeAssets(
  assets: Record<string, RuntimeVfxAssetEntry>,
): Record<string, RuntimeVfxAssetEntry> {
  return Object.fromEntries(
    Object.entries(assets).map(([key, asset]) => [
      key,
      {
        ...asset,
        path: asset.path.trim(),
        color_tint: asset.color_tint?.trim(),
        follow_target: asset.follow_target?.trim(),
        loop: asset.loop ?? false,
      },
    ]),
  );
}
