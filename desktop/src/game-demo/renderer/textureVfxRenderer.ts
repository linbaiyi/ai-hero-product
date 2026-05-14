import * as THREE from "three";
import type { GameEvent, GameState, ProjectileState, SummonState, ZoneState } from "../core";
import type {
  RuntimeVfxAssetEntry,
  RuntimeVfxAssetSpec,
  RuntimeVfxSlot,
  RuntimeVfxUsage,
} from "../vfx-assets";
import { normalizeRuntimeVfxAssetSpec } from "../vfx-assets";
import { disposeThreeObject } from "./disposeThreeObject";
import {
  createGlowDisc,
  createLightFlash,
  createParticleBurst,
  createParticleTrail,
  createRotatingRing,
  createShockwave,
  createUpwardSparks,
} from "./proceduralVfxFactory";
import type { ProceduralVfxInstance } from "./proceduralVfxTypes";
import {
  clearProceduralVfxInstances,
  disposeProceduralVfxInstance,
  enforceProceduralInstanceLimit,
  updateProceduralVfxInstance,
} from "./proceduralVfxUpdater";
import type { RenderedGameScene, TextureVfxHandles } from "./rendererTypes";
import type { RuntimeTextureCache } from "./textureLoader";
import {
  createMaterialForRuntimeAsset,
  createRuntimeVfxInstance,
  getThreeBlendingMode,
  type RuntimeVfxScale,
} from "./vfxSpawner";
import {
  computeAuraProceduralScale,
  computeAuraTextureScale,
  computeGlowDiscRadius,
  computeGroundDecalTextureScale,
  computeImpactProceduralScale,
  computeImpactTextureScale,
  computeLightIntensityFromRadius,
  computeParticleSizeFromRadius,
  computeParticleSpreadRadius,
  computeProjectileProceduralScale,
  computeProjectileTextureScale,
  computeRotatingRingRadius,
  computeShockwaveRadius,
  computeTrailProceduralScale,
  computeTrailTextureScale,
} from "./vfxScaleCalibration";
import type { RuntimeVfxInstance, RuntimeVfxInstanceKind } from "./vfxInstanceTypes";
import { disposeRuntimeVfxInstance, updateRuntimeVfxInstance } from "./vfxUpdater";

export { createMaterialForRuntimeAsset, getThreeBlendingMode };

export type TextureVfxRenderer = {
  update(state: GameState, runtimeVfxAssetSpec?: RuntimeVfxAssetSpec | null): void;
  clear(): void;
  getWarnings(): string[];
  getInstanceCount(): number;
};

export type TextureVfxRendererOptions = {
  sceneHandles: RenderedGameScene;
  textureCache: RuntimeTextureCache;
};

const TRAIL_SPAWN_INTERVAL = 0.08;
const MAX_TRAIL_INSTANCES = 32;
const MAX_TOTAL_PROCEDURAL_INSTANCES = 120;
const MAX_PROCEDURAL_TRAIL_INSTANCES = 40;
const MAX_UPWARD_SPARKS_INSTANCES = 24;
const DEFAULT_GROUND_DECAL_ASSET_SCALE = 4;

export function createTextureVfxRenderer(
  options: TextureVfxRendererOptions,
): TextureVfxRenderer {
  return {
    update(state, runtimeVfxAssetSpec) {
      updateTextureVfx(
        options.sceneHandles,
        state,
        runtimeVfxAssetSpec ?? null,
        options.textureCache,
      );
    },
    clear() {
      clearTextureVfx(options.sceneHandles);
    },
    getWarnings() {
      return getTextureVfxWarnings(options.sceneHandles, options.textureCache);
    },
    getInstanceCount() {
      const handles = options.sceneHandles.handles.texture_vfx;
      return (handles?.instances.size ?? 0) + (handles?.procedural_instances.size ?? 0);
    },
  };
}

export function updateTextureVfx(
  sceneHandles: RenderedGameScene,
  state: GameState,
  runtimeVfxAssetSpec: RuntimeVfxAssetSpec | null | undefined,
  textureCache: RuntimeTextureCache,
): void {
  const handles = ensureTextureHandles(sceneHandles);
  const deltaTime = getDeltaTime(handles, state.time);

  if (!runtimeVfxAssetSpec) {
    restoreDefaultVfxVisibility(sceneHandles);
    clearTextureVfx(sceneHandles);
    return;
  }

  let spec: RuntimeVfxAssetSpec;
  try {
    spec = normalizeRuntimeVfxAssetSpec(runtimeVfxAssetSpec);
  } catch {
    restoreDefaultVfxVisibility(sceneHandles);
    clearTextureVfx(sceneHandles);
    handles.warnings.push(
      "Runtime VFX asset spec is invalid. Falling back to default effects.",
    );
    return;
  }

  updateProjectileComposition(sceneHandles, state, spec, textureCache, handles);
  updateZoneComposition(sceneHandles, state, spec, textureCache, handles);
  updateAuraComposition(sceneHandles, state, spec, textureCache, handles);
  updateSummonComposition(sceneHandles, state, spec, textureCache, handles);
  updateImpactComposition(sceneHandles, state, spec, textureCache, handles);
  updateAllInstances(sceneHandles, handles, state, deltaTime);
}

export function clearTextureVfx(sceneHandles: RenderedGameScene): void {
  const handles = sceneHandles.handles.texture_vfx;
  if (!handles) {
    return;
  }

  for (const instance of handles.instances.values()) {
    sceneHandles.vfx_group.remove(instance.object3d);
    disposeRuntimeVfxInstance(instance);
  }
  handles.instances.clear();
  for (const instance of handles.procedural_instances.values()) {
    sceneHandles.vfx_group.remove(instance.object3d);
  }
  clearProceduralVfxInstances(handles.procedural_instances);

  for (const map of [
    handles.projectiles,
    handles.zones,
    handles.buffs,
    handles.summon_bodies,
    handles.summon_auras,
    handles.summon_ground_decals,
    handles.trails,
    handles.impacts,
  ]) {
    map.clear();
  }
  handles.processed_events.clear();
  handles.last_trail_spawn_time.clear();
  handles.projectile_slots.clear();
  handles.projectile_radii.clear();
  handles.projectile_last_positions.clear();
  handles.warnings.length = 0;
  handles.last_update_time = null;
  restoreDefaultVfxVisibility(sceneHandles);
}

export function findAssetForSkillUsage(
  runtimeVfxAssetSpec: RuntimeVfxAssetSpec,
  slot: RuntimeVfxSlot,
  usage: RuntimeVfxUsage,
  criteria: {
    trigger?: string;
    action?: string;
    effect_index?: number;
  } = {},
): RuntimeVfxAssetEntry | undefined {
  const skill = runtimeVfxAssetSpec.skills[slot];
  if (!skill) {
    return undefined;
  }
  const candidates = Object.values(skill.assets).filter((asset) => asset.usage === usage);
  if (candidates.length === 0) {
    return undefined;
  }

  return (
    candidates.find(
      (asset) =>
        (criteria.trigger === undefined || asset.trigger === criteria.trigger) &&
        (criteria.action === undefined || asset.action === criteria.action) &&
        (criteria.effect_index === undefined || asset.effect_index === criteria.effect_index),
    ) ?? candidates[0]
  );
}

export function getTextureVfxWarnings(
  sceneHandles: RenderedGameScene,
  textureCache?: RuntimeTextureCache,
): string[] {
  return [
    ...(sceneHandles.handles.texture_vfx?.warnings ?? []),
    ...(textureCache?.getWarnings() ?? []),
  ];
}

function updateProjectileComposition(
  sceneHandles: RenderedGameScene,
  state: GameState,
  spec: RuntimeVfxAssetSpec,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
): void {
  const activeIds = new Set(state.projectiles.map((projectile) => projectile.id));
  removeMissingPersistentInstances(sceneHandles, handles.projectiles, handles, activeIds);
  removeMissingProceduralPersistentInstances(
    sceneHandles,
    handles,
    "procedural:projectile_light:",
    activeIds,
  );

  for (const projectile of state.projectiles) {
    handles.projectile_slots.set(projectile.id, projectile.skill_slot);
    handles.projectile_radii.set(projectile.id, projectile.radius);
    handles.projectile_last_positions.set(projectile.id, { ...projectile.position });
    const projectileAsset = findAssetForSkillUsage(
      spec,
      projectile.skill_slot,
      "projectile",
      { trigger: "on_cast", action: "spawn_projectile" },
    );
    if (projectileAsset) {
      const projectileTexture = projectileAsset
        ? textureCache.get(projectileAsset.path) ?? undefined
        : undefined;
      const instance = upsertPersistentInstance({
        sceneHandles,
        textureCache,
        handles,
        objectMap: handles.projectiles,
        id: projectile.id,
        kind: "projectile",
        slot: projectile.skill_slot,
        usage: "projectile",
        asset: projectileAsset,
        position: projectilePosition(projectile),
        scale: getProjectileVisualScale(projectile, projectileAsset, projectileTexture),
        sourceId: projectile.id,
        followTarget: "projectile",
      });
      const fallback = sceneHandles.handles.projectiles.get(projectile.id);
      if (fallback) {
        fallback.visible = !instance;
      }
      upsertProceduralInstance(
        sceneHandles,
        handles,
        `procedural:projectile_light:${projectile.id}`,
        createLightFlash(projectilePosition(projectile), {
          id: `procedural:projectile_light:${projectile.id}`,
          color: projectileAsset?.color_tint ?? "#ffb15a",
          opacity: 0.45,
          radius: computeProjectileProceduralScale(projectile.radius),
          light_intensity: computeLightIntensityFromRadius(projectile.radius, "projectile"),
          light_distance: Math.max(1, projectile.radius * 2.4),
          duration: 1,
          source_id: projectile.id,
          follow_target: "projectile",
          persistent: true,
        }),
      );
    }

    if (findAssetForSkillUsage(spec, projectile.skill_slot, "trail")) {
      maybeSpawnTrail(sceneHandles, state, projectile, spec, textureCache, handles);
    }
  }
}

function updateZoneComposition(
  sceneHandles: RenderedGameScene,
  state: GameState,
  spec: RuntimeVfxAssetSpec,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
): void {
  const activeIds = new Set(state.active_zones.map((zone) => zone.id));
  removeMissingPersistentInstances(sceneHandles, handles.zones, handles, activeIds);
  removeMissingProceduralPersistentInstances(sceneHandles, handles, "procedural:zone_glow:", activeIds);
  removeMissingProceduralPersistentInstances(sceneHandles, handles, "procedural:zone_ring:", activeIds);

  for (const zone of state.active_zones) {
    const asset = findAssetForSkillUsage(spec, zone.skill_slot, "ground_decal");
    if (!asset) {
      continue;
    }

    const texture = asset ? textureCache.get(asset.path) ?? undefined : undefined;
    const instance = upsertPersistentInstance({
      sceneHandles,
      textureCache,
      handles,
      objectMap: handles.zones,
      id: zone.id,
      kind: "ground_decal",
      slot: zone.skill_slot,
      usage: "ground_decal",
      asset,
      position: zonePosition(zone),
      scale: getGroundDecalVisualScale(zone.radius, asset, texture),
      duration: Math.max(0.1, asset?.duration ?? zone.duration_remaining),
      sourceId: zone.id,
      followTarget: "zone",
    });
    const fallback = sceneHandles.handles.zones.get(zone.id);
    if (fallback) {
      fallback.visible = !instance;
    }
    upsertProceduralInstance(
      sceneHandles,
      handles,
      `procedural:zone_glow:${zone.id}`,
      createGlowDisc(zonePosition(zone), zone.radius, {
        id: `procedural:zone_glow:${zone.id}`,
        color: asset?.color_tint ?? "#ff8a2a",
        opacity: 0.24,
        radius: computeGlowDiscRadius(zone.radius),
        duration: Math.max(0.1, zone.duration_remaining),
        source_id: zone.id,
        follow_target: "zone",
        persistent: true,
      }),
    );
    upsertProceduralInstance(
      sceneHandles,
      handles,
      `procedural:zone_ring:${zone.id}`,
      createRotatingRing(zonePosition(zone), zone.radius, {
        id: `procedural:zone_ring:${zone.id}`,
        color: asset?.color_tint ?? "#ffb15a",
        opacity: 0.45,
        radius: computeRotatingRingRadius(zone.radius),
        duration: Math.max(0.1, zone.duration_remaining),
        source_id: zone.id,
        follow_target: "zone",
        persistent: true,
      }),
    );
  }
}

function updateAuraComposition(
  sceneHandles: RenderedGameScene,
  state: GameState,
  spec: RuntimeVfxAssetSpec,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
): void {
  const desiredAuraIds = new Set<string>();

  for (const buff of state.buffs) {
    const asset = findAssetForSkillUsage(spec, buff.skill_slot, "aura");
    if (!asset) {
      continue;
    }

    desiredAuraIds.add(buff.id);
    const texture = asset ? textureCache.get(asset.path) ?? undefined : undefined;
    upsertPersistentInstance({
      sceneHandles,
      textureCache,
      handles,
      objectMap: handles.buffs,
      id: buff.id,
      kind: "aura",
      slot: buff.skill_slot,
      usage: "aura",
      asset,
      position: heroAuraPosition(state),
      scale: getAssetVisualScale(asset, texture, asset?.scale ?? 2),
      duration: Math.max(0.1, asset?.duration ?? buff.duration_remaining),
      sourceId: buff.id,
      followTarget: "hero",
    });
    upsertProceduralInstance(
      sceneHandles,
      handles,
      `procedural:aura_ring:${buff.id}`,
      createRotatingRing(heroAuraPosition(state), computeAuraProceduralScale(asset?.scale ?? 2), {
        id: `procedural:aura_ring:${buff.id}`,
        color: asset?.color_tint ?? "#ffb15a",
        opacity: 0.42,
        radius: computeAuraProceduralScale(asset?.scale ?? 2),
        duration: Math.max(0.1, buff.duration_remaining),
        source_id: buff.id,
        follow_target: "hero",
        persistent: true,
      }),
    );
    upsertProceduralInstance(
      sceneHandles,
      handles,
      `procedural:aura_sparks:${buff.id}`,
      createUpwardSparks(heroAuraPosition(state), {
        id: `procedural:aura_sparks:${buff.id}`,
        color: asset?.color_tint ?? "#ffe8a0",
        opacity: 0.58,
        radius: computeAuraProceduralScale(asset?.scale ?? 2),
        spread_radius: computeParticleSpreadRadius(asset?.scale ?? 2, "aura"),
        particle_size: computeParticleSizeFromRadius(asset?.scale ?? 2, "aura"),
        duration: Math.max(0.6, buff.duration_remaining),
        source_id: buff.id,
        follow_target: "hero",
        persistent: true,
        particle_count: 16,
      }),
    );
  }

  removeMissingPersistentInstances(sceneHandles, handles.buffs, handles, desiredAuraIds);
  removeMissingProceduralPersistentInstances(sceneHandles, handles, "procedural:aura_ring:", desiredAuraIds);
  removeMissingProceduralPersistentInstances(sceneHandles, handles, "procedural:aura_sparks:", desiredAuraIds);
}

function updateSummonComposition(
  sceneHandles: RenderedGameScene,
  state: GameState,
  spec: RuntimeVfxAssetSpec,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
): void {
  const activeIds = new Set(state.summons.map((summon) => summon.id));
  removeMissingPersistentInstances(
    sceneHandles,
    handles.summon_bodies,
    handles,
    new Set([...activeIds].map(getSummonBodyTextureId)),
  );
  removeMissingPersistentInstances(
    sceneHandles,
    handles.summon_auras,
    handles,
    new Set([...activeIds].map(getSummonAuraTextureId)),
  );
  removeMissingPersistentInstances(
    sceneHandles,
    handles.summon_ground_decals,
    handles,
    new Set([...activeIds].map(getSummonGroundDecalTextureId)),
  );
  removeMissingProceduralPersistentInstances(
    sceneHandles,
    handles,
    "procedural:summon_ground_glow:",
    activeIds,
  );
  removeMissingProceduralPersistentInstances(
    sceneHandles,
    handles,
    "procedural:summon_ground_ring:",
    activeIds,
  );
  removeMissingProceduralPersistentInstances(sceneHandles, handles, "procedural:summon_ring:", activeIds);
  removeMissingProceduralPersistentInstances(sceneHandles, handles, "procedural:summon_sparks:", activeIds);

  for (const summon of state.summons) {
    const bodyAsset = findAssetForSkillUsage(spec, summon.skill_slot, "summon_body");
    const bodyTexture = bodyAsset ? textureCache.get(bodyAsset.path) ?? undefined : undefined;
    const bodyInstance = upsertPersistentInstance({
      sceneHandles,
      textureCache,
      handles,
      objectMap: handles.summon_bodies,
      id: getSummonBodyTextureId(summon.id),
      kind: "summon_body",
      slot: summon.skill_slot,
      usage: "summon_body",
      asset: bodyAsset,
      position: summonBodyPosition(summon),
      scale: getSummonBodyVisualScale(summon, bodyAsset, bodyTexture),
      duration: Math.max(0.1, bodyAsset?.duration ?? summon.duration_remaining),
      sourceId: summon.id,
      followTarget: "summon",
    });
    const fallback = sceneHandles.handles.summons.get(summon.id);
    if (fallback) {
      fallback.visible = true;
      setFallbackSummonBodyVisible(fallback, !bodyInstance);
    }

    const auraAsset = findAssetForSkillUsage(spec, summon.skill_slot, "aura");
    const auraTexture = auraAsset ? textureCache.get(auraAsset.path) ?? undefined : undefined;
    upsertPersistentInstance({
      sceneHandles,
      textureCache,
      handles,
      objectMap: handles.summon_auras,
      id: getSummonAuraTextureId(summon.id),
      kind: "aura",
      slot: summon.skill_slot,
      usage: "aura",
      asset: auraAsset,
      position: summonAuraPosition(summon),
      scale: getAssetVisualScale(auraAsset, auraTexture, Math.max(1.2, summon.radius * 2.2)),
      duration: Math.max(0.1, auraAsset?.duration ?? summon.duration_remaining),
      sourceId: summon.id,
      followTarget: "summon",
    });

    const groundDecalAsset = findAssetForSkillUsage(
      spec,
      summon.skill_slot,
      "ground_decal",
    );
    const groundDecalTexture = groundDecalAsset
      ? textureCache.get(groundDecalAsset.path) ?? undefined
      : undefined;
    upsertPersistentInstance({
      sceneHandles,
      textureCache,
      handles,
      objectMap: handles.summon_ground_decals,
      id: getSummonGroundDecalTextureId(summon.id),
      kind: "ground_decal",
      slot: summon.skill_slot,
      usage: "ground_decal",
      asset: groundDecalAsset,
      position: summonAuraPosition(summon),
      scale: getGroundDecalVisualScale(summon.radius, groundDecalAsset, groundDecalTexture),
      duration: Math.max(0.1, groundDecalAsset?.duration ?? summon.duration_remaining),
      sourceId: summon.id,
      followTarget: "summon",
    });
    if (groundDecalAsset) {
      upsertProceduralInstance(
        sceneHandles,
        handles,
        `procedural:summon_ground_glow:${summon.id}`,
        createGlowDisc(summonAuraPosition(summon), summon.radius, {
          id: `procedural:summon_ground_glow:${summon.id}`,
          color: groundDecalAsset.color_tint ?? auraAsset?.color_tint ?? bodyAsset?.color_tint ?? "#ff8a2a",
          opacity: 0.2,
          radius: computeGlowDiscRadius(summon.radius),
          duration: Math.max(0.1, summon.duration_remaining),
          source_id: summon.id,
          follow_target: "summon",
          persistent: true,
        }),
      );
      upsertProceduralInstance(
        sceneHandles,
        handles,
        `procedural:summon_ground_ring:${summon.id}`,
        createRotatingRing(summonAuraPosition(summon), summon.radius, {
          id: `procedural:summon_ground_ring:${summon.id}`,
          color: groundDecalAsset.color_tint ?? auraAsset?.color_tint ?? bodyAsset?.color_tint ?? "#ffb15a",
          opacity: 0.38,
          radius: computeRotatingRingRadius(summon.radius),
          duration: Math.max(0.1, summon.duration_remaining),
          source_id: summon.id,
          follow_target: "summon",
          persistent: true,
        }),
      );
    }
    upsertProceduralInstance(
      sceneHandles,
      handles,
      `procedural:summon_ring:${summon.id}`,
      createRotatingRing(summonAuraPosition(summon), summon.radius, {
        id: `procedural:summon_ring:${summon.id}`,
        color: auraAsset?.color_tint ?? bodyAsset?.color_tint ?? "#c084fc",
        opacity: 0.35,
        radius: Math.max(0.6, summon.radius * 1.5),
        duration: Math.max(0.1, summon.duration_remaining),
        source_id: summon.id,
        follow_target: "summon",
        persistent: true,
      }),
    );
    upsertProceduralInstance(
      sceneHandles,
      handles,
      `procedural:summon_sparks:${summon.id}`,
      createUpwardSparks(summonAuraPosition(summon), {
        id: `procedural:summon_sparks:${summon.id}`,
        color: bodyAsset?.color_tint ?? auraAsset?.color_tint ?? "#f0abfc",
        opacity: 0.45,
        radius: Math.max(0.6, summon.radius * 1.3),
        spread_radius: Math.max(0.45, summon.radius * 1.4),
        particle_size: Math.max(0.06, summon.radius * 0.12),
        duration: Math.max(0.6, summon.duration_remaining),
        source_id: summon.id,
        follow_target: "summon",
        persistent: true,
        particle_count: 10,
      }),
    );
  }
}

function updateImpactComposition(
  sceneHandles: RenderedGameScene,
  state: GameState,
  spec: RuntimeVfxAssetSpec,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
): void {
  for (const [index, event] of state.events.entries()) {
    const eventKey = createEventKey(event, index);
    if (!eventKey || handles.processed_events.has(eventKey)) {
      continue;
    }

    if (event.type === "projectile_hit") {
      const slot = getProjectileSlot(event.projectile_id, handles);
      const enemy = state.enemies.find((candidate) => candidate.id === event.enemy_id);
      if (slot && enemy) {
        const radius = handles.projectile_radii.get(event.projectile_id) ?? enemy.radius;
        const handled = spawnImpact(sceneHandles, textureCache, handles, spec, slot, {
          x: enemy.position.x,
          y: 0.65,
          z: enemy.position.z,
        }, radius, eventKey);
        if (!handled) {
          continue;
        }
      }
    } else if (event.type === "zone_tick") {
      const zone = state.active_zones.find((candidate) => candidate.id === event.zone_id);
      const slot = zone?.skill_slot;
      if (slot === "R" && zone) {
        const handled = spawnImpact(sceneHandles, textureCache, handles, spec, slot, zonePosition(zone), zone.radius, eventKey);
        if (!handled) {
          continue;
        }
      }
    } else if (event.type === "skill_cast" && event.skill_slot === "R") {
      const target = event.target ?? getSkillCastFallbackTarget(state);
      const position = {
        x: target.x,
        y: 0.075,
        z: target.z,
      };
      const decalHandled = spawnTransientGroundDecal(
        sceneHandles,
        textureCache,
        handles,
        spec,
        event.skill_slot,
        position,
        event.radius,
        `${eventKey}:decal`,
      );
      const impactHandled = spawnImpact(
        sceneHandles,
        textureCache,
        handles,
        spec,
        event.skill_slot,
        { ...position, y: 0.65 },
        event.radius,
        `${eventKey}:impact`,
      );
      if (!decalHandled || !impactHandled) {
        continue;
      }
    } else if (event.type === "summon_spawned") {
      const summon = state.summons.find((candidate) => candidate.id === event.summon_id);
      if (summon) {
        const handled = spawnImpact(
          sceneHandles,
          textureCache,
          handles,
          spec,
          event.skill_slot,
          summonBodyPosition(summon),
          summon.radius,
          `${eventKey}:spawn`,
        );
        if (!handled) {
          continue;
        }
      }
    } else if (event.type === "vfx_event") {
      const handled = spawnImpact(
        sceneHandles,
        textureCache,
        handles,
        spec,
        event.skill_slot,
        { x: event.position.x, y: 0.65, z: event.position.z },
        event.radius,
        eventKey,
        usagePreferencesForVfxEvent(event.usage),
      );
      if (!handled) {
        continue;
      }
    }

    handles.processed_events.add(eventKey);
  }
}

function maybeSpawnTrail(
  sceneHandles: RenderedGameScene,
  state: GameState,
  projectile: ProjectileState,
  spec: RuntimeVfxAssetSpec,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
): void {
  const asset = findAssetForSkillUsage(spec, projectile.skill_slot, "trail");
  if (!asset) {
    return;
  }

  const lastSpawnTime = handles.last_trail_spawn_time.get(projectile.id) ?? -Infinity;
  if (state.time - lastSpawnTime < TRAIL_SPAWN_INTERVAL) {
    return;
  }

  const texture = textureCache.get(asset.path);
  if (!texture) {
    void textureCache.load(asset.path);
    return;
  }

  const id = `trail:${projectile.id}:${state.time.toFixed(3)}:${handles.trails.size}`;
  const instance = createRuntimeVfxInstance({
    id,
    slot: projectile.skill_slot,
    usage: "trail",
    kind: "trail",
    asset,
    texture,
    position: {
      x: projectile.position.x - projectile.direction.x * 0.35,
      y: 0.45,
      z: projectile.position.z - projectile.direction.z * 0.35,
    },
    scale: getTrailVisualScale(projectile, asset, texture),
    duration: asset.duration || 0.28,
    sourceId: projectile.id,
  });
  addInstance(sceneHandles, handles, handles.trails, instance);
  spawnProceduralTransient(
    sceneHandles,
    handles,
    createParticleTrail(projectilePosition(projectile), {
      id: `procedural:trail:${projectile.id}:${state.time.toFixed(3)}`,
      color: asset.color_tint ?? "#ffb15a",
      opacity: 0.55,
      radius: computeProjectileProceduralScale(projectile.radius),
      spread_radius: computeParticleSpreadRadius(projectile.radius, "trail"),
      particle_size: computeParticleSizeFromRadius(projectile.radius, "trail"),
      duration: 0.3,
      particle_count: 8,
    }),
  );
  handles.last_trail_spawn_time.set(projectile.id, state.time);
  trimTransientInstances(sceneHandles, handles.trails, handles, MAX_TRAIL_INSTANCES);
  trimProceduralKind(sceneHandles, handles, "particle_trail", MAX_PROCEDURAL_TRAIL_INSTANCES);
}

function spawnImpact(
  sceneHandles: RenderedGameScene,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
  spec: RuntimeVfxAssetSpec,
  slot: RuntimeVfxSlot,
  position: { x: number; y: number; z: number },
  radius: number | undefined,
  eventKey: string,
  preferredUsages: RuntimeVfxUsage[] = ["hit_flash", "impact"],
): boolean {
  const asset = findFirstAssetForUsages(spec, slot, preferredUsages);
  if (!asset) {
    return true;
  }

  const texture = textureCache.get(asset.path);
  if (!texture) {
    void textureCache.load(asset.path);
    return false;
  }

  const id = `impact:${eventKey}`;
  const impactRadius = radius ?? Math.max(0.2, (asset.scale ?? 2) / 2);
  const instance = createRuntimeVfxInstance({
    id,
    slot,
    usage: asset.usage,
    kind: "impact",
    asset,
    texture,
    position,
    scale: getImpactVisualScale(impactRadius, asset, texture),
    duration: asset.duration || 0.4,
  });
  addInstance(sceneHandles, handles, handles.impacts, instance);
  spawnImpactProcedural(
    sceneHandles,
    handles,
    new THREE.Vector3(position.x, position.y, position.z),
    asset.color_tint ?? "#ff8a2a",
    impactRadius,
    eventKey,
  );
  return true;
}

function findFirstAssetForUsages(
  spec: RuntimeVfxAssetSpec,
  slot: RuntimeVfxSlot,
  usages: RuntimeVfxUsage[],
): RuntimeVfxAssetEntry | undefined {
  for (const usage of usages) {
    const asset = findAssetForSkillUsage(spec, slot, usage);
    if (asset) {
      return asset;
    }
  }
  return undefined;
}

function usagePreferencesForVfxEvent(usage: string): RuntimeVfxUsage[] {
  if (usage === "hit_flash") {
    return ["hit_flash", "impact"];
  }
  if (usage === "status_loop") {
    return ["status_loop", "burn_loop", "poison_cloud", "hit_flash", "impact"];
  }
  if (usage === "impact") {
    return ["impact", "hit_flash"];
  }
  return ["hit_flash", "impact"];
}

function spawnTransientGroundDecal(
  sceneHandles: RenderedGameScene,
  textureCache: RuntimeTextureCache,
  handles: TextureVfxHandles,
  spec: RuntimeVfxAssetSpec,
  slot: RuntimeVfxSlot,
  position: { x: number; y: number; z: number },
  radius: number | undefined,
  eventKey: string,
): boolean {
  const asset = findAssetForSkillUsage(spec, slot, "ground_decal");
  if (!asset) {
    return true;
  }

  const texture = textureCache.get(asset.path);
  if (!texture) {
    void textureCache.load(asset.path);
    return false;
  }

  const id = `ground_decal:${eventKey}`;
  const visualScale = getGroundDecalVisualScale(radius, asset, texture);
  const visualRadius = getScaleLongestSide(visualScale) / 2;
  const instance = createRuntimeVfxInstance({
    id,
    slot,
    usage: "ground_decal",
    kind: "ground_decal",
    asset,
    texture,
    position,
    scale: visualScale,
    duration: asset.duration || 0.8,
  });
  addInstance(sceneHandles, handles, handles.impacts, instance);
  spawnProceduralTransient(
    sceneHandles,
    handles,
    createGlowDisc(new THREE.Vector3(position.x, position.y, position.z), visualRadius, {
      id: `procedural:r_decal_glow:${eventKey}`,
      color: asset.color_tint ?? "#ff8a2a",
      opacity: 0.08,
      radius: computeGlowDiscRadius(visualRadius),
      duration: asset.duration || 0.8,
    }),
  );
  return true;
}

function getGroundDecalVisualScale(
  radius: number | undefined,
  asset?: RuntimeVfxAssetEntry,
  texture?: THREE.Texture,
): RuntimeVfxScale {
  const { width, height } = getTextureImageSize(texture);
  if (radius !== undefined && Number.isFinite(radius) && radius > 0) {
    return computeGroundDecalTextureScale(radius, width, height);
  }
  return getAssetVisualScale(asset, texture, asset?.scale ?? DEFAULT_GROUND_DECAL_ASSET_SCALE);
}

function getProjectileVisualScale(
  projectile: ProjectileState,
  _asset?: RuntimeVfxAssetEntry,
  texture?: THREE.Texture,
): RuntimeVfxScale {
  const { width, height } = getTextureImageSize(texture);
  return computeProjectileTextureScale(projectile.radius, width, height);
}

function getImpactVisualScale(
  radius: number,
  _asset?: RuntimeVfxAssetEntry,
  texture?: THREE.Texture,
): RuntimeVfxScale {
  const { width, height } = getTextureImageSize(texture);
  return computeImpactTextureScale(radius, width, height);
}

function getTrailVisualScale(
  projectile: ProjectileState,
  _asset?: RuntimeVfxAssetEntry,
  texture?: THREE.Texture,
): RuntimeVfxScale {
  const { width, height } = getTextureImageSize(texture);
  const dimensions = computeTrailProceduralScale(
    Math.max(projectile.radius * 3, projectile.speed * 0.05),
    projectile.radius * 2,
  );
  return computeTrailTextureScale(dimensions.length, dimensions.width, width, height);
}

function getAssetVisualScale(
  asset: RuntimeVfxAssetEntry | undefined,
  texture: THREE.Texture | undefined,
  fallbackLongestSide: number,
): RuntimeVfxScale {
  const { width, height } = getTextureImageSize(texture);
  if (asset?.usage === "aura") {
    return computeAuraTextureScale(fallbackLongestSide / 2, width, height);
  }
  return computeImpactTextureScale(fallbackLongestSide / 2, width, height);
}

function getTextureImageSize(texture: THREE.Texture | undefined): {
  width: number;
  height: number;
} {
  const image = texture?.image as
    | { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
    | undefined;
  const width = image?.naturalWidth ?? image?.width ?? 1;
  const height = image?.naturalHeight ?? image?.height ?? 1;
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1,
    height: Number.isFinite(height) && height > 0 ? height : 1,
  };
}

function getSummonBodyVisualScale(
  summon: SummonState,
  asset: RuntimeVfxAssetEntry | undefined,
  texture: THREE.Texture | undefined,
): RuntimeVfxScale {
  return getAssetVisualScale(asset, texture, asset?.scale ?? Math.max(1.1, summon.radius * 2.2));
}

function getScaleLongestSide(scale: RuntimeVfxScale): number {
  if (typeof scale === "number") {
    return scale;
  }
  return Math.max(scale.x, scale.y, scale.z ?? 1);
}

function normalizeRuntimeVfxScale(scale: RuntimeVfxScale): {
  x: number;
  y: number;
  z: number;
} {
  if (typeof scale === "number") {
    const value = Math.max(0.01, scale);
    return { x: value, y: value, z: value };
  }
  return {
    x: Math.max(0.01, scale.x),
    y: Math.max(0.01, scale.y),
    z: Math.max(0.01, scale.z ?? 1),
  };
}

function upsertPersistentInstance({
  sceneHandles,
  textureCache,
  handles,
  objectMap,
  id,
  kind,
  slot,
  usage,
  asset,
  position,
  scale,
  duration,
  sourceId,
  followTarget,
}: {
  sceneHandles: RenderedGameScene;
  textureCache: RuntimeTextureCache;
  handles: TextureVfxHandles;
  objectMap: Map<string, THREE.Object3D>;
  id: string;
  kind: RuntimeVfxInstanceKind;
  slot: RuntimeVfxSlot;
  usage: RuntimeVfxUsage;
  asset?: RuntimeVfxAssetEntry;
  position: { x: number; y: number; z: number };
  scale: RuntimeVfxScale;
  duration?: number;
  sourceId?: string;
  followTarget?: RuntimeVfxInstance["follow_target"];
}): RuntimeVfxInstance | null {
  if (!asset) {
    removeInstance(sceneHandles, handles, id, objectMap);
    return null;
  }

  const texture = textureCache.get(asset.path);
  if (!texture) {
    void textureCache.load(asset.path);
    removeInstance(sceneHandles, handles, id, objectMap);
    return null;
  }

  let instance = handles.instances.get(id);
  if (!instance) {
    instance = createRuntimeVfxInstance({
      id,
      slot,
      usage,
      kind,
      asset,
      texture,
      position,
      scale,
      duration,
      sourceId,
      followTarget,
      persistent: true,
    });
    addInstance(sceneHandles, handles, objectMap, instance);
  }

  instance.object3d.position.set(position.x, position.y, position.z);
  const normalizedScale = normalizeRuntimeVfxScale(scale);
  instance.base_scale = Math.max(normalizedScale.x, normalizedScale.y, normalizedScale.z);
  instance.base_scale_x = normalizedScale.x;
  instance.base_scale_y = normalizedScale.y;
  instance.base_scale_z = normalizedScale.z;
  instance.object3d.scale.set(normalizedScale.x, normalizedScale.y, normalizedScale.z);
  instance.duration = Math.max(0.01, duration ?? asset.duration ?? instance.duration);
  return instance;
}

function updateAllInstances(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  state: GameState,
  deltaTime: number,
): void {
  for (const instance of [...handles.instances.values()]) {
    updateFollowTarget(instance, state);
    const alive = updateRuntimeVfxInstance(instance, deltaTime);
    if (!alive) {
      removeInstanceById(sceneHandles, handles, instance.id);
    }
  }
  for (const instance of [...handles.procedural_instances.values()]) {
    updateProceduralFollowTarget(instance, state);
    const alive = updateProceduralVfxInstance(instance, deltaTime);
    if (!alive) {
      removeProceduralInstanceById(sceneHandles, handles, instance.id);
    }
  }
  enforceSceneProceduralLimit(sceneHandles, handles);
}

function updateFollowTarget(instance: RuntimeVfxInstance, state: GameState): void {
  if (instance.follow_target === "hero") {
    instance.object3d.position.set(state.hero.position.x, 0.08, state.hero.position.z);
    return;
  }

  if (instance.follow_target === "projectile" && instance.source_id) {
    const projectile = state.projectiles.find(
      (candidate) => candidate.id === instance.source_id,
    );
    if (projectile) {
      instance.object3d.position.copy(projectilePosition(projectile));
    }
    return;
  }

  if (instance.follow_target === "zone" && instance.source_id) {
    const zone = state.active_zones.find((candidate) => candidate.id === instance.source_id);
    if (zone) {
      instance.object3d.position.copy(zonePosition(zone));
    }
    return;
  }

  if (instance.follow_target === "summon" && instance.source_id) {
    const summon = state.summons.find((candidate) => candidate.id === instance.source_id);
    if (summon) {
      instance.object3d.position.copy(
        instance.kind === "aura" || instance.kind === "ground_decal"
          ? summonAuraPosition(summon)
          : summonBodyPosition(summon),
      );
    }
  }
}

function updateProceduralFollowTarget(
  instance: ProceduralVfxInstance,
  state: GameState,
): void {
  if (instance.follow_target === "hero") {
    instance.object3d.position.set(state.hero.position.x, 0.1, state.hero.position.z);
    return;
  }

  if (instance.follow_target === "projectile" && instance.source_id) {
    const projectile = state.projectiles.find(
      (candidate) => candidate.id === instance.source_id,
    );
    if (projectile) {
      instance.object3d.position.copy(projectilePosition(projectile));
    }
    return;
  }

  if (instance.follow_target === "zone" && instance.source_id) {
    const zone = state.active_zones.find((candidate) => candidate.id === instance.source_id);
    if (zone) {
      instance.object3d.position.copy(zonePosition(zone));
    }
    return;
  }

  if (instance.follow_target === "summon" && instance.source_id) {
    const summon = state.summons.find((candidate) => candidate.id === instance.source_id);
    if (summon) {
      instance.object3d.position.copy(summonAuraPosition(summon));
    }
  }
}

function addInstance(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  objectMap: Map<string, THREE.Object3D>,
  instance: RuntimeVfxInstance,
): void {
  sceneHandles.vfx_group.add(instance.object3d);
  handles.instances.set(instance.id, instance);
  objectMap.set(instance.id, instance.object3d);
}

function upsertProceduralInstance(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  id: string,
  nextInstance: ProceduralVfxInstance,
): void {
  const existing = handles.procedural_instances.get(id);
  if (existing) {
    existing.object3d.position.copy(nextInstance.object3d.position);
    existing.duration = nextInstance.duration;
    existing.base_scale = nextInstance.base_scale;
    disposeProceduralVfxInstance(nextInstance);
    return;
  }
  spawnProceduralTransient(sceneHandles, handles, nextInstance);
}

function spawnProceduralTransient(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  instance: ProceduralVfxInstance,
): void {
  sceneHandles.vfx_group.add(instance.object3d);
  handles.procedural_instances.set(instance.id, instance);
  enforceSceneProceduralLimit(sceneHandles, handles);
}

function spawnImpactProcedural(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  position: THREE.Vector3,
  color: string,
  radius: number,
  eventKey: string,
): void {
  spawnProceduralTransient(
    sceneHandles,
    handles,
    createShockwave(position, {
      id: `procedural:shockwave:${eventKey}`,
      color,
      opacity: 0.55,
      duration: 0.42,
      radius: computeShockwaveRadius(radius),
    }),
  );
  spawnProceduralTransient(
    sceneHandles,
    handles,
    createParticleBurst(position, {
      id: `procedural:burst:${eventKey}`,
      color,
      opacity: 0.88,
      radius: computeImpactProceduralScale(radius),
      spread_radius: computeParticleSpreadRadius(radius, "impact"),
      particle_size: computeParticleSizeFromRadius(radius, "impact"),
      duration: 0.48,
      particle_count: 26,
    }),
  );
  spawnProceduralTransient(
    sceneHandles,
    handles,
    createLightFlash(position, {
      id: `procedural:flash:${eventKey}`,
      color,
      opacity: 1,
      radius,
      light_intensity: computeLightIntensityFromRadius(radius, "impact"),
      light_distance: Math.max(1, radius * 2.4),
      duration: 0.24,
    }),
  );
}

function removeMissingPersistentInstances(
  sceneHandles: RenderedGameScene,
  objectMap: Map<string, THREE.Object3D>,
  handles: TextureVfxHandles,
  activeIds: Set<string>,
): void {
  for (const id of [...objectMap.keys()]) {
    if (!activeIds.has(id)) {
      removeInstance(sceneHandles, handles, id, objectMap);
    }
  }
}

function removeInstance(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  id: string,
  objectMap: Map<string, THREE.Object3D>,
): void {
  objectMap.delete(id);
  removeInstanceById(sceneHandles, handles, id);
}

function removeInstanceById(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  id: string,
): void {
  const instance = handles.instances.get(id);
  if (!instance) {
    return;
  }

  sceneHandles.vfx_group.remove(instance.object3d);
  disposeRuntimeVfxInstance(instance);
  handles.instances.delete(id);
  handles.projectiles.delete(id);
  handles.zones.delete(id);
  handles.buffs.delete(id);
  handles.summon_bodies.delete(id);
  handles.summon_auras.delete(id);
  handles.summon_ground_decals.delete(id);
  handles.trails.delete(id);
  handles.impacts.delete(id);
}

function removeProceduralInstanceById(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  id: string,
): void {
  const instance = handles.procedural_instances.get(id);
  if (!instance) {
    return;
  }

  sceneHandles.vfx_group.remove(instance.object3d);
  disposeProceduralVfxInstance(instance);
  handles.procedural_instances.delete(id);
}

function removeMissingProceduralPersistentInstances(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  prefix: string,
  activeIds: Set<string>,
): void {
  for (const id of [...handles.procedural_instances.keys()]) {
    if (!id.startsWith(prefix)) {
      continue;
    }
    const sourceId = id.slice(prefix.length);
    if (!activeIds.has(sourceId)) {
      removeProceduralInstanceById(sceneHandles, handles, id);
    }
  }
}

function trimTransientInstances(
  sceneHandles: RenderedGameScene,
  objectMap: Map<string, THREE.Object3D>,
  handles: TextureVfxHandles,
  maxCount: number,
): void {
  while (objectMap.size > maxCount) {
    const oldestId = objectMap.keys().next().value as string | undefined;
    if (!oldestId) {
      return;
    }
    removeInstance(sceneHandles, handles, oldestId, objectMap);
  }
}

function trimProceduralKind(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
  kind: ProceduralVfxInstance["kind"],
  maxCount: number,
): void {
  const matchingIds = [...handles.procedural_instances.values()]
    .filter((instance) => instance.kind === kind)
    .map((instance) => instance.id);
  while (matchingIds.length > maxCount) {
    const oldestId = matchingIds.shift();
    if (!oldestId) {
      return;
    }
    removeProceduralInstanceById(sceneHandles, handles, oldestId);
  }
}

function enforceSceneProceduralLimit(
  sceneHandles: RenderedGameScene,
  handles: TextureVfxHandles,
): void {
  trimProceduralKind(sceneHandles, handles, "particle_trail", MAX_PROCEDURAL_TRAIL_INSTANCES);
  trimProceduralKind(sceneHandles, handles, "upward_sparks", MAX_UPWARD_SPARKS_INSTANCES);
  if (handles.procedural_instances.size > MAX_TOTAL_PROCEDURAL_INSTANCES) {
    enforceProceduralInstanceLimit(
      handles.procedural_instances,
      MAX_TOTAL_PROCEDURAL_INSTANCES,
    );
  }
}

function getProjectileSlot(
  projectileId: string,
  handles: TextureVfxHandles,
): RuntimeVfxSlot | null {
  const slot = handles.projectile_slots.get(projectileId);
  return slot === "Q" || slot === "W" || slot === "E" || slot === "R" ? slot : null;
}

function createEventKey(event: GameEvent, index: number): string | null {
  if (event.type === "projectile_hit") {
    return `projectile_hit:${event.projectile_id}:${event.enemy_id}:${index}`;
  }
  if (event.type === "zone_tick") {
    return `zone_tick:${event.zone_id}:${event.hit_enemy_ids.join(",")}:${index}`;
  }
  if (event.type === "skill_cast") {
    return `skill_cast:${event.skill_slot}:${event.skill_type}:${index}`;
  }
  if (event.type === "summon_spawned") {
    return `summon_spawned:${event.summon_id}:${index}`;
  }
  if (event.type === "vfx_event") {
    return `vfx_event:${event.skill_slot}:${event.usage}:${event.position.x}:${event.position.z}:${index}`;
  }
  return null;
}

function getSkillCastFallbackTarget(state: GameState): { x: number; z: number } {
  return {
    x: state.hero.position.x + state.hero.facing.x * 8,
    z: state.hero.position.z + state.hero.facing.z * 8,
  };
}

function projectilePosition(projectile: ProjectileState): THREE.Vector3 {
  return new THREE.Vector3(projectile.position.x, 0.55, projectile.position.z);
}

function zonePosition(zone: ZoneState): THREE.Vector3 {
  return new THREE.Vector3(zone.center.x, 0.075, zone.center.z);
}

function heroAuraPosition(state: GameState): THREE.Vector3 {
  return new THREE.Vector3(state.hero.position.x, 0.08, state.hero.position.z);
}

function summonBodyPosition(summon: SummonState): THREE.Vector3 {
  return new THREE.Vector3(summon.position.x, 0.8, summon.position.z);
}

function summonAuraPosition(summon: SummonState): THREE.Vector3 {
  return new THREE.Vector3(summon.position.x, 0.08, summon.position.z);
}

function getSummonBodyTextureId(summonId: string): string {
  return `summon_body:${summonId}`;
}

function getSummonAuraTextureId(summonId: string): string {
  return `summon_aura:${summonId}`;
}

function getSummonGroundDecalTextureId(summonId: string): string {
  return `summon_ground_decal:${summonId}`;
}

function setFallbackSummonBodyVisible(object: THREE.Object3D, visible: boolean): void {
  const body = object.getObjectByName("summon-fallback-body");
  const core = object.getObjectByName("summon-fallback-core");
  if (body) {
    body.visible = visible;
  }
  if (core) {
    core.visible = visible;
  }
}

function getDeltaTime(handles: TextureVfxHandles, stateTime: number): number {
  const previous = handles.last_update_time;
  handles.last_update_time = stateTime;
  if (previous === null) {
    return 1 / 60;
  }
  return Math.max(0, Math.min(0.1, stateTime - previous));
}

function ensureTextureHandles(sceneHandles: RenderedGameScene): TextureVfxHandles {
  if (!sceneHandles.handles.texture_vfx) {
    sceneHandles.handles.texture_vfx = {
      projectiles: new Map(),
      zones: new Map(),
      buffs: new Map(),
      summon_bodies: new Map(),
      summon_auras: new Map(),
      summon_ground_decals: new Map(),
      trails: new Map(),
      impacts: new Map(),
      instances: new Map(),
      procedural_instances: new Map(),
      processed_events: new Set(),
      last_trail_spawn_time: new Map(),
      projectile_slots: new Map(),
      projectile_radii: new Map(),
      projectile_last_positions: new Map(),
      last_update_time: null,
      warnings: [],
    };
  }
  return sceneHandles.handles.texture_vfx;
}

function restoreDefaultVfxVisibility(sceneHandles: RenderedGameScene): void {
  for (const object of sceneHandles.handles.projectiles.values()) {
    object.visible = true;
  }
  for (const object of sceneHandles.handles.zones.values()) {
    object.visible = true;
  }
}

export function disposeTextureVfxObject(object: THREE.Object3D): void {
  disposeThreeObject(object);
}
