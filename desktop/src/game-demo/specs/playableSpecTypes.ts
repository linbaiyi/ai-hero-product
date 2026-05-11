export type SkillSlot = "Q" | "W" | "E" | "R";

export type SkillType = "projectile" | "aoe" | "aoe_dot" | "dash" | "buff";

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
