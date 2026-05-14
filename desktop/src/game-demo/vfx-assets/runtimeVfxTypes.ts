export type RuntimeVfxSlot = "Q" | "W" | "E" | "R";

export type RuntimeVfxSkillType =
  | "projectile"
  | "aoe"
  | "aoe_dot"
  | "dash"
  | "buff"
  | "summon";

export type RuntimeVfxUsage =
  | "projectile"
  | "impact"
  | "ground_decal"
  | "aura"
  | "trail"
  | "summon_body"
  | "burn_loop"
  | "poison_cloud"
  | "mark_sigil"
  | "mark_sigial"
  | "stun_stars";

export type RuntimeVfxRenderMode =
  | "sprite"
  | "ground_plane"
  | "billboard_plane"
  | "sprite_trail"
  | "aura_ring";

export type RuntimeVfxBlendMode = "alpha" | "additive" | "normal";

export interface RuntimeVfxSpawnOffset {
  x?: number;
  y?: number;
  z?: number;
}

export interface RuntimeVfxAssetEntry {
  path: string;
  usage: RuntimeVfxUsage;
  blend_mode: RuntimeVfxBlendMode;
  render_mode: RuntimeVfxRenderMode;
  scale: number;
  duration: number;
  loop: boolean;
  color_tint?: string;
  opacity?: number;
  rotation_speed?: number;
  spawn_offset?: RuntimeVfxSpawnOffset;
  follow_target?: string;
}

export interface RuntimeVfxSkillSpec {
  skill_name: string;
  skill_type: RuntimeVfxSkillType;
  assets: Record<string, RuntimeVfxAssetEntry>;
}

export interface RuntimeVfxAssetSpec {
  version: "1.0";
  hero_id: string;
  map_profile: "default_training_arena";
  assets_base_path: string;
  skills: Record<RuntimeVfxSlot, RuntimeVfxSkillSpec>;
}
