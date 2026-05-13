import { describe, expect, it } from "vitest";
import {
  computeAspectPreservedScale,
  computeAuraTextureScale,
  computeGlowDiscRadius,
  computeGroundDecalTextureScale,
  computeImpactTextureScale,
  computeLightIntensityFromRadius,
  computeParticleSizeFromRadius,
  computeParticleSpreadRadius,
  computeProjectileTextureScale,
  computeRotatingRingRadius,
  computeShockwaveRadius,
  computeTrailTextureScale,
} from "../src/game-demo/renderer";

function longest(scale: number | { x: number; y: number; z?: number }): number {
  return typeof scale === "number" ? scale : Math.max(scale.x, scale.y, scale.z ?? 1);
}

describe("VFX scale calibration", () => {
  it("scales square textures by longest side", () => {
    expect(computeAspectPreservedScale(256, 256, 4)).toMatchObject({ x: 4, y: 4 });
  });

  it("preserves landscape texture aspect ratio", () => {
    expect(computeAspectPreservedScale(512, 256, 4)).toMatchObject({ x: 4, y: 2 });
  });

  it("preserves portrait texture aspect ratio", () => {
    expect(computeAspectPreservedScale(256, 512, 4)).toMatchObject({ x: 2, y: 4 });
  });

  it("ground decal and projectile longest side match radius diameter", () => {
    expect(longest(computeGroundDecalTextureScale(3, 512, 256))).toBe(6);
    expect(longest(computeProjectileTextureScale(0.5, 512, 256))).toBe(1);
  });

  it("impact and aura texture scales keep aspect ratio", () => {
    expect(computeImpactTextureScale(2, 400, 200)).toMatchObject({ x: 4, y: 2 });
    expect(computeAuraTextureScale(2, 200, 400)).toMatchObject({ x: 2, y: 4 });
  });

  it("invalid radius and texture size return safe defaults", () => {
    expect(longest(computeGroundDecalTextureScale(0, 0, -1))).toBe(2);
  });

  it("procedural radii derive from logical radius", () => {
    expect(computeShockwaveRadius(5)).toBeLessThanOrEqual(6);
    expect(computeGlowDiscRadius(5)).toBeLessThanOrEqual(5.5);
    expect(computeRotatingRingRadius(5)).toBe(5);
  });

  it("particle spread and size derive from radius with caps", () => {
    expect(computeParticleSpreadRadius(5, "impact")).toBeLessThanOrEqual(6);
    expect(computeParticleSizeFromRadius(5, "trail")).toBeLessThanOrEqual(0.22);
  });

  it("trail texture scale uses trail length and width", () => {
    const scale = computeTrailTextureScale(3, 0.5, 600, 200);
    expect(longest(scale)).toBe(3);
  });

  it("light intensity scales with radius and has an upper bound", () => {
    expect(computeLightIntensityFromRadius(100, "impact")).toBeLessThanOrEqual(4);
    expect(computeLightIntensityFromRadius(3, "projectile")).toBeGreaterThan(0.4);
  });
});
