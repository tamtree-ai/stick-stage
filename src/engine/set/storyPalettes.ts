import { fromOklch } from "../lib/color";
import type { Palette } from "./palettes";

/**
 * Story-kit palettes (the shape tier), in three looks a skit picks with `look` (a place may
 * override it). Each place is one palette id per look: `story-day` is the bright look,
 * `story-day@retro` and `story-day@pastel` the others (`storyPaletteId`). Colours are OKLCH
 * (lightness, chroma, hue), so the rules below are numbers you can check.
 *
 * Rules every look keeps:
 * - one dominant hue family per place (≈60%), a supporting one (≈30%), and an accent (≈10%) for
 *   flowers, doors and roofs that sits across the wheel from the dominant family;
 * - layers recede by getting lighter and closer to the sky (far hills → near hills → ground);
 * - the ground sits at mid lightness, so pale (rabbit, dog) and dark (penguin) characters both read;
 * - `light` grades the cast with the place's light (soft-light), so characters belong to the scene.
 */

/** OKLCH → hex. */
const ok = (l: number, c: number, h: number): string => fromOklch({ l, c, h });

export const STORY_LOOKS = ["bright", "retro", "pastel"] as const;
export type StoryLook = (typeof STORY_LOOKS)[number];

/** The palette id for a place's base palette in a look. */
export const storyPaletteId = (base: string, look: StoryLook = "bright"): string => (look === "bright" ? base : `${base}@${look}`);

/**
 * Bright: a storybook TV look. Clean, mid-light fills (chroma 0.06–0.13, accents to 0.17), one
 * family per place, a split-complementary accent.
 */
const BRIGHT: Record<string, Palette> = {
  "story-day": { sky: ok(0.86, 0.075, 230), wallA: ok(0.84, 0.09, 140), wallB: ok(0.77, 0.115, 140), floor: ok(0.72, 0.12, 135), detail: ok(0.62, 0.13, 145), shade: ok(0.48, 0.09, 160), accent: ok(0.66, 0.16, 30), glow: ok(0.92, 0.13, 95) },
  "story-sunset": { sky: ok(0.82, 0.1, 55), wallA: ok(0.74, 0.08, 20), wallB: ok(0.64, 0.08, 350), floor: ok(0.7, 0.09, 110), detail: ok(0.56, 0.1, 125), shade: ok(0.42, 0.07, 40), accent: ok(0.82, 0.14, 85), glow: ok(0.94, 0.12, 90), light: ok(0.8, 0.14, 55) },
  "story-night": { sky: ok(0.3, 0.09, 275), wallA: ok(0.38, 0.08, 268), wallB: ok(0.34, 0.07, 255), floor: ok(0.4, 0.07, 215), detail: ok(0.36, 0.07, 200), shade: ok(0.27, 0.05, 205), accent: ok(0.88, 0.13, 95), glow: ok(0.94, 0.08, 95), light: ok(0.55, 0.12, 265) },
  "story-autumn": { sky: ok(0.87, 0.06, 230), wallA: ok(0.84, 0.09, 85), wallB: ok(0.76, 0.11, 72), floor: ok(0.72, 0.1, 90), detail: ok(0.68, 0.15, 55), shade: ok(0.48, 0.1, 38), accent: ok(0.6, 0.17, 30), glow: ok(0.93, 0.12, 92), light: ok(0.85, 0.1, 75) },
  "story-beach": { sky: ok(0.88, 0.07, 225), wallA: ok(0.74, 0.1, 220), wallB: ok(0.64, 0.11, 232), floor: ok(0.86, 0.08, 85), detail: ok(0.62, 0.12, 145), shade: ok(0.72, 0.08, 72), accent: ok(0.66, 0.16, 30), glow: ok(0.93, 0.12, 92) },
  "story-beach-sunset": { sky: ok(0.82, 0.1, 55), wallA: ok(0.66, 0.09, 330), wallB: ok(0.58, 0.09, 310), floor: ok(0.82, 0.08, 75), detail: ok(0.56, 0.1, 125), shade: ok(0.62, 0.07, 60), accent: ok(0.82, 0.14, 85), glow: ok(0.94, 0.12, 90), light: ok(0.8, 0.14, 55) },
  "story-indoor": { wallA: ok(0.9, 0.06, 85), wallB: ok(0.84, 0.08, 75), floor: ok(0.64, 0.09, 55), accent: ok(0.6, 0.15, 30), shade: ok(0.52, 0.08, 45), sky: ok(0.88, 0.06, 225), detail: ok(0.62, 0.12, 145), glow: ok(0.93, 0.12, 92), light: ok(0.9, 0.08, 75) },
  "story-bedroom": { wallA: ok(0.84, 0.06, 290), wallB: ok(0.78, 0.075, 290), floor: ok(0.64, 0.06, 60), accent: ok(0.72, 0.12, 350), shade: ok(0.54, 0.08, 295), sky: ok(0.88, 0.06, 225), detail: ok(0.62, 0.12, 145), glow: ok(0.93, 0.06, 95) },
};

/**
 * Retro: a mid-century screen print. A limited set of inks shared by every place, the way a print
 * run has a fixed set of plates, so the whole show reads as one hand:
 * - warm paper for skies and walls instead of sky blue;
 * - two warm families (mustard → ochre → burnt orange → terracotta) against one cool family (teal),
 *   a complementary pair that keeps every place lively without a third hue;
 * - a clear value ladder: paper 0.94, light inks ≈0.82, mid inks ≈0.66–0.74, deep ink ≈0.36–0.5
 *   used only for small dark parts (trunks, shade);
 * - the ground, the biggest area in frame, is the calmest ink (`field`);
 * - water stays teal even at sunset: teal sea under an apricot sky is the complementary pair;
 * - no "mud zone": yellow-greens at mid lightness and low chroma (olive, khaki) read dirty, so
 *   grounds are clean ochre or teal and greens are teal-leaning.
 */
const INK = {
  paper: ok(0.94, 0.035, 88),
  apricot: ok(0.88, 0.075, 68),
  mustard: ok(0.82, 0.13, 85),
  ochre: ok(0.75, 0.12, 76),
  /** The ground: the biggest area in frame, so the calmest warm ink (lighter, less chroma than ochre). */
  field: ok(0.79, 0.085, 80),
  orange: ok(0.67, 0.15, 46),
  terracotta: ok(0.6, 0.12, 36),
  tealLight: ok(0.82, 0.06, 192),
  teal: ok(0.68, 0.08, 196),
  tealDeep: ok(0.54, 0.08, 200),
  deep: ok(0.38, 0.06, 228),
  wood: ok(0.58, 0.08, 55),
} as const;

const RETRO: Record<string, Palette> = {
  "story-day": { sky: INK.paper, wallA: INK.tealLight, wallB: INK.teal, floor: INK.field, detail: INK.tealDeep, shade: ok(0.44, 0.06, 205), accent: INK.orange, glow: INK.mustard },
  "story-sunset": { sky: INK.apricot, wallA: ok(0.76, 0.08, 40), wallB: INK.terracotta, floor: INK.mustard, detail: INK.tealDeep, shade: ok(0.42, 0.07, 38), accent: INK.teal, glow: INK.paper, light: ok(0.85, 0.1, 65) },
  "story-night": { sky: ok(0.3, 0.06, 235), wallA: ok(0.38, 0.06, 215), wallB: ok(0.34, 0.06, 205), floor: ok(0.42, 0.06, 192), detail: ok(0.33, 0.05, 200), shade: ok(0.26, 0.04, 210), accent: INK.mustard, glow: ok(0.92, 0.07, 88), light: ok(0.6, 0.07, 230) },
  "story-autumn": { sky: INK.paper, wallA: ok(0.86, 0.09, 85), wallB: INK.ochre, floor: ok(0.7, 0.11, 64), detail: INK.orange, shade: ok(0.46, 0.09, 38), accent: INK.teal, glow: INK.mustard, light: ok(0.88, 0.07, 75) },
  "story-beach": { sky: INK.paper, wallA: ok(0.76, 0.07, 200), wallB: ok(0.64, 0.08, 205), floor: ok(0.86, 0.07, 82), detail: INK.tealDeep, shade: ok(0.7, 0.08, 72), accent: INK.orange, glow: INK.mustard },
  "story-beach-sunset": { sky: INK.apricot, wallA: ok(0.66, 0.07, 205), wallB: ok(0.56, 0.07, 215), floor: ok(0.82, 0.09, 80), detail: INK.tealDeep, shade: ok(0.62, 0.08, 55), accent: INK.teal, glow: INK.paper, light: ok(0.85, 0.1, 65) },
  "story-indoor": { wallA: INK.paper, wallB: INK.tealLight, floor: INK.wood, accent: INK.orange, shade: INK.tealDeep, sky: ok(0.88, 0.04, 210), detail: INK.teal, glow: INK.mustard, light: ok(0.9, 0.06, 80) },
  "story-bedroom": { wallA: ok(0.84, 0.06, 195), wallB: ok(0.78, 0.07, 195), floor: INK.wood, accent: INK.mustard, shade: ok(0.5, 0.07, 200), sky: ok(0.88, 0.04, 210), detail: INK.teal, glow: ok(0.92, 0.07, 88) },
};

/** Pastel: soft and quiet, low chroma everywhere (the first look pass); calm stories, bedtime. */
const PASTEL: Record<string, Palette> = {
  "story-day": { sky: ok(0.91, 0.035, 225), wallA: ok(0.87, 0.04, 145), wallB: ok(0.81, 0.062, 138), floor: ok(0.76, 0.07, 130), detail: ok(0.66, 0.085, 142), shade: ok(0.52, 0.05, 165), accent: ok(0.7, 0.1, 35), glow: ok(0.93, 0.09, 92) },
  "story-sunset": { sky: ok(0.87, 0.06, 62), wallA: ok(0.8, 0.045, 22), wallB: ok(0.71, 0.05, 355), floor: ok(0.75, 0.05, 108), detail: ok(0.62, 0.06, 122), shade: ok(0.48, 0.045, 40), accent: ok(0.8, 0.1, 80), glow: ok(0.94, 0.09, 88), light: ok(0.8, 0.12, 55) },
  "story-night": { sky: ok(0.33, 0.065, 272), wallA: ok(0.41, 0.055, 265), wallB: ok(0.37, 0.05, 255), floor: ok(0.42, 0.045, 215), detail: ok(0.36, 0.045, 200), shade: ok(0.28, 0.035, 205), accent: ok(0.88, 0.1, 95), glow: ok(0.93, 0.06, 95), light: ok(0.55, 0.1, 265) },
  "story-autumn": { sky: ok(0.9, 0.035, 230), wallA: ok(0.87, 0.05, 88), wallB: ok(0.8, 0.06, 78), floor: ok(0.76, 0.06, 92), detail: ok(0.71, 0.1, 58), shade: ok(0.5, 0.07, 40), accent: ok(0.63, 0.12, 30), glow: ok(0.93, 0.09, 90), light: ok(0.85, 0.08, 75) },
  "story-beach": { sky: ok(0.91, 0.035, 222), wallA: ok(0.8, 0.06, 218), wallB: ok(0.72, 0.07, 228), floor: ok(0.85, 0.055, 82), detail: ok(0.66, 0.07, 142), shade: ok(0.72, 0.05, 72), accent: ok(0.7, 0.1, 35), glow: ok(0.93, 0.09, 92) },
  "story-beach-sunset": { sky: ok(0.87, 0.06, 62), wallA: ok(0.73, 0.05, 330), wallB: ok(0.66, 0.05, 312), floor: ok(0.83, 0.055, 75), detail: ok(0.62, 0.06, 122), shade: ok(0.66, 0.05, 60), accent: ok(0.8, 0.1, 80), glow: ok(0.94, 0.09, 88), light: ok(0.8, 0.12, 55) },
  "story-indoor": { wallA: ok(0.93, 0.03, 78), wallB: ok(0.88, 0.04, 72), floor: ok(0.7, 0.06, 60), accent: ok(0.62, 0.1, 30), shade: ok(0.55, 0.06, 50), sky: ok(0.9, 0.035, 225), detail: ok(0.66, 0.07, 142), glow: ok(0.93, 0.09, 92), light: ok(0.9, 0.06, 75) },
  "story-bedroom": { wallA: ok(0.88, 0.035, 292), wallB: ok(0.83, 0.04, 292), floor: ok(0.7, 0.04, 62), accent: ok(0.75, 0.08, 350), shade: ok(0.58, 0.06, 295), sky: ok(0.9, 0.035, 225), detail: ok(0.66, 0.07, 142), glow: ok(0.93, 0.05, 95) },
};

const suffixed = (look: StoryLook, pals: Record<string, Palette>) => Object.fromEntries(Object.entries(pals).map(([id, p]) => [storyPaletteId(id, look), p]));

export const STORY_PALETTES: Record<string, Palette> = { ...BRIGHT, ...suffixed("retro", RETRO), ...suffixed("pastel", PASTEL) };
