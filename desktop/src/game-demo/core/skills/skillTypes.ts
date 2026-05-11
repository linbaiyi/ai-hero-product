import type { SkillSlot } from "../../specs/playableSpecTypes";
import type { GameEvent } from "../types";

export type { GameEvent } from "../types";

export type CastSkillResult = {
  success: boolean;
  reason?: string;
  skill_slot?: SkillSlot;
  events: GameEvent[];
};

export function createSuccessResult(
  skill_slot: SkillSlot,
  events: GameEvent[],
): CastSkillResult {
  return { success: true, skill_slot, events };
}

export function createFailedResult(
  reason: string,
  skill_slot?: string,
): CastSkillResult {
  return {
    success: false,
    reason,
    events: [{ type: "skill_failed", skill_slot, reason }],
  };
}
