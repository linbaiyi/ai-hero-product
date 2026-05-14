import type {
  SkillEffectSpec,
  SkillEffectTarget,
  SkillEffectTrigger,
  SkillSlot,
} from "../../specs/playableSpecTypes";
import type { EnemyState, SummonState, Vec2, ZoneState } from "../types";

export type SkillEffectContext = {
  skill_slot: SkillSlot;
  target_position?: Vec2;
  effect_position?: Vec2;
  target_enemy?: EnemyState;
  summon?: SummonState;
  zone?: ZoneState;
};

export type ResolvedEffectTarget = {
  position?: Vec2;
  enemy?: EnemyState;
};

export type { SkillEffectSpec, SkillEffectTarget, SkillEffectTrigger };
