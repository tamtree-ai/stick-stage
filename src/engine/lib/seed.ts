import { random } from "remotion";
import { noise2D } from "@remotion/noise";

/** Deterministic float in [0,1) for a seed and a sub-key. */
export const rand = (seed: string | number, key: string | number = 0): number =>
  random(`${seed}:${key}`);

export const randRange = (seed: string | number, key: string | number, lo: number, hi: number) =>
  lo + (hi - lo) * rand(seed, key);

/** Smooth noise in [-1,1] over time `t` (seconds) for a named channel. */
export const noise = (seed: string | number, channel: string, t: number): number =>
  noise2D(`${seed}:${channel}`, t, 0);
