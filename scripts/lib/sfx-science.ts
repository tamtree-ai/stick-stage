/** Science-channel stings (phase 1), synthesized like the rest of the library. */
import { env, filter, mix, noise, osc, perc, saturate, type Sig } from "./synth";

type Sound = { id: string; gain: number; tags: string[]; make: () => Sig };

export const SCIENCE_SOUNDS: Sound[] = [
  {
    // The "aha": a bright two-note bell, a fifth apart.
    id: "ding-idea",
    gain: 0.6,
    tags: ["idea", "realise", "science"],
    make: () => {
      const bell = (f: number, seed: number) => env(mix(1.2, [osc(1.2, () => f)], [osc(1.2, () => f * 2.76), 0.25], [osc(1.2, () => f * 5.4), 0.08]), perc(0.002, 3.2 + seed));
      return mix(1.3, [bell(1046.5, 0), 0.8], [bell(1568, 0.5), 0.7, 0.11]);
    },
  },
  {
    id: "zap",
    gain: 0.55,
    tags: ["spark", "electric", "science"],
    make: () => {
      const T = 0.35;
      const crackle = env(filter(noise(T, 21), "hp", () => 2500, 0.9), (t) => (Math.sin(t * 190) > 0.2 ? 1 : 0.25) * Math.exp(-t * 9));
      const buzz = env(osc(T, (t) => 120 + 60 * Math.sin(t * 80), "saw"), perc(0.002, 12));
      return saturate(mix(T, [crackle, 0.8], [buzz, 0.5]), 2.2);
    },
  },
  {
    id: "hum",
    gain: 0.4,
    tags: ["electric", "machine", "science"],
    make: () => {
      const T = 1.5;
      const tone = mix(T, [osc(T, () => 60, "saw"), 0.5], [osc(T, () => 120), 0.4], [osc(T, () => 180), 0.15]);
      return env(filter(tone, "lp", () => 700), (t) => Math.min(1, t / 0.15) * Math.min(1, (T - t) / 0.3));
    },
  },
  {
    // The scale zoom: a rising, widening rush.
    id: "whoosh-warp",
    gain: 0.65,
    tags: ["zoom", "transition", "science"],
    make: () => {
      const T = 1.1;
      const n = filter(noise(T, 22), "bp", (t) => 200 * Math.pow(25, t / T), 1.2);
      const sweep = osc(T, (t) => 90 * Math.pow(8, t / T), "tri");
      return env(mix(T, [n], [sweep, 0.25]), (t) => Math.sin((Math.PI * t) / T) ** 1.3);
    },
  },
  {
    id: "chalk-tap",
    gain: 0.6,
    tags: ["board", "write", "science"],
    make: () => {
      const tap = (seed: number) => env(filter(noise(0.06, seed), "bp", () => 3200, 2.5), perc(0.0005, 90));
      return mix(0.3, [tap(23)], [tap(24), 0.7, 0.13]);
    },
  },
  {
    id: "blip",
    gain: 0.55,
    tags: ["appear", "particle", "science"],
    make: () => env(osc(0.12, (t) => 880 + 1800 * (t / 0.12), "square"), perc(0.002, 30)),
  },
  {
    // Electron meets positron: a white flash and a fading ring.
    id: "pop-annihilate",
    gain: 0.65,
    tags: ["flash", "particle", "science"],
    make: () => {
      const T = 0.9;
      const flash = env(noise(T, 25), perc(0.001, 25));
      const ring = env(mix(T, [osc(T, () => 511)], [osc(T, () => 1022), 0.3]), perc(0.003, 5));
      return mix(T, [flash, 0.7], [ring, 0.6, 0.02]);
    },
  },
];
