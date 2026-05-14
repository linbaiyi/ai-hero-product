export type SkillSlot = "Q" | "W" | "E" | "R";

export type SkillType =
  | "projectile"
  | "aoe"
  | "aoe_dot"
  | "dash"
  | "buff"
  | "summon";

export type VfxTheme =
  | "fire"
  | "ice"
  | "thunder"
  | "poison"
  | "dark"
  | "holy"
  | "arcane"
  | "wind"
  | "earth";

export type VfxShape =
  | "fireball"
  | "beam"
  | "circle_zone"
  | "meteor"
  | "slash"
  | "trail"
  | "shield"
  | "burst"
  | "wave"
  | "rune";

export type ResourceType = "mana" | "energy" | "rage" | "none";

export type StatusEffectType = "burn" | "poison" | "slow" | "mark" | "stun";

export type SkillStatusEffectSpec = {
  type: StatusEffectType;
  duration: number;
  tick_interval?: number;
  damage?: number;
  value?: number;
};

export type SkillEffectTrigger =
  | "on_cast"
  | "on_projectile_hit"
  | "on_zone_tick"
  | "on_zone_expire"
  | "on_summon_attack"
  | "on_summon_expire"
  | "on_summon_death"
  | "on_status_tick"
  | "on_status_expire";

export type SkillEffectAction =
  | "damage"
  | "aoe_damage"
  | "apply_status"
  | "spawn_zone"
  | "summon"
  | "spawn_projectile"
  | "spawn_vfx_event";

export type SkillEffectTarget =
  | "self"
  | "target_position"
  | "target_enemy"
  | "enemies_in_radius"
  | "projectile_position"
  | "summon_position"
  | "zone_center";

export type SkillEffectSpec = {
  trigger: SkillEffectTrigger;
  action: SkillEffectAction;
  target: SkillEffectTarget;
  damage?: number;
  radius?: number;
  duration?: number;
  tick_interval?: number;
  status_effects?: SkillStatusEffectSpec[];
};

export type VfxSpec = {
  theme: VfxTheme;
  color: string;
  shape: VfxShape;
  impact: string;
  trail: string;
};

export type SkillSpec = {
  slot: SkillSlot;
  name: string;
  type: SkillType;
  cooldown: number;
  resource_cost: number;
  damage?: number;
  range?: number;
  radius?: number;
  speed?: number;
  duration?: number;
  tick_interval?: number;
  distance?: number;
  status_effects?: SkillStatusEffectSpec[];
  effects?: SkillEffectSpec[];
  description: string;
  vfx: VfxSpec;
};

export type HeroSpec = {
  id: string;
  name: string;
  title: string;
  role: string;
  max_hp: number;
  move_speed: number;
  attack_damage: number;
  attack_range: number;
  resource_type: ResourceType;
  max_resource: number;
};

export type RuntimeSpec = {
  control_scheme: "wasd_mouse";
  camera: "third_person_follow";
  map_profile: "default_training_arena";
};

export type HeroPlayableSpec = {
  version: "1.0";
  hero: HeroSpec;
  gameplay_tags: string[];
  skills: SkillSpec[];
  runtime: RuntimeSpec;
};
