import type { SkillSpec } from "../../specs/playableSpecTypes";
import type { BuffState, GameEvent, GameState } from "../types";

const MOVE_SPEED_BUFF_MULTIPLIER = 1.2;

export function castBuffSkill(state: GameState, skill: SkillSpec): GameEvent[] {
  const existing = state.buffs.find(
    (buff) => buff.skill_slot === skill.slot && buff.stat === "move_speed",
  );

  if (existing) {
    existing.duration_remaining = skill.duration ?? existing.duration_remaining;
    return [
      {
        type: "buff_applied",
        buff_id: existing.id,
        skill_slot: skill.slot,
        stat: "move_speed",
      },
    ];
  }

  const buff: BuffState = {
    id: createBuffId(state),
    skill_slot: skill.slot,
    stat: "move_speed",
    // v1 has no numeric buff field, so this conservative default is +20% move speed.
    value: MOVE_SPEED_BUFF_MULTIPLIER,
    duration_remaining: skill.duration ?? 0,
    original_value: state.hero.move_speed,
  };
  state.hero.move_speed = buff.original_value * buff.value;
  state.buffs.push(buff);

  return [
    {
      type: "buff_applied",
      buff_id: buff.id,
      skill_slot: skill.slot,
      stat: "move_speed",
    },
  ];
}

export function updateBuffs(state: GameState, delta_time: number): GameEvent[] {
  const events: GameEvent[] = [];
  const delta = Math.max(0, delta_time);

  for (const buff of state.buffs) {
    buff.duration_remaining = Math.max(0, buff.duration_remaining - delta);
    if (buff.duration_remaining <= 0) {
      state.hero.move_speed = buff.original_value;
      events.push({
        type: "buff_expired",
        buff_id: buff.id,
        skill_slot: buff.skill_slot,
        stat: buff.stat,
      });
    }
  }

  state.buffs = state.buffs.filter((buff) => buff.duration_remaining > 0);
  state.events.push(...events);
  return events;
}

function createBuffId(state: GameState): string {
  return `buff_${state.time}_${state.buffs.length + 1}`;
}
