import * as THREE from "three";

export function disposeGeometry(geometry: THREE.BufferGeometry | undefined): void {
  geometry?.dispose();
}

export function disposeMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
): void {
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose();
    }
    return;
  }
  material?.dispose();
}

export function disposeThreeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    disposeGeometry(mesh.geometry);
    disposeMaterial(mesh.material);
  });
}
