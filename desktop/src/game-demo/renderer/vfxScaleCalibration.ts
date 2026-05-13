import type { RuntimeVfxScale } from "./vfxSpawner";

const SAFE_RADIUS = 1;
const SAFE_TEXTURE_SIZE = 1;
const MAX_LIGHT_INTENSITY = 4;

export function computeAspectPreservedScale(
  textureWidth: number,
  textureHeight: number,
  targetLongestSide: number,
): RuntimeVfxScale {
  const width = safeSize(textureWidth);
  const height = safeSize(textureHeight);
  const longestSide = Math.max(width, height, SAFE_TEXTURE_SIZE);
  const target = safeLength(targetLongestSide);
  return {
    x: target * (width / longestSide),
    y: target * (height / longestSide),
    z: target,
  };
}

export function computeGroundDecalTextureScale(
  radius: number,
  textureWidth: number,
  textureHeight: number,
): RuntimeVfxScale {
  return computeAspectPreservedScale(textureWidth, textureHeight, safeRadius(radius) * 2);
}

export function computeProjectileTextureScale(
  radius: number,
  textureWidth: number,
  textureHeight: number,
  multiplier = 1,
): RuntimeVfxScale {
  return computeAspectPreservedScale(
    textureWidth,
    textureHeight,
    safeRadius(radius) * 2 * safeMultiplier(multiplier),
  );
}

export function computeImpactTextureScale(
  radius: number,
  textureWidth: number,
  textureHeight: number,
  multiplier = 1,
): RuntimeVfxScale {
  return computeAspectPreservedScale(
    textureWidth,
    textureHeight,
    safeRadius(radius) * 2 * safeMultiplier(multiplier),
  );
}

export function computeAuraTextureScale(
  radius: number,
  textureWidth: number,
  textureHeight: number,
  multiplier = 1,
): RuntimeVfxScale {
  return computeAspectPreservedScale(
    textureWidth,
    textureHeight,
    safeRadius(radius) * 2 * safeMultiplier(multiplier),
  );
}

export function computeTrailTextureScale(
  length: number,
  width: number,
  textureWidth: number,
  textureHeight: number,
): RuntimeVfxScale {
  const targetLength = safeLength(length);
  const targetWidth = safeLength(width);
  const aspectScale = computeAspectPreservedScale(textureWidth, textureHeight, targetLength);
  if (typeof aspectScale === "number") {
    return aspectScale;
  }
  return {
    x: Math.max(targetWidth, aspectScale.x),
    y: Math.min(targetLength, Math.max(0.01, aspectScale.y)),
    z: Math.max(targetWidth, aspectScale.z ?? targetWidth),
  };
}

export function computeGroundDecalProceduralScale(radius: number): number {
  return safeRadius(radius);
}

export function computeProjectileProceduralScale(radius: number): number {
  return safeRadius(radius);
}

export function computeImpactProceduralScale(radius: number, multiplier = 1): number {
  return safeRadius(radius) * safeMultiplier(multiplier);
}

export function computeAuraProceduralScale(radius: number): number {
  return safeRadius(radius);
}

export function computeTrailProceduralScale(length: number, width: number): {
  length: number;
  width: number;
} {
  return {
    length: safeLength(length),
    width: safeLength(width),
  };
}

export function computeParticleSizeFromRadius(
  radius: number,
  kind: "projectile" | "impact" | "aura" | "trail",
): number {
  const base = safeRadius(radius);
  const multiplier = kind === "impact" ? 0.08 : kind === "trail" ? 0.06 : 0.05;
  return clamp(base * multiplier, 0.04, 0.22);
}

export function computeParticleSpreadRadius(
  radius: number,
  kind: "impact" | "trail" | "aura",
): number {
  const base = safeRadius(radius);
  if (kind === "impact") {
    return Math.min(base * 1.2, base + base * 0.2);
  }
  if (kind === "aura") {
    return base * 0.85;
  }
  return base * 0.35;
}

export function computeShockwaveRadius(radius: number, multiplier = 1.1): number {
  return safeRadius(radius) * Math.min(safeMultiplier(multiplier), 1.2);
}

export function computeGlowDiscRadius(radius: number, multiplier = 1.05): number {
  return safeRadius(radius) * Math.min(safeMultiplier(multiplier), 1.1);
}

export function computeRotatingRingRadius(radius: number, multiplier = 1): number {
  return safeRadius(radius) * safeMultiplier(multiplier);
}

export function computeLightIntensityFromRadius(
  radius: number,
  kind: "projectile" | "impact" | "aura",
): number {
  const base = kind === "impact" ? 1.2 : kind === "aura" ? 0.7 : 0.5;
  return clamp(base + safeRadius(radius) * 0.25, 0.4, MAX_LIGHT_INTENSITY);
}

function safeRadius(radius: number): number {
  return Number.isFinite(radius) && radius > 0 ? radius : SAFE_RADIUS;
}

function safeLength(length: number): number {
  return Number.isFinite(length) && length > 0 ? length : SAFE_RADIUS;
}

function safeSize(size: number): number {
  return Number.isFinite(size) && size > 0 ? size : SAFE_TEXTURE_SIZE;
}

function safeMultiplier(multiplier: number): number {
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
