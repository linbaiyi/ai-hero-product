import { describe, expect, it } from "vitest";
import type { EnemyStatusEffectState } from "../src/game-demo/core";
import {
  getStatusDamageTakenMultiplier,
  getStatusEffectLabel,
  getStatusMovementMultiplier,
  getStatusTickDamage,
  isActionBlockedByStatus,
} from "../src/game-demo/core/statusRules";

function effect(
  type: EnemyStatusEffectState["type"],
  overrides: Partial<EnemyStatusEffectState> = {},
): EnemyStatusEffectState {
  return {
    id: `${type}_1`,
    type,
    source_skill_slot: "Q",
    duration_remaining: 3,
    tick_interval: 1,
    tick_timer: 1,
    damage: 10,
    value: 0,
    ...overrides,
  };
}

describe("status effect runtime rules", () => {
  it("maps status labels for playtest display", () => {
    expect(getStatusEffectLabel("burn")).toBe("灼烧");
    expect(getStatusEffectLabel("mark")).toBe("易伤");
  });

  it("slow reduces movement multiplier", () => {
    expect(getStatusMovementMultiplier([effect("slow")])).toBeCloseTo(0.65);
  });

  it("stun blocks action and movement", () => {
    const effects = [effect("stun")];

    expect(isActionBlockedByStatus(effects)).toBe(true);
    expect(getStatusMovementMultiplier(effects)).toBe(0);
  });

  it("mark increases damage taken", () => {
    expect(getStatusDamageTakenMultiplier([effect("mark", { value: 0.5 })])).toBe(1.5);
  });

  it("burn and poison use different tick damage rules", () => {
    expect(getStatusTickDamage(effect("burn", { damage: 10 }))).toBe(10);
    expect(getStatusTickDamage(effect("poison", { damage: 10 }))).toBe(8);
  });
});
