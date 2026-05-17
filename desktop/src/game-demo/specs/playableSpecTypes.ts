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

export type War3CastType =
  | "instant"
  | "unit_target"
  | "point_target"
  | "area_target"
  | "self"
  | "passive"
  | "toggle"
  | "channel";

export type War3TargetType =
  | "none"
  | "self"
  | "enemy_unit"
  | "ally_unit"
  | "point"
  | "area"
  | "summoned_unit";

export type War3EffectKind =
  | "damage"
  | "heal"
  | "buff"
  | "debuff"
  | "summon"
  | "missile"
  | "area_persistent"
  | "movement"
  | "vfx_only";

export type War3ArtHook =
  | "cast"
  | "missile"
  | "impact"
  | "area"
  | "buff"
  | "summon"
  | "death"
  | "loop";

export type War3AbilityLevelSpec = {
  level: number;
  cooldown: number;
  resource_cost: number;
  damage?: number;
  area?: number;
  duration?: number;
  notes?: string;
};

export type War3TargetFilters = {
  allowed: War3TargetType[];
  enemy: boolean;
  ally: boolean;
  self: boolean;
  ground: boolean;
  summoned: boolean;
};

export type War3MissileSpec = {
  enabled: boolean;
  speed?: number;
  arc?: number;
  homing: boolean;
};

export type War3AreaSpec = {
  enabled: boolean;
  radius?: number;
  duration?: number;
  tick_interval?: number;
};

export type War3BuffSpec = {
  enabled: boolean;
  buff_type?: StatusEffectType;
  duration?: number;
  tick_interval?: number;
  value?: number;
};

export type War3SummonSpec = {
  enabled: boolean;
  unit_name?: string;
  duration?: number;
  attack_damage?: number;
  attack_range?: number;
};

export type War3ArtBindingSpec = {
  hook: War3ArtHook;
  event?: SkillEffectTrigger;
  usage: string;
  attachment?: string;
};

export type War3AbilityContract = {
  ability_id: string;
  base_order: string;
  cast_type: War3CastType;
  primary_target: War3TargetType;
  target_filters: War3TargetFilters;
  effect_kinds: War3EffectKind[];
  levels: War3AbilityLevelSpec[];
  missile: War3MissileSpec;
  area: War3AreaSpec;
  buff: War3BuffSpec;
  summon: War3SummonSpec;
  art_bindings: War3ArtBindingSpec[];
  unsupported_notes: string[];
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
  ability_contract?: War3AbilityContract;
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
