import type { HeroState, MoveInput, WorldBounds } from "./types";
import { addVec2, normalizeVec2, scaleVec2 } from "./vector";
import { clampPositionToBounds } from "./world";

export function moveHero(
  hero: HeroState,
  input: MoveInput,
  delta_time: number,
  bounds: WorldBounds,
): HeroState {
  const direction = normalizeVec2(input);
  const distance = hero.move_speed * Math.max(0, delta_time);
  const nextPosition = addVec2(hero.position, scaleVec2(direction, distance));
  hero.position = clampPositionToBounds(nextPosition, bounds);
  return hero;
}
