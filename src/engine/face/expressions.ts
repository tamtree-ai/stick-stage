import { easeOutCubic } from "../lib/easing";
import { lerp } from "../lib/math";
import { blendMouth, MOUTH_PRESETS, type MouthParams } from "./mouths";
import type { EyeShape, Expression, SymbolId } from "./schema";

export type BrowState = { raise: number; tilt: number };

/** Fully resolved, blendable face parameters. */
export type FaceState = {
  eyeShape: EyeShape;
  lid: number;
  lower: number;
  lidTilt: number;
  pupil: number;
  gaze: { x: number; y: number };
  browL: BrowState;
  browR: BrowState;
  mouth: MouthParams;
  symbols: SymbolId[];
};

export const resolveMouth = (mouth: Expression["mouth"]): MouthParams => {
  if (typeof mouth === "string") {
    // Lip-sync replaces "speech" in M2; until then it reads as a neutral closed mouth.
    const preset = MOUTH_PRESETS[mouth === "speech" ? "neutral" : mouth];
    if (!preset) throw new Error(`Unknown mouth preset "${mouth}"`);
    return preset;
  }
  const { preset, ...overrides } = mouth;
  const p = MOUTH_PRESETS[preset];
  if (!p) throw new Error(`Unknown mouth preset "${preset}"`);
  return { ...p, ...overrides };
};

export const resolveExpression = (e: Expression): FaceState => ({
  eyeShape: e.eyes.shape,
  lid: e.eyes.lid,
  lower: e.eyes.lower,
  lidTilt: e.eyes.lidTilt,
  pupil: e.eyes.pupil,
  gaze: e.eyes.gaze,
  browL: e.brows.left ?? { raise: e.brows.raise, tilt: e.brows.tilt },
  browR: e.brows.right ?? { raise: e.brows.raise, tilt: e.brows.tilt },
  mouth: resolveMouth(e.mouth),
  symbols: e.symbols,
});

const blendBrow = (a: BrowState, b: BrowState, t: number): BrowState => ({
  raise: lerp(a.raise, b.raise, t),
  tilt: lerp(a.tilt, b.tilt, t),
});

/** Numeric channels blend; eye shape and symbols snap at the start (pose-to-pose style). */
export const blendFace = (a: FaceState, b: FaceState, t: number): FaceState => ({
  eyeShape: t > 0 ? b.eyeShape : a.eyeShape,
  lid: lerp(a.lid, b.lid, t),
  lower: lerp(a.lower, b.lower, t),
  lidTilt: lerp(a.lidTilt, b.lidTilt, t),
  pupil: lerp(a.pupil, b.pupil, t),
  gaze: { x: lerp(a.gaze.x, b.gaze.x, t), y: lerp(a.gaze.y, b.gaze.y, t) },
  browL: blendBrow(a.browL, b.browL, t),
  browR: blendBrow(a.browR, b.browR, t),
  mouth: blendMouth(a.mouth, b.mouth, t),
  symbols: t > 0 ? b.symbols : a.symbols,
});

export type ExpressionKey = { frame: number; expression: string };
export const EXPRESSION_BLEND_FRAMES = 3;

export const evalExpressionTrack = (
  keys: readonly ExpressionKey[],
  frame: number,
  getExpression: (id: string) => Expression,
): FaceState => {
  if (keys.length === 0) throw new Error("evalExpressionTrack: empty track");
  let current = resolveExpression(getExpression(keys[0]!.expression));
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i]!;
    if (key.frame > frame) break;
    const next = keys[i + 1];
    const end = next && next.frame <= frame ? next.frame : frame;
    const t = easeOutCubic((end - key.frame + 1) / EXPRESSION_BLEND_FRAMES);
    current = blendFace(current, resolveExpression(getExpression(key.expression)), t);
  }
  return current;
};
