// `remotion/no-react` and plain `simplex-noise` (not `remotion` / `@remotion/noise`) keep the
// core entry React-free, so it loads in a React Server Component bundle. `noise` is
// @remotion/noise's noise2D verbatim: simplex seeded by remotion's `random`, same output.
import { random } from "remotion/no-react";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

/** Deterministic float in [0,1) for a seed and a sub-key. */
export const rand = (seed: string | number, key: string | number = 0): number =>
  random(`${seed}:${key}`);

export const randRange = (seed: string | number, key: string | number, lo: number, hi: number) =>
  lo + (hi - lo) * rand(seed, key);

const noiseCache = new Map<string, NoiseFunction2D>();

/** Smooth noise in [-1,1] over time `t` (seconds) for a named channel. */
export const noise = (seed: string | number, channel: string, t: number): number => {
  const key = `${seed}:${channel}`;
  let fn = noiseCache.get(key);
  if (!fn) {
    if (noiseCache.size > 256) noiseCache.delete(noiseCache.keys().next().value!);
    fn = createNoise2D(() => random(key));
    noiseCache.set(key, fn);
  }
  return fn(t, 0);
};
