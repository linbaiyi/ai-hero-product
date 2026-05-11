import * as THREE from "three";
import type { TrainingMapConfig } from "../maps";
import type { RenderedGameScene, RendererOptions } from "./rendererTypes";

export function createBaseScene(options: RendererOptions = {}): RenderedGameScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background_color ?? "#080b12");

  const root = new THREE.Group();
  root.name = "game-demo-root";
  const map_group = new THREE.Group();
  map_group.name = "map-group";
  const entity_group = new THREE.Group();
  entity_group.name = "entity-group";
  const vfx_group = new THREE.Group();
  vfx_group.name = "vfx-group";

  root.add(map_group, entity_group, vfx_group);
  scene.add(root);

  const ambient = new THREE.AmbientLight("#ffffff", 0.7);
  ambient.name = "ambient-light";
  const directional = new THREE.DirectionalLight("#ffffff", 1.2);
  directional.name = "directional-light";
  directional.position.set(12, 18, 8);
  scene.add(ambient, directional);

  return {
    scene,
    root,
    map_group,
    entity_group,
    vfx_group,
    handles: {
      enemies: new Map(),
      obstacles: new Map(),
      projectiles: new Map(),
      zones: new Map(),
    },
  };
}

export function createDefaultCamera(map: TrainingMapConfig): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 1000);
  const distance = Math.max(map.width, map.depth);
  camera.position.set(0, distance * 0.7, distance * 0.65);
  camera.lookAt(0, 0, 0);
  return camera;
}
