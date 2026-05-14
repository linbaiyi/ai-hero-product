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
  | "hit_flash"
  | "ground_decal"
  | "aura"
  | "trail"
  | "summon_body"
  | "cast_flash"
  | "cast_circle"
  | "zone_tick"
  | "summon_spawn"
  | "summon_idle"
  | "summon_expire"
  | "status_loop"
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
export type RuntimeVfxTrigger =
  | "on_cast"
  | "on_projectile_hit"
  | "on_zone_tick"
  | "on_zone_expire"
  | "on_summon_attack"
  | "on_summon_expire"
  | "on_summon_death"
  | "on_status_tick"
  | "on_status_expire";
export type RuntimeVfxAction =
  | "damage"
  | "aoe_damage"
  | "apply_status"
  | "spawn_zone"
  | "summon"
  | "spawn_projectile"
  | "spawn_vfx_event";

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
  trigger?: RuntimeVfxTrigger;
  action?: RuntimeVfxAction;
  effect_index?: number;
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
