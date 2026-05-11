import * as THREE from "three";
import type { HeroState } from "../core";
import type { TrainingMapConfig } from "../maps";

export type CameraFollowOptions = {
  height?: number;
  distance?: number;
};

export function createFollowCamera(map: TrainingMapConfig): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 1000);
  const distance = Math.max(map.width, map.depth) * 0.45;
  camera.position.set(0, distance, distance);
  camera.lookAt(map.hero_spawn.x, 0, map.hero_spawn.z);
  return camera;
}

export function updateCameraFollowHero(
  camera: THREE.PerspectiveCamera,
  hero: HeroState,
  options: CameraFollowOptions = {},
): void {
  const height = options.height ?? 14;
  const distance = options.distance ?? 12;
  camera.position.set(hero.position.x, height, hero.position.z + distance);
  camera.lookAt(hero.position.x, 0, hero.position.z);
}
