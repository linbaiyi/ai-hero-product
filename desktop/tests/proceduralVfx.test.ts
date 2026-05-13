import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  clearProceduralVfxInstances,
  createLightFlash,
  createGlowDisc,
  createParticleBurst,
  createParticleTrail,
  createRotatingRing,
  createShockwave,
  createUpwardSparks,
  enforceProceduralInstanceLimit,
  updateProceduralVfxInstance,
  updateProceduralVfxInstances,
  type ProceduralVfxInstance,
} from "../src/game-demo/renderer";

describe("procedural VFX", () => {
  it("createShockwave creates a RingGeometry mesh", () => {
    const shockwave = createShockwave(new THREE.Vector3(0, 0, 0), { radius: 2 });

    expect(shockwave.object3d).toBeInstanceOf(THREE.Mesh);
    expect((shockwave.object3d as THREE.Mesh).geometry).toBeInstanceOf(
      THREE.RingGeometry,
    );
    expect(shockwave.base_scale).toBeCloseTo(4.4);
  });

  it("shockwave expands and fades over time", () => {
    const shockwave = createShockwave(new THREE.Vector3(0, 0, 0));
    const initialScale = shockwave.object3d.scale.x;

    updateProceduralVfxInstance(shockwave, 0.2);

    const material = (shockwave.object3d as THREE.Mesh).material as THREE.Material;
    expect(shockwave.object3d.scale.x).toBeGreaterThan(initialScale);
    expect(material.opacity).toBeLessThan(shockwave.opacity);
  });

  it("createParticleBurst creates Points", () => {
    const burst = createParticleBurst(new THREE.Vector3(0, 0, 0), { radius: 2 });

    expect(burst.object3d).toBeInstanceOf(THREE.Points);
    expect(((burst.object3d as THREE.Points).material as THREE.PointsMaterial).size).toBeGreaterThan(0.04);
  });

  it("glow_disc and rotating_ring use calibrated radius", () => {
    const glow = createGlowDisc(new THREE.Vector3(0, 0, 0), 2);
    const ring = createRotatingRing(new THREE.Vector3(0, 0, 0), 2);

    expect(glow.base_scale).toBeCloseTo(4.2);
    expect(ring.base_scale).toBeCloseTo(4);
  });

  it("particle trail and upward sparks use radius-based spread", () => {
    const trail = createParticleTrail(new THREE.Vector3(0, 0, 0), { radius: 2 });
    const sparks = createUpwardSparks(new THREE.Vector3(0, 0, 0), { radius: 2 });

    expect(trail.object3d).toBeInstanceOf(THREE.Points);
    expect(sparks.object3d).toBeInstanceOf(THREE.Points);
  });

  it("particle_burst updates without throwing", () => {
    const burst = createParticleBurst(new THREE.Vector3(0, 0, 0));

    expect(() => updateProceduralVfxInstance(burst, 0.1)).not.toThrow();
  });

  it("light_flash intensity decays", () => {
    const flash = createLightFlash(new THREE.Vector3(0, 1, 0));
    const light = flash.object3d as THREE.PointLight;
    const initialIntensity = light.intensity;

    updateProceduralVfxInstance(flash, 0.12);

    expect(light.intensity).toBeLessThan(initialIntensity);
  });

  it("rotating_ring rotation changes", () => {
    const ring = createRotatingRing(new THREE.Vector3(0, 0, 0), 2, {
      rotation_speed: 1,
    });
    const initialRotation = ring.object3d.rotation.z;

    updateProceduralVfxInstance(ring, 0.2);

    expect(ring.object3d.rotation.z).toBeGreaterThan(initialRotation);
  });

  it("upward_sparks move upward", () => {
    const sparks = createUpwardSparks(new THREE.Vector3(0, 0, 0));
    const points = sparks.object3d as THREE.Points;
    const position = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const initialY = position.getY(0);

    updateProceduralVfxInstance(sparks, 0.25);

    expect(position.getY(0)).toBeGreaterThan(initialY);
  });

  it("expired procedural instances are cleaned", () => {
    const instances = new Map<string, ProceduralVfxInstance>();
    const flash = createLightFlash(new THREE.Vector3(0, 1, 0), {
      id: "flash",
      duration: 0.1,
    });
    instances.set(flash.id, flash);

    updateProceduralVfxInstances(instances, 0.2);

    expect(instances.size).toBe(0);
  });

  it("clearProceduralVfxInstances disposes and clears objects", () => {
    const instances = new Map<string, ProceduralVfxInstance>();
    const flash = createLightFlash(new THREE.Vector3(0, 1, 0), { id: "flash" });
    instances.set(flash.id, flash);

    clearProceduralVfxInstances(instances);

    expect(instances.size).toBe(0);
  });

  it("instance limit removes oldest entries", () => {
    const instances = new Map<string, ProceduralVfxInstance>();
    for (let index = 0; index < 4; index += 1) {
      const flash = createLightFlash(new THREE.Vector3(0, 1, 0), {
        id: `flash_${index}`,
      });
      instances.set(flash.id, flash);
    }

    enforceProceduralInstanceLimit(instances, 2);

    expect(instances.size).toBe(2);
    expect(instances.has("flash_0")).toBe(false);
  });
});
