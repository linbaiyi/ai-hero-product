import type { CooldownKey, CooldownState } from "./types";

export function createCooldownState(): CooldownState {
  return {};
}

export function setCooldown(
  cooldowns: CooldownState,
  key: CooldownKey,
  duration: number,
): CooldownState {
  cooldowns[key] = Math.max(0, duration);
  return cooldowns;
}

export function tickCooldowns(
  cooldowns: CooldownState,
  delta_time: number,
): CooldownState {
  const delta = Math.max(0, delta_time);
  for (const key of Object.keys(cooldowns)) {
    cooldowns[key] = Math.max(0, cooldowns[key] - delta);
  }
  return cooldowns;
}

export function isCooldownReady(
  cooldowns: CooldownState,
  key: CooldownKey,
): boolean {
  return getCooldownRemaining(cooldowns, key) <= 0;
}

export function getCooldownRemaining(
  cooldowns: CooldownState,
  key: CooldownKey,
): number {
  return Math.max(0, cooldowns[key] ?? 0);
}
