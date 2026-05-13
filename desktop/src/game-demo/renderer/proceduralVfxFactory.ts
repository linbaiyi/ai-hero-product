import * as THREE from "three";
import type { ProceduralVfxInstance, ProceduralVfxOptions } from "./proceduralVfxTypes";
import {
  computeGlowDiscRadius,
  computeLightIntensityFromRadius,
  computeParticleSizeFromRadius,
  computeParticleSpreadRadius,
  computeRotatingRingRadius,
  computeShockwaveRadius,
} from "./vfxScaleCalibration";

let nextProceduralId = 0;

export function createShockwave(
  position: THREE.Vector3,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const radius = computeShockwaveRadius(options.radius ?? options.scale ?? 1);
  const material = createBasicMaterial(options, 0.55);
  const object3d = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 48), material);
  placeGroundObject(object3d, position);
  object3d.scale.setScalar(Math.max(0.01, radius * 2));
  object3d.name = `procedural-vfx:shockwave:${id(options)}`;
  return instance("shockwave", object3d, { ...options, scale: radius * 2 }, 0.4);
}

export function createGlowDisc(
  position: THREE.Vector3,
  radius: number,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const calibratedRadius = computeGlowDiscRadius(radius);
  const material = createBasicMaterial(options, 0.28);
  const object3d = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), material);
  placeGroundObject(object3d, position);
  object3d.scale.setScalar(Math.max(0.01, calibratedRadius * 2));
  object3d.name = `procedural-vfx:glow_disc:${id(options)}`;
  return instance("glow_disc", object3d, { ...options, scale: calibratedRadius * 2 }, 1.2);
}

export function createParticleBurst(
  position: THREE.Vector3,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const count = options.particle_count ?? 24;
  const radius = options.radius ?? options.scale ?? 1;
  const { geometry, velocities, initialPositions } = createParticleGeometry(
    count,
    position,
    options.spread_radius ?? computeParticleSpreadRadius(radius, "impact"),
    computeParticleSpreadRadius(radius, "impact") * 2.2,
    computeParticleSpreadRadius(radius, "impact") * 0.25,
  );
  const object3d = new THREE.Points(
    geometry,
    createPointsMaterial(
      { ...options, particle_size: options.particle_size ?? computeParticleSizeFromRadius(radius, "impact") },
      0.9,
    ),
  );
  object3d.name = `procedural-vfx:particle_burst:${id(options)}`;
  return {
    ...instance("particle_burst", object3d, options, 0.45),
    velocities,
    initial_positions: initialPositions,
  };
}

export function createParticleTrail(
  position: THREE.Vector3,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const count = options.particle_count ?? 8;
  const radius = options.radius ?? options.scale ?? 1;
  const { geometry, velocities, initialPositions } = createParticleGeometry(
    count,
    position,
    options.spread_radius ?? computeParticleSpreadRadius(radius, "trail"),
    computeParticleSpreadRadius(radius, "trail") * 2.4,
    computeParticleSpreadRadius(radius, "trail") * 0.35,
  );
  const object3d = new THREE.Points(
    geometry,
    createPointsMaterial(
      { ...options, particle_size: options.particle_size ?? computeParticleSizeFromRadius(radius, "trail") },
      0.55,
    ),
  );
  object3d.name = `procedural-vfx:particle_trail:${id(options)}`;
  return {
    ...instance("particle_trail", object3d, options, 0.28),
    velocities,
    initial_positions: initialPositions,
  };
}

export function createLightFlash(
  position: THREE.Vector3,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const radius = options.radius ?? options.scale ?? 1;
  const light = new THREE.PointLight(
    options.color ?? "#ffb15a",
    options.light_intensity ?? computeLightIntensityFromRadius(radius, "impact"),
    options.light_distance ?? Math.max(1, radius * 2.4),
    2.2,
  );
  light.position.copy(position);
  light.name = `procedural-vfx:light_flash:${id(options)}`;
  return instance(
    "light_flash",
    light,
    { ...options, light_intensity: light.intensity },
    0.22,
  );
}

export function createRotatingRing(
  position: THREE.Vector3,
  radius: number,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const calibratedRadius = computeRotatingRingRadius(radius);
  const material = createBasicMaterial(options, 0.45);
  const object3d = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 64), material);
  placeGroundObject(object3d, position);
  object3d.scale.setScalar(Math.max(0.01, calibratedRadius * 2));
  object3d.name = `procedural-vfx:rotating_ring:${id(options)}`;
  return instance(
    "rotating_ring",
    object3d,
    { ...options, scale: calibratedRadius * 2, rotation_speed: options.rotation_speed ?? 0.75 },
    1.5,
  );
}

export function createUpwardSparks(
  position: THREE.Vector3,
  options: ProceduralVfxOptions = {},
): ProceduralVfxInstance {
  const count = options.particle_count ?? 14;
  const radius = options.radius ?? options.scale ?? 1;
  const { geometry, velocities, initialPositions } = createParticleGeometry(
    count,
    position,
    options.spread_radius ?? computeParticleSpreadRadius(radius, "aura"),
    computeParticleSpreadRadius(radius, "aura") * 0.4,
    computeParticleSpreadRadius(radius, "aura") * 0.9,
  );
  const object3d = new THREE.Points(
    geometry,
    createPointsMaterial(
      { ...options, particle_size: options.particle_size ?? computeParticleSizeFromRadius(radius, "aura") },
      0.65,
    ),
  );
  object3d.name = `procedural-vfx:upward_sparks:${id(options)}`;
  return {
    ...instance("upward_sparks", object3d, options, 1.2),
    velocities,
    initial_positions: initialPositions,
  };
}

function instance(
  kind: ProceduralVfxInstance["kind"],
  object3d: THREE.Object3D,
  options: ProceduralVfxOptions,
  fallbackDuration: number,
): ProceduralVfxInstance {
  return {
    id: options.id ?? id(options),
    kind,
    object3d,
    age: 0,
    duration: Math.max(0.01, options.duration ?? fallbackDuration),
    opacity: options.opacity ?? 1,
    base_scale: options.scale ?? 1,
    light_intensity: options.light_intensity,
    rotation_speed: options.rotation_speed ?? 0,
    source_id: options.source_id,
    follow_target: options.follow_target,
    persistent: options.persistent,
  };
}

function id(options: ProceduralVfxOptions): string {
  return options.id ?? `${nextProceduralId++}`;
}

function createBasicMaterial(
  options: ProceduralVfxOptions,
  fallbackOpacity: number,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: options.color ?? "#ff8a2a",
    transparent: true,
    opacity: options.opacity ?? fallbackOpacity,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function createPointsMaterial(
  options: ProceduralVfxOptions,
  fallbackOpacity: number,
): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color: options.color ?? "#ffb15a",
    transparent: true,
    opacity: options.opacity ?? fallbackOpacity,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    size: options.particle_size ?? 0.12,
    sizeAttenuation: true,
  });
}

function placeGroundObject(object3d: THREE.Object3D, position: THREE.Vector3): void {
  object3d.position.copy(position);
  object3d.rotation.x = -Math.PI / 2;
  object3d.renderOrder = 5;
}

function createParticleGeometry(
  count: number,
  position: THREE.Vector3,
  spreadRadius: number,
  horizontalSpeed: number,
  verticalSpeed: number,
): {
  geometry: THREE.BufferGeometry;
  velocities: Float32Array;
  initialPositions: Float32Array;
} {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const radius = spreadRadius * (0.35 + ((index % 5) / 5) * 0.65);
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;
    const base = index * 3;
    positions[base] = position.x + offsetX;
    positions[base + 1] = position.y + ((index % 3) * 0.04);
    positions[base + 2] = position.z + offsetZ;
    velocities[base] = Math.cos(angle) * horizontalSpeed * (0.45 + (index % 4) * 0.15);
    velocities[base + 1] = verticalSpeed * (0.65 + (index % 4) * 0.12);
    velocities[base + 2] = Math.sin(angle) * horizontalSpeed * (0.45 + (index % 4) * 0.15);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return {
    geometry,
    velocities,
    initialPositions: positions.slice(),
  };
}
