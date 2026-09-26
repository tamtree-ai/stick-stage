import { clamp, lerp } from "../lib/math";
import type { MouthCue, MouthShape } from "../voice/schema";
import { blendMouth, type MouthParams } from "./mouths";

/**
 * Rhubarb mouth shapes as points in the parametric mouth space (×R), so speech blends with
 * expression mouths instead of swapping drawings.
 *   A closed (M B P) · B slightly open, teeth (K S T EE) · C open (EH AE) · D wide (AA)
 *   E rounded (AO ER) · F puckered (UW OW W) · G teeth on lip (F V) · H tongue up (L) · X rest
 */
export const VISEMES: Record<MouthShape, Omit<MouthParams, "curve" | "skew">> = {
  A: { w: 0.24, open: 0, round: 0.4, top: 0.3, teeth: false, tongue: false },
  B: { w: 0.32, open: 0.1, round: 0.3, top: 0.45, teeth: true, tongue: false },
  C: { w: 0.34, open: 0.22, round: 0.55, top: 0.3, teeth: true, tongue: false },
  D: { w: 0.38, open: 0.36, round: 0.75, top: 0.22, teeth: true, tongue: true },
  E: { w: 0.26, open: 0.24, round: 0.95, top: 0.3, teeth: false, tongue: true },
  F: { w: 0.16, open: 0.12, round: 1, top: 0.4, teeth: false, tongue: false },
  G: { w: 0.3, open: 0.1, round: 0.3, top: 0.75, teeth: true, tongue: false },
  H: { w: 0.32, open: 0.24, round: 0.6, top: 0.3, teeth: false, tongue: true },
  X: { w: 0.24, open: 0, round: 0.4, top: 0.3, teeth: false, tongue: false },
};

/** Blend into each new mouth shape over this long (Rhubarb shapes are meant to be snappy). */
export const VISEME_BLEND_MS = 45;

/** Active cue index at `ms` (cues sorted, contiguous). -1 before the first / after the last. */
const cueAt = (cues: readonly MouthCue[], ms: number): number => {
  for (let i = 0; i < cues.length; i++) if (ms >= cues[i]!.startMs && ms < cues[i]!.endMs) return i;
  return -1;
};

/**
 * Speech mouth for one line at `ms` (line-relative), layered on the expression mouth:
 * visemes supply the opening and shape; the expression keeps its corner lift and smirk
 * (smiling while talking reads as happy talking), and a wide expression mouth widens speech.
 * Rest (X, or outside the line) returns the expression mouth itself.
 */
export const speechMouth = (expr: MouthParams, cues: readonly MouthCue[], ms: number): MouthParams => {
  const layered = (shape: MouthShape): MouthParams => {
    if (shape === "X") return expr;
    const v = VISEMES[shape];
    const widen = clamp(expr.w / 0.3, 0.9, 1.35);
    const loud = clamp(0.85 + expr.open * 0.8, 0.85, 1.25);
    return {
      ...v,
      w: v.w * widen,
      open: clamp(v.open * loud, 0, 1),
      curve: expr.curve * 0.7,
      skew: expr.skew * 0.7,
      round: lerp(v.round, expr.round, 0.2),
    };
  };
  const i = cueAt(cues, ms);
  if (i < 0) return expr;
  const cue = cues[i]!;
  const here = layered(cue.shape);
  const prev = i > 0 ? layered(cues[i - 1]!.shape) : expr;
  const t = clamp((ms - cue.startMs) / VISEME_BLEND_MS, 0, 1);
  return t >= 1 ? here : blendMouth(prev, here, t);
};
