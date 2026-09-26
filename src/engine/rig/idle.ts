import { noise, randRange } from "../lib/seed";

export type IdleOffsets = {
  torso: number;
  head: number;
  torsoScale: number;
};

/**
 * Subtle always-on life: breathing (~0.25 Hz), ±1° sway, small head drift. This style is
 * mostly still between gestures, so amplitudes stay small.
 */
export const idleOffsets = (seed: string, frame: number, fps: number, amount = 1): IdleOffsets => {
  const t = frame / fps;
  const breath = Math.sin(2 * Math.PI * 0.25 * t + randRange(seed, "breath", 0, 6.28));
  return {
    torso: noise(seed, "sway", t * 0.35) * 1 * amount,
    head: noise(seed, "head", t * 0.3) * 1.5 * amount,
    torsoScale: 1 + breath * 0.008 * amount,
  };
};

const BLINK_SHAPE = [0.55, 1, 1, 0.45];

/** Upper-lid closure in [0,1] from a seeded blink schedule (every 2.5–5 s, 4 frames). */
export const blinkAmount = (seed: string, frame: number, fps: number): number => {
  let at = Math.round(randRange(seed, "blink-0", 0.6, 2.5) * fps);
  for (let i = 1; at <= frame; i++) {
    const d = frame - at;
    if (d < BLINK_SHAPE.length) return BLINK_SHAPE[d]!;
    at += Math.round(randRange(seed, `blink-${i}`, 2.5, 5) * fps);
  }
  return 0;
};
