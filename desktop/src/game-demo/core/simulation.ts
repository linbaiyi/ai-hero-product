import type { HeroPlayableSpec } from "../specs/playableSpecTypes";
import { normalizePlayableSpec } from "../specs/normalizePlayableSpec";
import type { GameState, MoveInput, SimulationConfig } from "./types";
import { createWorldBounds } from "./world";
import { createHeroFromPlayableSpec } from "./hero";
import { moveHero } from "./movement";
import { tickCooldowns } from "./cooldown";
import { updateProjectiles } from "./skills/projectileSkill";
import { updateAoeDotZones } from "./skills/aoeDotSkill";
import { updateBuffs } from "./skills/buffSkill";

export function createInitialGameStateFromSpec(
  spec: HeroPlayableSpec,
  options: SimulationConfig = {},
): GameState {
  const normalizedSpec = normalizePlayableSpec(spec);

  return {
    time: 0,
    hero: createHeroFromPlayableSpec(normalizedSpec),
    enemies: options.enemies ?? [],
    world: options.world ?? createWorldBounds(40, 40),
    projectiles: [],
    active_zones: [],
    buffs: [],
    events: [],
  };
}

// updateSimulation mutates and returns the same state object for predictable runtime reuse.
export function updateSimulation(
  state: GameState,
  input: MoveInput,
  delta_time: number,
): GameState {
  const delta = Math.max(0, delta_time);
  state.time += delta;
  moveHero(state.hero, input, delta, state.world);
  tickCooldowns(state.hero.cooldowns, delta);
  updateProjectiles(state, delta);
  updateAoeDotZones(state, delta);
  updateBuffs(state, delta);
  return state;
}
