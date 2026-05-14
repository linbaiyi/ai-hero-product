import type { SkillEffectSpec, SkillSpec } from "../../specs/playableSpecTypes";

export function getSkillEffects(skill: SkillSpec): SkillEffectSpec[] {
  if (skill.effects && skill.effects.length > 0) {
    return skill.effects;
  }
  return createLegacySkillEffects(skill);
}

function createLegacySkillEffects(skill: SkillSpec): SkillEffectSpec[] {
  switch (skill.type) {
    case "projectile":
      return [
        {
          trigger: "on_cast",
          action: "spawn_projectile",
          target: "target_position",
        },
        {
          trigger: "on_projectile_hit",
          action: "damage",
          target: "target_enemy",
          damage: skill.damage ?? 0,
        },
        ...(skill.status_effects?.length
          ? [
              {
                trigger: "on_projectile_hit",
                action: "apply_status",
                target: "target_enemy",
                status_effects: skill.status_effects,
              } satisfies SkillEffectSpec,
            ]
          : []),
      ];
    case "aoe":
      return [
        {
          trigger: "on_cast",
          action: "aoe_damage",
          target: "enemies_in_radius",
          radius: skill.radius ?? 0,
          damage: skill.damage ?? 0,
        },
      ];
    case "aoe_dot":
      return [
        {
          trigger: "on_cast",
          action: "spawn_zone",
          target: "target_position",
          radius: skill.radius ?? 0,
          damage: skill.damage ?? 0,
          duration: skill.duration ?? 0,
          tick_interval: skill.tick_interval ?? 1,
          status_effects: skill.status_effects ?? [],
        },
      ];
    case "summon":
      return [
        {
          trigger: "on_cast",
          action: "summon",
          target: "target_position",
        },
      ];
    case "dash":
    case "buff":
      return [];
  }
}
