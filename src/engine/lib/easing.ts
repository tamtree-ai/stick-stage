import { clamp } from "./math";

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;

/**
 * Ease-out with a small overshoot past 1 before settling. `overshoot` ≈ 1.7 gives ~10%.
 * This is the "snappy pose-to-pose" curve.
 */
export const easeOutBack = (t: number, overshoot = 1.2): number => {
  const x = clamp(t, 0, 1) - 1;
  return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
};

/** 0 → peak → 0 over [0,1]; used for anticipation dips and squash pulses. */
export const bump = (t: number): number => (t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t));
