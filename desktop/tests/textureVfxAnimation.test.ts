import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  expandAndFade,
  fadeInOut,
  fadeOut,
  pulse,
  updateRuntimeVfxInstance,
  type RuntimeVfxInstance,
} from "../src/game-demo/renderer";

function createInstance(kind: RuntimeVfxInstance["kind"]): RuntimeVfxInstance {
  return {
    id: `${kind}_1`,
    kind,
    slot: "Q",
    usage: kind === "ground_decal" ? "ground_decal" : kind,
    object3d: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true })),
    age: 0,
    duration: 1,
    base_scale: 1,
    base_opacity: 1,
    rotation_speed: 0,
  };
}

function getOpacity(instance: RuntimeVfxInstance): number {
  const material = (instance.object3d as THREE.Sprite).material;
  return Array.isArray(material) ? material[0].opacity : material.opacity;
}

describe("runtime VFX animation curves", () => {
  it("fadeOut decreases from 1 to 0", () => {
    expect(fadeOut(0)).toBe(1);
    expect(fadeOut(1)).toBe(0);
  });

  it("fadeInOut peaks in the middle", () => {
    expect(fadeInOut(0)).toBe(0);
    expect(fadeInOut(0.5)).toBe(1);
    expect(fadeInOut(1)).toBe(0);
  });

  it("pulse stays inside 0..1", () => {
    expect(pulse(0)).toBeGreaterThanOrEqual(0);
    expect(pulse(0.25)).toBeLessThanOrEqual(1);
  });

  it("expandAndFade expands scale and fades opacity", () => {
    const start = expandAndFade(0);
    const end = expandAndFade(1);

    expect(end.scale).toBeGreaterThan(start.scale);
    expect(end.opacity).toBeLessThan(start.opacity);
  });

  it("trail instance opacity falls over time", () => {
    const instance = createInstance("trail");

    updateRuntimeVfxInstance(instance, 0.75);

    expect(getOpacity(instance)).toBeLessThan(1);
  });

  it("impact instance expands and fades over time", () => {
    const instance = createInstance("impact");

    updateRuntimeVfxInstance(instance, 0.75);

    expect(instance.object3d.scale.x).toBeGreaterThan(1);
    expect(getOpacity(instance)).toBeLessThan(1);
  });

  it("age greater than duration expires transient instances", () => {
    const instance = createInstance("impact");

    expect(updateRuntimeVfxInstance(instance, 1.2)).toBe(false);
  });
});
