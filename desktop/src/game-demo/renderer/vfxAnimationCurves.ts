export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function linear(value: number): number {
  return clamp01(value);
}

export function fadeOut(progress: number): number {
  return 1 - clamp01(progress);
}

export function fadeInOut(progress: number): number {
  const t = clamp01(progress);
  if (t < 0.2) {
    return t / 0.2;
  }
  if (t > 0.8) {
    return (1 - t) / 0.2;
  }
  return 1;
}

export function pulse(time: number, speed = 1): number {
  return 0.5 + 0.5 * Math.sin(time * speed * Math.PI * 2);
}

export function expandAndFade(progress: number): { scale: number; opacity: number } {
  const t = clamp01(progress);
  return {
    scale: 0.35 + t * 1.2,
    opacity: fadeOut(t),
  };
}
