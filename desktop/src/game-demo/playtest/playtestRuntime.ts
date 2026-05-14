import * as THREE from "three";
import { BACKEND_BASE_URL } from "../../api/backendApi";
import {
  castSkill,
  distanceVec2,
  getCooldownRemaining,
  normalizeVec2,
  setHeroFacing,
  setCooldown,
  subVec2,
  type GameState,
  type HeroState,
  type Vec2,
  updateSimulation,
} from "../core";
import { getStatusEffectLabel } from "../core/statusRules";
import { createInitialGameStateFromSpecAndMap, defaultTrainingMap } from "../maps";
import {
  clearGameState,
  createBaseScene,
  createDefaultCamera,
  disposeThreeObject,
  renderGameState,
  renderTrainingMap,
  updateCameraFollowHero,
  updateGameState,
  createRuntimeTextureCache,
  createTextureVfxRenderer,
  clearRangeDebugOverlay,
  type RenderedGameScene,
  type RuntimeTextureCache,
  type TextureVfxRenderer,
  updateRangeDebugOverlay,
} from "../renderer";
import { defaultPlayableSpec } from "../specs/defaultPlayableSpec";
import { normalizePlayableSpec } from "../specs/normalizePlayableSpec";
import type { HeroPlayableSpec, SkillSlot } from "../specs/playableSpecTypes";
import { normalizeRuntimeVfxAssetSpec } from "../vfx-assets/normalizeRuntimeVfxAssetSpec";
import type { RuntimeVfxAssetSpec } from "../vfx-assets/runtimeVfxTypes";
import { createInputController, type InputController } from "./inputController";

const PLAYTEST_DEMO_POOL_VALUE = 9_999_999;

export type PlaytestSkillSnapshot = {
  slot: SkillSlot;
  name: string;
  cooldown_remaining: number;
};

export type PlaytestSnapshot = {
  hero_name: string;
  hp: number;
  max_hp: number;
  resource: number;
  max_resource: number;
  resource_type: string;
  skills: PlaytestSkillSnapshot[];
  runtime_vfx_enabled: boolean;
  runtime_vfx_composition_enabled: boolean;
  runtime_vfx_warnings: string[];
  runtime_vfx_instance_count: number;
  no_cooldown_enabled: boolean;
  show_vfx_range_debug: boolean;
  enemy_statuses: PlaytestEnemyStatusSnapshot[];
};

export type PlaytestEnemyStatusSnapshot = {
  enemy_id: string;
  enemy_name: string;
  statuses: {
    type: string;
    label: string;
    remaining: number;
  }[];
};

export type PlaytestRuntimeOptions = {
  spec?: HeroPlayableSpec;
  runtimeVfxAssetSpec?: RuntimeVfxAssetSpec | null;
  backendBaseUrl?: string;
  noCooldownEnabled?: boolean;
  showVfxRangeDebug?: boolean;
};

export function createPlaytestInitialState(
  spec: HeroPlayableSpec = defaultPlayableSpec,
): GameState {
  const state = createInitialGameStateFromSpecAndMap(
    normalizePlayableSpec(spec),
    defaultTrainingMap,
  );
  state.hero.max_hp = PLAYTEST_DEMO_POOL_VALUE;
  state.hero.hp = PLAYTEST_DEMO_POOL_VALUE;
  state.hero.max_resource = PLAYTEST_DEMO_POOL_VALUE;
  state.hero.resource = PLAYTEST_DEMO_POOL_VALUE;
  return state;
}

export function resetPlaytestState(spec: HeroPlayableSpec = defaultPlayableSpec): GameState {
  return createPlaytestInitialState(spec);
}

export function getSkillTargetInFrontOfHero(
  hero: HeroState,
  distance = 8,
): Vec2 {
  return {
    x: hero.position.x + hero.facing.x * distance,
    z: hero.position.z + hero.facing.z * distance,
  };
}

export function getMoveInputTowardDestination(
  hero: HeroState,
  destination?: Vec2,
  stopDistance = 0.18,
): Vec2 {
  if (!destination || distanceVec2(hero.position, destination) <= stopDistance) {
    return { x: 0, z: 0 };
  }
  return normalizeVec2(subVec2(destination, hero.position));
}

export function getGroundTargetFromPointer(
  event: MouseEvent,
  element: HTMLElement,
  camera: THREE.Camera,
): Vec2 | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -(((event.clientY - rect.top) / rect.height) * 2 - 1),
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  if (!raycaster.ray.intersectPlane(groundPlane, hit)) {
    return null;
  }

  return { x: hit.x, z: hit.z };
}

export function createPlaytestSnapshot(
  state: GameState,
  spec: HeroPlayableSpec = defaultPlayableSpec,
  options: {
    runtimeVfxEnabled?: boolean;
    runtimeVfxWarnings?: string[];
    runtimeVfxInstanceCount?: number;
    noCooldownEnabled?: boolean;
    showVfxRangeDebug?: boolean;
  } = {},
): PlaytestSnapshot {
  return {
    hero_name: state.hero.name,
    hp: state.hero.hp,
    max_hp: state.hero.max_hp,
    resource: state.hero.resource,
    max_resource: state.hero.max_resource,
    resource_type: state.hero.resource_type,
    skills: spec.skills.map((skill) => ({
      slot: skill.slot,
      name: skill.name,
      cooldown_remaining: getCooldownRemaining(state.hero.cooldowns, skill.slot),
    })),
    runtime_vfx_enabled: options.runtimeVfxEnabled ?? false,
    runtime_vfx_composition_enabled: options.runtimeVfxEnabled ?? false,
    runtime_vfx_warnings: options.runtimeVfxWarnings ?? [],
    runtime_vfx_instance_count: options.runtimeVfxInstanceCount ?? 0,
    no_cooldown_enabled: options.noCooldownEnabled ?? false,
    show_vfx_range_debug: options.showVfxRangeDebug ?? false,
    enemy_statuses: state.enemies
      .filter((enemy) => enemy.is_alive && enemy.status_effects.length > 0)
      .map((enemy) => ({
        enemy_id: enemy.id,
        enemy_name: enemy.name,
        statuses: enemy.status_effects.map((effect) => ({
          type: effect.type,
          label: getStatusEffectLabel(effect.type),
          remaining: effect.duration_remaining,
        })),
      })),
  };
}

export class PlaytestRuntime {
  private readonly container: HTMLElement;
  private readonly spec: HeroPlayableSpec;
  private readonly runtimeVfxAssetSpec: RuntimeVfxAssetSpec | null;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sceneHandles: RenderedGameScene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly input: InputController;
  private readonly textureCache: RuntimeTextureCache | null;
  private readonly textureVfxRenderer: TextureVfxRenderer | null;
  private state: GameState;
  private frameId: number | null = null;
  private lastFrameTime = 0;
  private disposed = false;
  private noCooldownEnabled: boolean;
  private showVfxRangeDebug: boolean;

  constructor(container: HTMLElement, options: PlaytestRuntimeOptions = {}) {
    if (!container) {
      throw new Error("PlaytestRuntime requires a container element.");
    }

    this.container = container;
    this.spec = normalizePlayableSpec(options.spec ?? defaultPlayableSpec);
    this.runtimeVfxAssetSpec = options.runtimeVfxAssetSpec
      ? normalizeRuntimeVfxAssetSpec(options.runtimeVfxAssetSpec)
      : null;
    this.noCooldownEnabled = options.noCooldownEnabled ?? false;
    this.showVfxRangeDebug = options.showVfxRangeDebug ?? false;
    this.state = createPlaytestInitialState(this.spec);
    this.sceneHandles = createBaseScene();
    this.camera = createDefaultCamera(defaultTrainingMap);
    this.sceneHandles.camera = this.camera;
    this.textureCache = this.runtimeVfxAssetSpec
      ? createRuntimeTextureCache(options.backendBaseUrl ?? BACKEND_BASE_URL)
      : null;
    this.textureVfxRenderer = this.textureCache
      ? createTextureVfxRenderer({
          sceneHandles: this.sceneHandles,
          textureCache: this.textureCache,
        })
      : null;

    renderTrainingMap(this.sceneHandles, defaultTrainingMap);
    renderGameState(this.sceneHandles, this.state);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor("#080b12");
    this.renderer.domElement.className = "playtest-canvas";
    this.container.replaceChildren(this.renderer.domElement);

    this.input = createInputController(this.renderer.domElement, {
      keyboardTarget: window,
      resolvePointerTarget: (event) =>
        getGroundTargetFromPointer(event, this.renderer.domElement, this.camera),
    });
    this.resize();
    window.addEventListener("resize", this.resize);
    this.start();
  }

  getState(): GameState {
    return this.state;
  }

  getStateSnapshot(): PlaytestSnapshot {
    return createPlaytestSnapshot(this.state, this.spec, {
      runtimeVfxEnabled: Boolean(this.runtimeVfxAssetSpec),
      runtimeVfxWarnings: this.textureVfxRenderer?.getWarnings() ?? [],
      runtimeVfxInstanceCount: this.textureVfxRenderer?.getInstanceCount() ?? 0,
      noCooldownEnabled: this.noCooldownEnabled,
      showVfxRangeDebug: this.showVfxRangeDebug,
    });
  }

  setNoCooldownEnabled(enabled: boolean): void {
    this.noCooldownEnabled = enabled;
    if (enabled) {
      for (const skill of this.spec.skills) {
        setCooldown(this.state.hero.cooldowns, skill.slot, 0);
      }
    }
  }

  setShowVfxRangeDebug(enabled: boolean): void {
    this.showVfxRangeDebug = enabled;
    if (!enabled) {
      clearRangeDebugOverlay(this.sceneHandles);
    }
  }

  reset(): GameState {
    this.state = createPlaytestInitialState(this.spec);
    this.input.clearPressedSkills();
    clearGameState(this.sceneHandles);
    renderGameState(this.sceneHandles, this.state);
    this.textureVfxRenderer?.clear();
    clearRangeDebugOverlay(this.sceneHandles);
    this.textureVfxRenderer?.update(this.state, this.runtimeVfxAssetSpec);
    updateRangeDebugOverlay(this.sceneHandles, this.state, {
      showVfxRangeDebug: this.showVfxRangeDebug,
    });
    return this.state;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    window.removeEventListener("resize", this.resize);
    this.input.destroy();
    this.textureVfxRenderer?.clear();
    clearRangeDebugOverlay(this.sceneHandles);
    this.textureCache?.dispose();
    disposeThreeObject(this.sceneHandles.root);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly resize = () => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private start(): void {
    this.lastFrameTime = performance.now();
    const loop = (time: number) => {
      if (this.disposed) {
        return;
      }
      const delta = Math.min(0.05, Math.max(0, (time - this.lastFrameTime) / 1000));
      this.lastFrameTime = time;
      this.step(delta);
      this.frameId = window.requestAnimationFrame(loop);
    };
    this.frameId = window.requestAnimationFrame(loop);
  }

  private step(delta: number): void {
    const moveInput = getMoveInputTowardDestination(
      this.state.hero,
      this.input.state.moveDestination,
    );
    this.input.state.move = moveInput;
    if (moveInput.x === 0 && moveInput.z === 0) {
      this.input.clearMoveDestination();
    } else {
      setHeroFacing(this.state.hero, moveInput);
    }

    for (const slot of this.input.state.pressedSkills) {
      const target =
        this.input.state.pointerTarget ?? getSkillTargetInFrontOfHero(this.state.hero);
      const result = castSkill(this.state, this.spec, slot, target);
      if (this.noCooldownEnabled && result.success && result.skill_slot) {
        setCooldown(this.state.hero.cooldowns, result.skill_slot, 0);
      }
    }
    this.input.clearPressedSkills();

    updateSimulation(this.state, moveInput, delta);
    updateGameState(this.sceneHandles, this.state);
    this.textureVfxRenderer?.update(this.state, this.runtimeVfxAssetSpec);
    updateRangeDebugOverlay(this.sceneHandles, this.state, {
      showVfxRangeDebug: this.showVfxRangeDebug,
    });
    updateCameraFollowHero(this.camera, this.state.hero);
    this.renderer.render(this.sceneHandles.scene, this.camera);
  }
}
