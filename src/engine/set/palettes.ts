import { darken, lighten, mix } from "../lib/color";

export type Palette = {
  wallA: string;
  wallB: string;
  floor: string;
  accent: string;
  shade: string;
  sky: string;
  detail: string;
};

/**
 * Set palettes are soft and low-contrast so the near-black character strokes always win.
 * Set parts use only these tokens (or darken/lighten of them), never raw hex.
 */
export const PALETTES: Record<string, Palette> = {
  lilac: {
    wallA: "#ddd4f0",
    wallB: "#cfc3e9",
    floor: "#b3a2d3",
    accent: "#f3bccb",
    shade: "#c2b3e0",
    sky: "#c4e4f4",
    detail: "#9a88c2",
  },
  mint: {
    wallA: "#d5eee3",
    wallB: "#c4e5d6",
    floor: "#9cc8b3",
    accent: "#f6c894",
    shade: "#b5dac8",
    sky: "#cfe9f6",
    detail: "#76a893",
  },
  peach: {
    wallA: "#f8e0d0",
    wallB: "#f1cfbb",
    floor: "#dcab93",
    accent: "#9cc8dd",
    shade: "#ecc4ae",
    sky: "#d2e9f5",
    detail: "#bf8b74",
  },
  /** Outdoor: green grass and foliage, blue sky. */
  meadow: {
    wallA: "#dcecd9",
    wallB: "#c8e2c3",
    floor: "#afd6a2",
    accent: "#f4c98a",
    shade: "#bcdcb2",
    sky: "#cde6f5",
    detail: "#8fbf84",
  },
  /** Warm evening outdoors. */
  dusk: {
    wallA: "#eed9e4",
    wallB: "#e2c6d6",
    floor: "#cfb2c4",
    accent: "#f6c49a",
    shade: "#dcbccd",
    sky: "#f7d9d0",
    detail: "#a98fb4",
  },
  /** Warm outdoors: olive grass, orange foliage. */
  autumn: {
    wallA: "#f1e4d2",
    wallB: "#e6d3b8",
    floor: "#c8cf9f",
    accent: "#eaa982",
    shade: "#dccbaa",
    sky: "#f5e0cb",
    detail: "#e2ab7a",
  },
  /** Cool street greys. */
  city: {
    wallA: "#dde2ea",
    wallB: "#cbd2de",
    floor: "#bfc6d2",
    accent: "#f2bf94",
    shade: "#c3cad7",
    sky: "#d2e6f3",
    detail: "#95a1b6",
  },
};

/** Tones every part may use, derived from the seven tokens (still no raw hex in parts). */
export const derived = (p: Palette) => ({
  wood: darken(mix(p.accent, p.detail, 0.45), 0.1),
  metal: darken(mix(p.detail, p.wallB, 0.45), 0.08),
  glass: lighten(p.sky, 0.3),
  paper: lighten(p.wallA, 0.72),
  foliage: p.detail,
});

export const getPalette = (id: string): Palette => {
  const p = PALETTES[id];
  if (!p) throw new Error(`Unknown palette "${id}". Known: ${Object.keys(PALETTES).join(", ")}`);
  return p;
};
