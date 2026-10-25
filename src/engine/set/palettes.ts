import { darken, fromOklch, lighten, mix } from "../lib/color";

export type Palette = {
  wallA: string;
  wallB: string;
  floor: string;
  accent: string;
  shade: string;
  sky: string;
  detail: string;
  /**
   * A light rim drawn around every cast member (an SVG filter on the cast layer). Set only on
   * truly dark grounds, where the near-black outlines would vanish.
   */
  rim?: string;
  /** Sun, moon and stars (story kit); missing means a light accent. */
  glow?: string;
  /** The place's light: a soft-light grade on the cast so it sits in the scene (story kit). */
  light?: string;
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
  /** Sunny kitchen yellows. */
  butter: {
    wallA: "#f7ecc9",
    wallB: "#efdfae",
    floor: "#d7c08e",
    accent: "#9fcbd9",
    shade: "#eadaa8",
    sky: "#d3eaf6",
    detail: "#c4a468",
  },
  /** Night outdoors: blue-grey sky, still light enough for the character strokes. */
  night: {
    wallA: "#cfd3e8",
    wallB: "#b9bfdc",
    floor: "#a8b0cc",
    accent: "#f3d99a",
    shade: "#bcc2dc",
    sky: "#9fa9d0",
    detail: "#7f89b3",
  },
  /** Beach: sand floor, sea-blue detail. */
  coast: {
    wallA: "#e4f1f4",
    wallB: "#cfe6ec",
    floor: "#f0dcb0",
    accent: "#f4a99a",
    shade: "#e6d3a8",
    sky: "#c8e8f6",
    detail: "#7fbccc",
  },
  /** Comedy-club stage: soft red curtain, warm light. */
  stage: {
    wallA: "#e7bfc3",
    wallB: "#d9a9af",
    floor: "#caa98a",
    accent: "#f2d08f",
    shade: "#d7b3b6",
    sky: "#d6e6f3",
    detail: "#a9828a",
  },
  /**
   * Science grounds. Mid-tone on purpose: dark outlines keep ≥ 3:1 against every tone, and
   * figures switch to chalk (light ink) over them.
   */
  "deep-space": {
    wallA: "#5d6aa8",
    wallB: "#5864a3",
    floor: "#6470aa",
    accent: "#f3d99a",
    shade: "#5f6ba8",
    sky: "#5d6aa8",
    detail: "#8e9ad2",
  },
  /**
   * Nebula night: deep indigo bands (wallA → wallB), magenta / teal / violet glows (sky, detail,
   * shade), a lavender moon floor. Dark, so the cast gets a light rim.
   */
  nebula: {
    wallA: "#141638",
    wallB: "#2e2a6a",
    floor: "#6b5aa8",
    accent: "#f6c445",
    shade: "#7b5cff",
    sky: "#c0479a",
    detail: "#2bb3b1",
    rim: "#cfd6ff",
  },
  /** The neutral void: slate teal, a faint grid floor. */
  void: {
    wallA: "#4f7a8a",
    wallB: "#4b7484",
    floor: "#55808f",
    accent: "#f2cf8a",
    shade: "#527c8c",
    sky: "#4f7a8a",
    detail: "#86aeba",
  },
  blueprint: {
    wallA: "#3f6f9e",
    wallB: "#3d6c9a",
    floor: "#4878a8",
    accent: "#f6d36b",
    shade: "#4373a3",
    sky: "#3f6f9e",
    detail: "#a9c9ea",
  },
  /** A bright, clean lab. */
  "lab-white": {
    wallA: "#e6eef0",
    wallB: "#d8e4e8",
    floor: "#b9c9cf",
    accent: "#f4b183",
    shade: "#cfdde2",
    sky: "#d6ecf5",
    detail: "#7fa6b3",
  },
};

/** A story palette colour by OKLCH lightness, chroma and hue. */
const ok = (l: number, c: number, h: number): string => fromOklch({ l, c, h });

/**
 * Story kit palettes (the shape tier): "storybook bright", chosen over a calm pastel
 * and a retro print (`PaletteLab` keeps those two for comparison). Built by rule so each place is
 * in harmony with itself and leaves room for the cast:
 * - clean, mid-light fills (chroma 0.06–0.13, accents to 0.17), like a TV cartoon, not washed out;
 * - one dominant hue family per place (60%), a supporting one (30%), and a split-complementary
 *   accent (10%) for flowers, doors and roofs;
 * - layers recede by getting lighter and closer to the sky (far hills → near hills → ground);
 * - the ground sits at mid lightness so both pale (rabbit, dog) and dark (penguin) characters read.
 * `light` grades the cast with the place's light (soft-light), so characters belong to the scene.
 * Roles: see `storyOutdoor.tsx`.
 */
Object.assign(PALETTES, {
  "story-day": { sky: ok(0.86, 0.075, 230), wallA: ok(0.84, 0.09, 140), wallB: ok(0.77, 0.115, 140), floor: ok(0.72, 0.12, 135), detail: ok(0.62, 0.13, 145), shade: ok(0.48, 0.09, 160), accent: ok(0.66, 0.16, 30), glow: ok(0.92, 0.13, 95) },
  "story-sunset": { sky: ok(0.82, 0.1, 55), wallA: ok(0.74, 0.08, 20), wallB: ok(0.64, 0.08, 350), floor: ok(0.7, 0.09, 110), detail: ok(0.56, 0.1, 125), shade: ok(0.42, 0.07, 40), accent: ok(0.82, 0.14, 85), glow: ok(0.94, 0.12, 90), light: ok(0.8, 0.14, 55) },
  "story-night": { sky: ok(0.3, 0.09, 275), wallA: ok(0.38, 0.08, 268), wallB: ok(0.34, 0.07, 255), floor: ok(0.4, 0.07, 215), detail: ok(0.36, 0.07, 200), shade: ok(0.27, 0.05, 205), accent: ok(0.88, 0.13, 95), glow: ok(0.94, 0.08, 95), light: ok(0.55, 0.12, 265) },
  "story-autumn": { sky: ok(0.87, 0.06, 230), wallA: ok(0.84, 0.09, 85), wallB: ok(0.76, 0.11, 72), floor: ok(0.72, 0.1, 90), detail: ok(0.68, 0.15, 55), shade: ok(0.48, 0.1, 38), accent: ok(0.6, 0.17, 30), glow: ok(0.93, 0.12, 92), light: ok(0.85, 0.1, 75) },
  "story-beach": { sky: ok(0.88, 0.07, 225), wallA: ok(0.74, 0.1, 220), wallB: ok(0.64, 0.11, 232), floor: ok(0.86, 0.08, 85), detail: ok(0.62, 0.12, 145), shade: ok(0.72, 0.08, 72), accent: ok(0.66, 0.16, 30), glow: ok(0.93, 0.12, 92) },
  "story-beach-sunset": { sky: ok(0.82, 0.1, 55), wallA: ok(0.66, 0.09, 330), wallB: ok(0.58, 0.09, 310), floor: ok(0.82, 0.08, 75), detail: ok(0.56, 0.1, 125), shade: ok(0.62, 0.07, 60), accent: ok(0.82, 0.14, 85), glow: ok(0.94, 0.12, 90), light: ok(0.8, 0.14, 55) },
  "story-indoor": { wallA: ok(0.9, 0.06, 85), wallB: ok(0.84, 0.08, 75), floor: ok(0.64, 0.09, 55), accent: ok(0.6, 0.15, 30), shade: ok(0.52, 0.08, 45), sky: ok(0.88, 0.06, 225), detail: ok(0.62, 0.12, 145), glow: ok(0.93, 0.12, 92), light: ok(0.9, 0.08, 75) },
  "story-bedroom": { wallA: ok(0.84, 0.06, 290), wallB: ok(0.78, 0.075, 290), floor: ok(0.64, 0.06, 60), accent: ok(0.72, 0.12, 350), shade: ok(0.54, 0.08, 295), sky: ok(0.88, 0.06, 225), detail: ok(0.62, 0.12, 145), glow: ok(0.93, 0.06, 95) },
} satisfies Record<string, Palette>);

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
