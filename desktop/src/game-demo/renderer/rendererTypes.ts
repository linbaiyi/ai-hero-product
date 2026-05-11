import * as THREE from "three";

export type GameSceneHandles = {
  hero?: THREE.Object3D;
  enemies: Map<string, THREE.Object3D>;
  obstacles: Map<string, THREE.Object3D>;
  projectiles: Map<string, THREE.Object3D>;
  zones: Map<string, THREE.Object3D>;
};

export type RenderedGameScene = {
  scene: THREE.Scene;
  root: THREE.Group;
  map_group: THREE.Group;
  entity_group: THREE.Group;
  vfx_group: THREE.Group;
  camera?: THREE.PerspectiveCamera;
  handles: GameSceneHandles;
};

export type RendererOptions = {
  background_color?: THREE.ColorRepresentation;
};

export type RenderedEntityHandles = GameSceneHandles;
