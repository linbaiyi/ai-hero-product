import type { HeroPlayableSpec } from "../specs/playableSpecTypes";
import { normalizePlayableSpec } from "../specs/normalizePlayableSpec";
import type { GameState, Vec2 } from "../core/types";
import { createHeroFromPlayableSpec } from "../core/hero";
import { createWorldBounds, isInsideBounds } from "../core/world";
import { createEnemy } from "../core/enemy";
import type { MapSpawnOptions, TrainingMapConfig } from "./mapTypes";
import { validateTrainingMap } from "./defaultTrainingMap";

export function createInitialGameStateFromSpecAndMap(
  spec: HeroPlayableSpec,
  map: TrainingMapConfig,
  options: MapSpawnOptions = {},
): GameState {
  const normalizedSpec = normalizePlayableSpec(spec);
  const validation = validateTrainingMap(map);
  if (!validation.success) {
    throw new Error(`Invalid training map: ${validation.errors.join("; ")}`);
  }

  const world = createWorldBounds(map.width, map.depth);
  const heroSpawn = options.override_hero_spawn ?? map.hero_spawn;
  assertSpawnInsideBounds(heroSpawn, world);

  const hero = createHeroFromPlayableSpec(normalizedSpec);
  hero.position = { ...heroSpawn };

  return {
    time: 0,
    hero,
    enemies:
      options.include_enemies === false
        ? []
        : map.enemies.map((enemy) =>
            createEnemy({
              id: enemy.id,
              name: enemy.name,
              position: { ...enemy.position },
              max_hp: enemy.max_hp,
              radius: enemy.radius,
            }),
          ),
    world,
    projectiles: [],
    active_zones: [],
    buffs: [],
    events: [],
  };
}

function assertSpawnInsideBounds(
  spawn: Vec2,
  world: ReturnType<typeof createWorldBounds>,
) {
  if (!isInsideBounds(spawn, world)) {
    throw new Error("override_hero_spawn must be inside map bounds");
  }
}
