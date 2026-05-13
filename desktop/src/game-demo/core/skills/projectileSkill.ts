import type { SkillSpec } from "../../specs/playableSpecTypes";
import type { GameEvent, GameState, ProjectileState, Vec2 } from "../types";
import { applyDamageToEnemy } from "../damage";
import { isCircleHit } from "../collision";
import { applyStatusEffectsToEnemy } from "../statusEffects";
import { addVec2, normalizeVec2, scaleVec2, subVec2 } from "../vector";

export function castProjectileSkill(
  state: GameState,
  skill: SkillSpec,
  target: Vec2,
): GameEvent[] {
  const direction = normalizeVec2(subVec2(target, state.hero.position));
  const projectile: ProjectileState = {
    id: createProjectileId(state),
    skill_slot: skill.slot,
    position: { ...state.hero.position },
    direction,
    speed: skill.speed ?? 0,
    radius: skill.radius ?? 0,
    damage: skill.damage ?? 0,
    remaining_range: skill.range ?? 0,
    status_effects: skill.status_effects ?? [],
    is_alive: true,
  };

  state.projectiles.push(projectile);
  return [
    {
      type: "projectile_spawned",
      projectile_id: projectile.id,
      skill_slot: skill.slot,
    },
  ];
}

export function updateProjectiles(state: GameState, delta_time: number): GameEvent[] {
  const events: GameEvent[] = [];
  const delta = Math.max(0, delta_time);

  for (const projectile of state.projectiles) {
    if (!projectile.is_alive) {
      continue;
    }

    const travelDistance = Math.min(projectile.speed * delta, projectile.remaining_range);
    projectile.position = addVec2(
      projectile.position,
      scaleVec2(projectile.direction, travelDistance),
    );
    projectile.remaining_range = Math.max(0, projectile.remaining_range - travelDistance);

    for (const enemy of state.enemies) {
      if (!enemy.is_alive) {
        continue;
      }
      if (isCircleHit(projectile.position, projectile.radius, enemy.position, enemy.radius)) {
        const damageEvent = applyDamageToEnemy(enemy, projectile.damage);
        if (damageEvent) {
          events.push({
            type: "damage",
            enemy_id: damageEvent.enemy_id,
            amount: damageEvent.amount,
            remaining_hp: damageEvent.remaining_hp,
          });
        }
        events.push(
          ...applyStatusEffectsToEnemy(
            enemy,
            projectile.status_effects,
            projectile.skill_slot,
          ),
        );
        events.push({
          type: "projectile_hit",
          projectile_id: projectile.id,
          enemy_id: enemy.id,
        });
        projectile.is_alive = false;
        break;
      }
    }

    if (projectile.remaining_range <= 0) {
      projectile.is_alive = false;
    }
  }

  state.projectiles = state.projectiles.filter((projectile) => projectile.is_alive);
  state.events.push(...events);
  return events;
}

function createProjectileId(state: GameState): string {
  return `projectile_${state.time}_${state.projectiles.length + 1}`;
}
