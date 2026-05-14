import type { HeroPlayableSpec, SkillSlot, SkillSpec } from "../../specs/playableSpecTypes";
import { normalizePlayableSpec } from "../../specs/normalizePlayableSpec";
import { isCooldownReady, setCooldown } from "../cooldown";
import { executeSkillEffects } from "../effects/effectExecutor";
import { getSkillEffects } from "../effects/effectTriggers";
import type { GameEvent, GameState, Vec2 } from "../types";
import { castBuffSkill } from "./buffSkill";
import { castDashSkill } from "./dashSkill";
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
  const effectEvents = executeSkillEffects(
    state,
    skill,
    getSkillEffects(skill),
    "on_cast",
    { skill_slot: skill.slot, target_position: target },
  );
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
    ...effectEvents,
  ];
  state.events.push(...events);
  return createSuccessResult(skill.slot, events);
}

function castByType(state: GameState, skill: SkillSpec, target: Vec2): GameEvent[] {
  switch (skill.type) {
    case "projectile":
    case "aoe":
    case "aoe_dot":
    case "summon":
      return [];
    case "dash":
      return castDashSkill(state, skill, target);
    case "buff":
      return castBuffSkill(state, skill);
  }
}

function fail(state: GameState, reason: string, slot?: string): CastSkillResult {
  const result = createFailedResult(reason, slot);
  state.events.push(...result.events);
  return result;
}
