import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../src/game-demo/core";
import { createInitialGameStateFromSpecAndMap, defaultTrainingMap } from "../src/game-demo/maps";
import {
  createBaseScene,
  createMaterialForRuntimeAsset,
  clearTextureVfx,
  findAssetForSkillUsage,
  getThreeBlendingMode,
  isSafeRuntimeTexturePath,
  renderGameState,
  resolveRuntimeTextureUrl,
  updateTextureVfx,
  type RuntimeTextureCache,
} from "../src/game-demo/renderer";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import { defaultRuntimeVfxAssetSpec } from "../src/game-demo/vfx-assets/defaultRuntimeVfxAssetSpec";
import type { RuntimeVfxAssetSpec } from "../src/game-demo/vfx-assets/runtimeVfxTypes";

function createState(): GameState {
  return createInitialGameStateFromSpecAndMap(defaultPlayableSpec, defaultTrainingMap);
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function createFakeTextureCache(texture = new THREE.Texture()): RuntimeTextureCache {
  return {
    baseUrl: "http://127.0.0.1:8000",
    load: vi.fn().mockResolvedValue(texture),
    get: vi.fn().mockReturnValue(texture),
    getWarnings: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
  };
}

function createTextureWithSize(width: number, height: number): THREE.Texture {
  const texture = new THREE.Texture();
  texture.image = { width, height };
  return texture;
}

function createSummonRuntimeVfxSpec(): RuntimeVfxAssetSpec {
  const spec = JSON.parse(JSON.stringify(defaultRuntimeVfxAssetSpec)) as RuntimeVfxAssetSpec;
  spec.skills.Q.skill_type = "summon";
  spec.skills.Q.assets.summon_body = {
    path: "runtime_vfx/generated/hero/Q_summon_body.png",
    usage: "summon_body",
    blend_mode: "alpha",
    render_mode: "sprite",
    scale: 1.6,
    duration: 8,
    loop: false,
    color_tint: "#ff5a1f",
  };
  return spec;
}

function createSummonGroundDecalRuntimeVfxSpec(): RuntimeVfxAssetSpec {
  const spec = JSON.parse(JSON.stringify(defaultRuntimeVfxAssetSpec)) as RuntimeVfxAssetSpec;
  spec.skills.E.skill_type = "summon";
  spec.skills.E.assets = {
    summon_body: {
      path: "runtime_vfx/generated/hero/E_summon_body.png",
      usage: "summon_body",
      blend_mode: "alpha",
      render_mode: "sprite",
      scale: 1.6,
      duration: 8,
      loop: false,
      color_tint: "#ff5a1f",
    },
    aura: {
      path: "runtime_vfx/generated/hero/E_aura.png",
      usage: "aura",
      blend_mode: "additive",
      render_mode: "aura_ring",
      scale: 2,
      duration: 8,
      loop: true,
      color_tint: "#ff8a2a",
    },
    ground_decal: {
      path: "runtime_vfx/generated/hero/E_ground_decal.png",
      usage: "ground_decal",
      blend_mode: "additive",
      render_mode: "ground_plane",
      scale: 4,
      duration: 8,
      loop: true,
      color_tint: "#ff5a1f",
    },
  };
  return spec;
}

describe("runtime texture loader and VFX renderer", () => {
  it("isSafeRuntimeTexturePath accepts runtime_vfx relative paths", () => {
    expect(
      isSafeRuntimeTexturePath("runtime_vfx/generated/hero/Q_projectile.png"),
    ).toBe(true);
  });

  it("rejects unsafe texture paths", () => {
    expect(isSafeRuntimeTexturePath("http://example.com/a.png")).toBe(false);
    expect(isSafeRuntimeTexturePath("https://example.com/a.png")).toBe(false);
    expect(isSafeRuntimeTexturePath("javascript:alert(1)")).toBe(false);
    expect(isSafeRuntimeTexturePath("../secret.png")).toBe(false);
  });

  it("resolveRuntimeTextureUrl builds backend file URL", () => {
    expect(
      resolveRuntimeTextureUrl(
        "runtime_vfx/generated/hero/Q_projectile.png",
        "http://127.0.0.1:8000/",
      ),
    ).toBe(
      "http://127.0.0.1:8000/api/files/outputs/runtime_vfx/generated/hero/Q_projectile.png",
    );
  });

  it("findAssetForSkillUsage finds projectile asset", () => {
    const asset = findAssetForSkillUsage(defaultRuntimeVfxAssetSpec, "Q", "projectile");

    expect(asset?.usage).toBe("projectile");
  });

  it("findAssetForSkillUsage returns undefined for missing usage", () => {
    expect(findAssetForSkillUsage(defaultRuntimeVfxAssetSpec, "Q", "aura")).toBeUndefined();
  });

  it("summon_body texture replaces fallback summon mesh when loaded", () => {
    const handles = createBaseScene();
    const state = createState();
    state.summons.push({
      id: "summon_1",
      skill_slot: "Q",
      name: "Flame Spirit",
      position: { x: 2, z: 1 },
      max_hp: 120,
      hp: 120,
      radius: 0.6,
      damage: 12,
      attack_range: 6,
      attack_interval: 1,
      attack_timer: 0,
      duration_remaining: 5,
      status_effects: [],
      is_alive: true,
    });
    const spec = createSummonRuntimeVfxSpec();

    renderGameState(handles, state);
    updateTextureVfx(handles, state, spec, createFakeTextureCache());

    expect(handles.handles.texture_vfx?.warnings).toEqual([]);
    expect(handles.handles.texture_vfx?.summon_bodies.get("summon_body:summon_1")).toBeInstanceOf(
      THREE.Sprite,
    );
    const fallback = handles.handles.summons.get("summon_1");
    expect(fallback?.visible).toBe(true);
    expect(fallback?.getObjectByName("summon-fallback-body")?.visible).toBe(false);
    expect(fallback?.getObjectByName("summon-fallback-core")?.visible).toBe(false);
    expect(fallback?.getObjectByName("health-bar")?.visible).toBe(true);
  });

  it("summon ground_decal texture is rendered at the summon position", () => {
    const handles = createBaseScene();
    const state = createState();
    state.summons.push({
      id: "summon_1",
      skill_slot: "E",
      name: "Flame Spirit",
      position: { x: 2, z: 1 },
      max_hp: 120,
      hp: 120,
      radius: 1.4,
      damage: 12,
      attack_range: 6,
      attack_interval: 1,
      attack_timer: 0,
      duration_remaining: 5,
      status_effects: [],
      is_alive: true,
    });
    const spec = createSummonGroundDecalRuntimeVfxSpec();

    renderGameState(handles, state);
    updateTextureVfx(handles, state, spec, createFakeTextureCache(createTextureWithSize(512, 512)));

    const decal = handles.handles.texture_vfx?.summon_ground_decals.get(
      "summon_ground_decal:summon_1",
    );
    expect(decal).toBeInstanceOf(THREE.Mesh);
    expect(decal?.position.x).toBe(2);
    expect(decal?.position.z).toBe(1);
    expect(decal?.scale.x).toBeCloseTo(2.8, 1);
    const proceduralIds = [
      ...(handles.handles.texture_vfx?.procedural_instances.keys() ?? []),
    ];
    expect(proceduralIds).toContain("procedural:summon_ground_glow:summon_1");
    expect(proceduralIds).toContain("procedural:summon_ground_ring:summon_1");
  });

  it("updateTextureVfx does not mutate GameState", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    const before = cloneState(state);

    renderGameState(handles, state);
    updateTextureVfx(
      handles,
      state,
      defaultRuntimeVfxAssetSpec,
      createFakeTextureCache(),
    );

    expect(state).toEqual(before);
  });

  it("no runtimeVfxAssetSpec keeps fallback behavior", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);
    updateTextureVfx(handles, state, null, createFakeTextureCache());

    expect(handles.handles.projectiles.get("projectile_1")?.visible).toBe(true);
  });

  it("invalid or missing texture path skips safely", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    const unsafeSpec: RuntimeVfxAssetSpec = {
      ...defaultRuntimeVfxAssetSpec,
      skills: {
        ...defaultRuntimeVfxAssetSpec.skills,
        Q: {
          ...defaultRuntimeVfxAssetSpec.skills.Q,
          assets: {
            projectile: {
              ...defaultRuntimeVfxAssetSpec.skills.Q.assets.projectile,
              path: "https://example.com/Q_projectile.png",
            },
          },
        },
      },
    };

    renderGameState(handles, state);
    updateTextureVfx(handles, state, unsafeSpec, createFakeTextureCache(null as any));

    expect(handles.handles.projectiles.get("projectile_1")?.visible).toBe(true);
  });

  it("additive blend mode maps to THREE.AdditiveBlending", () => {
    const asset = defaultRuntimeVfxAssetSpec.skills.Q.assets.projectile;
    const material = createMaterialForRuntimeAsset(asset, new THREE.Texture());

    expect(getThreeBlendingMode("additive")).toBe(THREE.AdditiveBlending);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.transparent).toBe(true);
    expect(material.color.getHexString()).toBe("ffffff");
  });

  it("creates projectile, zone, and aura texture objects when textures exist", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 4, z: 3 },
      radius: 5,
      damage: 20,
      duration_remaining: 4,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });
    state.buffs.push({
      id: "buff_1",
      skill_slot: "E",
      stat: "move_speed",
      value: 1.2,
      duration_remaining: 2,
      original_value: state.hero.move_speed,
    });

    renderGameState(handles, state);
    updateTextureVfx(
      handles,
      state,
      defaultRuntimeVfxAssetSpec,
      createFakeTextureCache(),
    );

    expect(handles.handles.texture_vfx?.projectiles.get("projectile_1")).toBeInstanceOf(
      THREE.Sprite,
    );
    expect(handles.handles.texture_vfx?.zones.get("zone_1")).toBeInstanceOf(
      THREE.Mesh,
    );
    expect(handles.handles.texture_vfx?.buffs.get("buff_1")).toBeInstanceOf(
      THREE.Mesh,
    );
    const proceduralKinds = [
      ...(handles.handles.texture_vfx?.procedural_instances.values() ?? []),
    ].map((instance) => instance.kind);
    expect(proceduralKinds).toContain("glow_disc");
    expect(proceduralKinds).toContain("rotating_ring");
    expect(proceduralKinds).toContain("upward_sparks");
    expect(handles.handles.projectiles.get("projectile_1")?.visible).toBe(false);
    expect(handles.handles.zones.get("zone_1")?.visible).toBe(false);
  });

  it("sizes runtime texture VFX from gameplay hit radius", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 0.5,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 4, z: 3 },
      radius: 1,
      damage: 20,
      duration_remaining: 4,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);
    updateTextureVfx(handles, state, defaultRuntimeVfxAssetSpec, createFakeTextureCache());

    expect(handles.handles.texture_vfx?.projectiles.get("projectile_1")?.scale.x).toBeCloseTo(1);
    expect(handles.handles.texture_vfx?.zones.get("zone_1")?.scale.x).toBeCloseTo(2, 1);
  });

  it("calibrates procedural VFX from the same logical ranges as textures", () => {
    const handles = createBaseScene();
    const state = createState();
    state.time = 0.2;
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 0.5,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 4, z: 3 },
      radius: 2,
      damage: 20,
      duration_remaining: 4,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });
    state.buffs.push({
      id: "buff_1",
      skill_slot: "E",
      stat: "move_speed",
      value: 1.2,
      duration_remaining: 2,
      original_value: state.hero.move_speed,
    });
    state.events.push({
      type: "projectile_hit",
      projectile_id: "projectile_1",
      enemy_id: state.enemies[0].id,
    });

    renderGameState(handles, state);
    updateTextureVfx(handles, state, defaultRuntimeVfxAssetSpec, createFakeTextureCache());

    const procedural = [...(handles.handles.texture_vfx?.procedural_instances.values() ?? [])];
    expect(procedural.find((item) => item.id === "procedural:zone_ring:zone_1")?.base_scale).toBeCloseTo(4);
    expect(procedural.find((item) => item.id === "procedural:projectile_light:projectile_1")?.light_intensity).toBeGreaterThan(0);
    expect(procedural.find((item) => item.kind === "particle_trail")?.object3d).toBeInstanceOf(THREE.Points);
    expect(procedural.find((item) => item.kind === "shockwave")?.base_scale).toBeLessThanOrEqual(2.4);
    expect(procedural.find((item) => item.id === "procedural:aura_ring:buff_1")?.base_scale).toBeGreaterThan(0);
  });

  it("preserves texture aspect ratio while fitting gameplay effect size", () => {
    const handles = createBaseScene();
    const state = createState();
    state.time = 0.2;
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 0.5,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    state.active_zones.push({
      id: "zone_1",
      skill_slot: "W",
      center: { x: 4, z: 3 },
      radius: 1,
      damage: 20,
      duration_remaining: 4,
      tick_interval: 1,
      tick_timer: 1,
      status_effects: [],
      is_alive: true,
    });
    state.buffs.push({
      id: "buff_1",
      skill_slot: "E",
      stat: "move_speed",
      value: 1.2,
      duration_remaining: 2,
      original_value: state.hero.move_speed,
    });
    state.events.push({
      type: "projectile_hit",
      projectile_id: "projectile_1",
      enemy_id: state.enemies[0].id,
    });

    renderGameState(handles, state);
    updateTextureVfx(
      handles,
      state,
      defaultRuntimeVfxAssetSpec,
      createFakeTextureCache(createTextureWithSize(200, 100)),
    );

    expect(handles.handles.texture_vfx?.projectiles.get("projectile_1")?.scale.x).toBeCloseTo(1);
    expect(handles.handles.texture_vfx?.projectiles.get("projectile_1")?.scale.y).toBeCloseTo(0.5);
    expect(handles.handles.texture_vfx?.zones.get("zone_1")?.scale.x).toBeCloseTo(2, 1);
    expect(handles.handles.texture_vfx?.zones.get("zone_1")?.scale.y).toBeCloseTo(1, 1);
    expect(handles.handles.texture_vfx?.buffs.get("buff_1")?.scale.x).toBeGreaterThan(
      handles.handles.texture_vfx?.buffs.get("buff_1")?.scale.y ?? 0,
    );
    expect([...((handles.handles.texture_vfx?.trails.values() ?? []) as Iterable<THREE.Object3D>)][0]?.scale.x).toBeGreaterThan(
      [...((handles.handles.texture_vfx?.trails.values() ?? []) as Iterable<THREE.Object3D>)][0]?.scale.y ?? 0,
    );
    expect([...((handles.handles.texture_vfx?.impacts.values() ?? []) as Iterable<THREE.Object3D>)][0]?.scale.x).toBeGreaterThan(
      [...((handles.handles.texture_vfx?.impacts.values() ?? []) as Iterable<THREE.Object3D>)][0]?.scale.y ?? 0,
    );
  });

  it("combines projectile, trail, and impact for Q", () => {
    const handles = createBaseScene();
    const state = createState();
    state.time = 0.2;
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });
    state.events.push({
      type: "projectile_hit",
      projectile_id: "projectile_1",
      enemy_id: state.enemies[0].id,
    });

    renderGameState(handles, state);
    updateTextureVfx(handles, state, defaultRuntimeVfxAssetSpec, createFakeTextureCache());

    expect(handles.handles.texture_vfx?.projectiles.size).toBe(1);
    expect(handles.handles.texture_vfx?.trails.size).toBe(1);
    expect(handles.handles.texture_vfx?.impacts.size).toBe(1);
    const proceduralKinds = [
      ...(handles.handles.texture_vfx?.procedural_instances.values() ?? []),
    ].map((instance) => instance.kind);
    expect(proceduralKinds).toContain("light_flash");
    expect(proceduralKinds).toContain("particle_trail");
    expect(proceduralKinds).toContain("shockwave");
    expect(proceduralKinds).toContain("particle_burst");
  });

  it("R cast transient texture uses the skill cast target", () => {
    const handles = createBaseScene();
    const state = createState();
    state.hero.position = { x: 0, z: 0 };
    state.hero.facing = { x: 1, z: 0 };
    state.events.push({
      type: "skill_cast",
      skill_slot: "R",
      skill_type: "aoe",
      target: { x: -6, z: 5 },
      radius: 6,
    });

    renderGameState(handles, state);
    updateTextureVfx(handles, state, defaultRuntimeVfxAssetSpec, createFakeTextureCache());

    const decal = handles.handles.texture_vfx?.impacts.get(
      "ground_decal:skill_cast:R:aoe:0:decal",
    );
    expect(decal?.position.x).toBe(-6);
    expect(decal?.position.z).toBe(5);
    expect(decal?.scale.x).toBeCloseTo(12, 1);
  });

  it("trail instances do not grow without limit and expired instances are cleaned", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);
    for (let i = 0; i < 80; i += 1) {
      state.time += 0.1;
      state.projectiles[0].position.x += 0.1;
      updateTextureVfx(handles, state, defaultRuntimeVfxAssetSpec, createFakeTextureCache());
    }

    expect(handles.handles.texture_vfx?.trails.size).toBeLessThanOrEqual(32);
    expect(handles.handles.texture_vfx?.instances.size).toBeLessThanOrEqual(34);
    const particleTrailCount = [
      ...(handles.handles.texture_vfx?.procedural_instances.values() ?? []),
    ].filter((instance) => instance.kind === "particle_trail").length;
    expect(particleTrailCount).toBeLessThanOrEqual(40);
  });

  it("clear removes all VFX objects", () => {
    const handles = createBaseScene();
    const state = createState();
    state.projectiles.push({
      id: "projectile_1",
      skill_slot: "Q",
      position: { x: 2, z: 1 },
      direction: { x: 1, z: 0 },
      speed: 10,
      radius: 1,
      damage: 100,
      remaining_range: 8,
      status_effects: [],
      is_alive: true,
    });

    renderGameState(handles, state);
    updateTextureVfx(handles, state, defaultRuntimeVfxAssetSpec, createFakeTextureCache());
    expect(handles.handles.texture_vfx?.instances.size).toBeGreaterThan(0);

    clearTextureVfx(handles);

    expect(handles.handles.texture_vfx?.instances.size).toBe(0);
    expect(handles.handles.texture_vfx?.procedural_instances.size).toBe(0);
    expect(handles.handles.projectiles.get("projectile_1")?.visible).toBe(true);
  });

  it("ground_decal material is transparent, additive, and depthWrite disabled", () => {
    const asset = defaultRuntimeVfxAssetSpec.skills.W.assets.ground_decal;
    const material = createMaterialForRuntimeAsset(asset, new THREE.Texture());

    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.blending).toBe(THREE.AdditiveBlending);
  });
});
