import type {
  ResourceType,
  SkillSlot,
  SkillStatusEffectSpec,
  StatusEffectType,
} from "../specs/playableSpecTypes";

export type Vec2 = {
  x: number;
  z: number;
};

export type WorldBounds = {
  min_x: number;
  max_x: number;
  min_z: number;
  max_z: number;
};

export type CooldownState = Record<string, number>;

export type HeroState = {
  id: string;
  name: string;
  position: Vec2;
  facing: Vec2;
  max_hp: number;
  hp: number;
  move_speed: number;
  attack_damage: number;
  attack_range: number;
  resource_type: ResourceType;
  max_resource: number;
  resource: number;
  cooldowns: CooldownState;
};

export type EnemyState = {
  id: string;
  name: string;
  position: Vec2;
  max_hp: number;
  hp: number;
  radius: number;
  is_alive: boolean;
  status_effects: EnemyStatusEffectState[];
};

export type GameState = {
  time: number;
  hero: HeroState;
  enemies: EnemyState[];
  world: WorldBounds;
  projectiles: ProjectileState[];
  active_zones: ZoneState[];
  buffs: BuffState[];
  summons: SummonState[];
  events: GameEvent[];
};

export type SimulationConfig = {
  world?: WorldBounds;
  enemies?: EnemyState[];
};

export type MoveInput = Vec2;

export type DamageEvent = {
  enemy_id: string;
  amount: number;
  remaining_hp: number;
  is_alive: boolean;
};

export type CooldownKey = SkillSlot | string;

export type ProjectileState = {
  id: string;
  skill_slot: SkillSlot;
  position: Vec2;
  direction: Vec2;
  speed: number;
  radius: number;
  damage: number;
  remaining_range: number;
  status_effects: SkillStatusEffectSpec[];
  is_alive: boolean;
};

export type ZoneState = {
  id: string;
  skill_slot: SkillSlot;
  center: Vec2;
  radius: number;
  damage: number;
  duration_remaining: number;
  tick_interval: number;
  tick_timer: number;
  status_effects: SkillStatusEffectSpec[];
  is_alive: boolean;
};

export type BuffState = {
  id: string;
  skill_slot: SkillSlot;
  stat: "move_speed";
  value: number;
  duration_remaining: number;
  original_value: number;
};

export type SummonState = {
  id: string;
  skill_slot: SkillSlot;
  name: string;
  position: Vec2;
  max_hp: number;
  hp: number;
  radius: number;
  damage: number;
  attack_range: number;
  attack_interval: number;
  attack_timer: number;
  duration_remaining: number;
  status_effects: SkillStatusEffectSpec[];
  is_alive: boolean;
};

export type EnemyStatusEffectState = {
  id: string;
  type: StatusEffectType;
  source_skill_slot: SkillSlot;
  duration_remaining: number;
  tick_interval: number;
  tick_timer: number;
  damage: number;
  value: number;
};

export type GameEvent =
  | {
      type: "skill_cast";
      skill_slot: SkillSlot;
      skill_type: string;
      target?: Vec2;
      radius?: number;
    }
  | { type: "skill_failed"; skill_slot?: string; reason: string }
  | { type: "damage"; enemy_id: string; amount: number; remaining_hp: number }
  | { type: "projectile_spawned"; projectile_id: string; skill_slot: SkillSlot }
  | { type: "projectile_hit"; projectile_id: string; enemy_id: string }
  | { type: "zone_spawned"; zone_id: string; skill_slot: SkillSlot }
  | { type: "zone_tick"; zone_id: string; hit_enemy_ids: string[] }
  | { type: "dash"; skill_slot: SkillSlot; from: Vec2; to: Vec2 }
  | { type: "buff_applied"; buff_id: string; skill_slot: SkillSlot; stat: "move_speed" }
  | { type: "buff_expired"; buff_id: string; skill_slot: SkillSlot; stat: "move_speed" }
  | { type: "summon_spawned"; summon_id: string; skill_slot: SkillSlot }
  | {
      type: "summon_attack";
      summon_id: string;
      enemy_id: string;
      amount: number;
      remaining_hp: number;
    }
  | { type: "summon_expired"; summon_id: string; skill_slot: SkillSlot }
  | {
      type: "status_applied";
      enemy_id: string;
      status_type: StatusEffectType;
      skill_slot: SkillSlot;
    }
  | {
      type: "status_tick";
      enemy_id: string;
      status_type: StatusEffectType;
      amount: number;
      remaining_hp: number;
    }
  | { type: "status_expired"; enemy_id: string; status_type: StatusEffectType };
