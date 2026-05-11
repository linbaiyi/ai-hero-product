import type { HeroPlayableSpec } from "../specs/playableSpecTypes";
import type { HeroState, Vec2 } from "./types";
import { createCooldownState } from "./cooldown";
import { normalizeVec2 } from "./vector";

export function createHeroFromPlayableSpec(spec: HeroPlayableSpec): HeroState {
  return {
    id: spec.hero.id,
    name: spec.hero.name,
    position: { x: 0, z: 0 },
    facing: { x: 0, z: 1 },
    max_hp: spec.hero.max_hp,
    hp: spec.hero.max_hp,
    move_speed: spec.hero.move_speed,
    attack_damage: spec.hero.attack_damage,
    attack_range: spec.hero.attack_range,
    resource_type: spec.hero.resource_type,
    max_resource: spec.hero.max_resource,
    resource: spec.hero.max_resource,
    cooldowns: createCooldownState(),
  };
}

export function setHeroFacing(hero: HeroState, direction: Vec2): HeroState {
  const facing = normalizeVec2(direction);
  if (facing.x === 0 && facing.z === 0) {
    return hero;
  }
  hero.facing = facing;
  return hero;
}

export function restoreHeroResource(hero: HeroState, amount: number): HeroState {
  hero.resource = Math.min(hero.max_resource, Math.max(0, hero.resource + amount));
  return hero;
}
