import { z } from "zod";
import { lerp } from "../lib/math";

/**
 * Parametric mouth, in units of head radius R. Every preset (and later every Rhubarb
 * viseme) is a point in this space, so expression changes blend instead of popping.
 */
export const MouthParamsSchema = z.object({
  /** Corner-to-corner width (×R). */
  w: z.number().min(0.05).max(1.2),
  /** Vertical opening (×R). 0 = closed line. */
  open: z.number().min(0).max(1),
  /** Corner lift: +1 smile, −1 frown. */
  curve: z.number().min(-1.5).max(1.5),
  /** Smirk: + raises the front (right) corner, lowers the back corner. */
  skew: z.number().min(-1).max(1),
  /** 0 = pointed lens corners, 1 = round/boxy opening. */
  round: z.number().min(0).max(1),
  /** How far the top edge rises when open (0..1 of `open`). */
  top: z.number().min(0).max(1),
  teeth: z.boolean(),
  tongue: z.boolean(),
});
export type MouthParams = z.infer<typeof MouthParamsSchema>;

const base: MouthParams = {
  w: 0.36,
  open: 0,
  curve: 0,
  skew: 0,
  round: 0.4,
  top: 0.3,
  teeth: false,
  tongue: false,
};

const m = (p: Partial<MouthParams>): MouthParams => ({ ...base, ...p });

export const MOUTH_PRESETS: Record<string, MouthParams> = {
  neutral: m({ w: 0.26, curve: 0.15 }),
  flat: m({ w: 0.3, curve: 0 }),
  smile: m({ w: 0.42, curve: 0.9 }),
  grin: m({ w: 0.6, open: 0.36, curve: 1, round: 0.75, top: 0.08, teeth: true, tongue: true }),
  smirk: m({ w: 0.34, curve: 0.3, skew: 0.8 }),
  frown: m({ w: 0.34, curve: -0.8 }),
  pout: m({ w: 0.2, curve: -0.5 }),
  o: m({ w: 0.2, open: 0.3, curve: 0, round: 1, top: 0.2, tongue: true }),
  gasp: m({ w: 0.3, open: 0.5, curve: -0.1, round: 1, top: 0.12, tongue: true }),
  wail: m({ w: 0.55, open: 0.4, curve: -1, round: 0.7, top: 0.4, teeth: true, tongue: true }),
  clench: m({ w: 0.56, open: 0.16, curve: -0.35, round: 0.2, top: 0.5, teeth: true }),
  grimace: m({ w: 0.6, open: 0.2, curve: -0.2, skew: -0.3, round: 0.3, top: 0.5, teeth: true }),
  shout: m({ w: 0.5, open: 0.38, curve: -0.6, round: 0.6, top: 0.3, teeth: true, tongue: true }),
  wobble: m({ w: 0.3, curve: -0.25, skew: -0.5 }),
};

export const blendMouth = (a: MouthParams, b: MouthParams, t: number): MouthParams => ({
  w: lerp(a.w, b.w, t),
  open: Math.max(0, lerp(a.open, b.open, t)),
  curve: lerp(a.curve, b.curve, t),
  skew: lerp(a.skew, b.skew, t),
  round: lerp(a.round, b.round, t),
  top: lerp(a.top, b.top, t),
  teeth: t < 0.5 ? a.teeth : b.teeth,
  tongue: t < 0.5 ? a.tongue : b.tongue,
});
