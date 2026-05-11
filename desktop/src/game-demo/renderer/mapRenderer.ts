import * as THREE from "three";
import type { TrainingMapConfig } from "../maps";
import {
  createBoundaryMaterial,
  createGroundMaterial,
  createObstacleMaterial,
} from "./materials";
import type { RenderedGameScene } from "./rendererTypes";
import { disposeThreeObject } from "./disposeThreeObject";

export function renderTrainingMap(
  sceneHandles: RenderedGameScene,
  map: TrainingMapConfig,
): void {
  clearTrainingMap(sceneHandles);
  sceneHandles.map_group.add(createGroundMesh(map));
  sceneHandles.map_group.add(createBoundaryLine(map));

  for (const obstacle of map.obstacles) {
    const height = obstacle.height ?? 1;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(obstacle.width, height, obstacle.depth),
      createObstacleMaterial(),
    );
    mesh.name = `obstacle:${obstacle.id}`;
    mesh.position.set(obstacle.position.x, height / 2, obstacle.position.z);
    sceneHandles.map_group.add(mesh);
    sceneHandles.handles.obstacles.set(obstacle.id, mesh);
  }
}

export function updateTrainingMap(
  sceneHandles: RenderedGameScene,
  map: TrainingMapConfig,
): void {
  renderTrainingMap(sceneHandles, map);
}

export function clearTrainingMap(sceneHandles: RenderedGameScene): void {
  for (const child of [...sceneHandles.map_group.children]) {
    sceneHandles.map_group.remove(child);
    disposeThreeObject(child);
  }
  sceneHandles.handles.obstacles.clear();
}

function createGroundMesh(map: TrainingMapConfig): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(map.width, map.depth),
    createGroundMaterial(),
  );
  mesh.name = "training-ground";
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function createBoundaryLine(map: TrainingMapConfig): THREE.LineLoop {
  const halfWidth = map.width / 2;
  const halfDepth = map.depth / 2;
  const points = [
    new THREE.Vector3(-halfWidth, 0.04, -halfDepth),
    new THREE.Vector3(halfWidth, 0.04, -halfDepth),
    new THREE.Vector3(halfWidth, 0.04, halfDepth),
    new THREE.Vector3(-halfWidth, 0.04, halfDepth),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineLoop(geometry, createBoundaryMaterial());
  line.name = "training-boundary";
  return line;
}
