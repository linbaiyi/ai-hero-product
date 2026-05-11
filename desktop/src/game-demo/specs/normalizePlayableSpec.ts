import type { HeroPlayableSpec, SkillSlot } from "./playableSpecTypes";
import { assertPlayableSpec } from "./playableSpecSchema";

const SKILL_ORDER: Record<SkillSlot, number> = {
  Q: 0,
  W: 1,
  E: 2,
  R: 3,
};

export function normalizePlayableSpec(input: unknown): HeroPlayableSpec {
  const spec = assertPlayableSpec(input);

  return {
    ...spec,
    gameplay_tags: spec.gameplay_tags.map((tag) => tag.trim()),
    skills: [...spec.skills].sort(
      (left, right) => SKILL_ORDER[left.slot] - SKILL_ORDER[right.slot],
    ),
  };
}
