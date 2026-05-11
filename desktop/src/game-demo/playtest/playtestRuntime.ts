import * as THREE from "three";
import {
  castSkill,
  getCooldownRemaining,
  setHeroFacing,
  type GameState,
  type HeroState,
  type Vec2,
  updateSimulation,
} from "../core";
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
  type RenderedGameScene,
} from "../renderer";
import { defaultPlayableSpec } from "../specs/defaultPlayableSpec";
import { normalizePlayableSpec } from "../specs/normalizePlayableSpec";
import type { HeroPlayableSpec, SkillSlot } from "../specs/playableSpecTypes";
import { createInputController, type InputController } from "./inputController";

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
};

export type PlaytestRuntimeOptions = {
  spec?: HeroPlayableSpec;
};

export function createPlaytestInitialState(
  spec: HeroPlayableSpec = defaultPlayableSpec,
): GameState {
  return createInitialGameStateFromSpecAndMap(
    normalizePlayableSpec(spec),
    defaultTrainingMap,
  );
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

export function createPlaytestSnapshot(
  state: GameState,
  spec: HeroPlayableSpec = defaultPlayableSpec,
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
  };
}

export class PlaytestRuntime {
  private readonly container: HTMLElement;
  private readonly spec: HeroPlayableSpec;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sceneHandles: RenderedGameScene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly input: InputController;
  private state: GameState;
  private frameId: number | null = null;
  private lastFrameTime = 0;
  private disposed = false;

  constructor(container: HTMLElement, options: PlaytestRuntimeOptions = {}) {
    if (!container) {
      throw new Error("PlaytestRuntime requires a container element.");
    }

    this.container = container;
    this.spec = normalizePlayableSpec(options.spec ?? defaultPlayableSpec);
    this.state = createInitialGameStateFromSpecAndMap(this.spec, defaultTrainingMap);
    this.sceneHandles = createBaseScene();
    this.camera = createDefaultCamera(defaultTrainingMap);
    this.sceneHandles.camera = this.camera;

    renderTrainingMap(this.sceneHandles, defaultTrainingMap);
    renderGameState(this.sceneHandles, this.state);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor("#080b12");
    this.renderer.domElement.className = "playtest-canvas";
    this.container.replaceChildren(this.renderer.domElement);

    this.input = createInputController(window);
    this.resize();
    window.addEventListener("resize", this.resize);
    this.start();
  }

  getState(): GameState {
    return this.state;
  }

  getStateSnapshot(): PlaytestSnapshot {
    return createPlaytestSnapshot(this.state, this.spec);
  }

  reset(): GameState {
    this.state = createInitialGameStateFromSpecAndMap(this.spec, defaultTrainingMap);
    this.input.clearPressedSkills();
    clearGameState(this.sceneHandles);
    renderGameState(this.sceneHandles, this.state);
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
    if (this.input.state.move.x !== 0 || this.input.state.move.z !== 0) {
      setHeroFacing(this.state.hero, this.input.state.move);
    }

    for (const slot of this.input.state.pressedSkills) {
      castSkill(this.state, this.spec, slot, getSkillTargetInFrontOfHero(this.state.hero));
    }
    this.input.clearPressedSkills();

    updateSimulation(this.state, this.input.state.move, delta);
    updateGameState(this.sceneHandles, this.state);
    updateCameraFollowHero(this.camera, this.state.hero);
    this.renderer.render(this.sceneHandles.scene, this.camera);
  }
}
