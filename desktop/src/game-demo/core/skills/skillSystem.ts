import type { HeroPlayableSpec, SkillSlot, SkillSpec } from "../../specs/playableSpecTypes";
import { normalizePlayableSpec } from "../../specs/normalizePlayableSpec";
import { isCooldownReady, setCooldown } from "../cooldown";
import type { GameEvent, GameState, Vec2 } from "../types";
import { castAoeDotSkill } from "./aoeDotSkill";
import { castAoeSkill } from "./aoeSkill";
import { castBuffSkill } from "./buffSkill";
import { castDashSkill } from "./dashSkill";
import { castProjectileSkill } from "./projectileSkill";
import { castSummonSkill } from "./summonSkill";
import type { CastSkillResult } from "./skillTypes";
import { createFailedResult, createSuccessResult } from "./skillTypes";

const VALID_SLOTS = new Set<string>(["Q", "W", "E", "R"]);

export function castSkill(
  state: GameState,
  spec: HeroPlayableSpec,
  slot: SkillSlot | string,
  target: Vec2,
): CastSkillResult {
  if (!VALID_SLOTS.has(slot)) {
    return fail(state, "unknown skill slot", slot);
  }

  const normalizedSpec = normalizePlayableSpec(spec);
  const skill = normalizedSpec.skills.find((item) => item.slot === slot);
  if (!skill) {
    return fail(state, "skill not found", slot);
  }

  if (!isCooldownReady(state.hero.cooldowns, skill.slot)) {
    return fail(state, "skill is on cooldown", skill.slot);
  }

  if (state.hero.resource < skill.resource_cost) {
    return fail(state, "not enough resource", skill.slot);
  }

  const skillEvents = castByType(state, skill, target);
  state.hero.resource = Math.max(0, state.hero.resource - skill.resource_cost);
  setCooldown(state.hero.cooldowns, skill.slot, skill.cooldown);

  const events: GameEvent[] = [
    {
      type: "skill_cast",
      skill_slot: skill.slot,
      skill_type: skill.type,
      target,
      radius: skill.radius ?? undefined,
    },
    ...skillEvents,
  ];
  state.events.push(...events);
  return createSuccessResult(skill.slot, events);
}

function castByType(state: GameState, skill: SkillSpec, target: Vec2): GameEvent[] {
  switch (skill.type) {
    case "projectile":
      return castProjectileSkill(state, skill, target);
    case "aoe":
      return castAoeSkill(state, skill, target);
    case "aoe_dot":
      return castAoeDotSkill(state, skill, target);
    case "dash":
      return castDashSkill(state, skill, target);
    case "buff":
      return castBuffSkill(state, skill);
    case "summon":
      return castSummonSkill(state, skill, target);
  }
}

function fail(state: GameState, reason: string, slot?: string): CastSkillResult {
  const result = createFailedResult(reason, slot);
  state.events.push(...result.events);
  return result;
}
