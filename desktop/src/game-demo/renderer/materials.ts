import * as THREE from "three";
import type { MapEnemyType } from "../maps";

export function createGroundMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#20242c", roughness: 0.9 });
}

export function createBoundaryMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: "#5f708a" });
}

export function createHeroMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.55 });
}

export function createEnemyMaterial(
  enemyType: MapEnemyType | "generic" = "generic",
): THREE.MeshStandardMaterial {
  const colorByType: Record<MapEnemyType | "generic", string> = {
    dummy: "#f97316",
    melee: "#ef4444",
    ranged: "#fb7185",
    generic: "#f97316",
  };
  return new THREE.MeshStandardMaterial({
    color: colorByType[enemyType],
    roughness: 0.65,
  });
}

export function createObstacleMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#6b7280", roughness: 0.85 });
}

export function createProjectileMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#fb923c", emissive: "#7c2d12" });
}

export function createZoneMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: "#f97316",
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
}

export function createDeadEnemyMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#374151", roughness: 1 });
}
