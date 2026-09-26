import { gaitFrames, type GaitKind } from "../rig/gait";
import { toAngles } from "../rig/pose";
import { solveSkeleton } from "../rig/skeleton";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import { facingAt, xAt } from "./placement";
import type { CastTrack, Facing } from "./timeline";

/**
 * Locomotion and two-character contact (plan §7): walk / run between marks, entrances and exits
 * via the off-stage marks, high-fives and shoves. Contact distances come from the rig's actual
 * arm reach, so hands meet whatever the character's proportions.
 */

/** Marks every set has: just outside the frame, for entrances and exits. */
export const OFFSTAGE_MARKS: Readonly<Record<string, number>> = { "off-left": -0.22, "off-right": 1.22 };

export const markX = (set: SetDef, mark: string): number | undefined => set.marks[mark] ?? OFFSTAGE_MARKS[mark];
export const allMarks = (set: SetDef): string[] => [...Object.keys(set.marks), ...Object.keys(OFFSTAGE_MARKS)];

/** Where a moved character stands when not on a named mark (no seat there). */
export const OFF_MARK = "(between marks)";

export type MoveCtx = { set: SetDef; lib: Library; width: number; fps: number; cast: Iterable<CastTrack> };

/** Facing toward the nearest other on-stage character at `frame`, from position `x`. */
const faceOthers = (ctx: MoveCtx, self: CastTrack, frame: number, x: number): Facing | undefined => {
  let best: number | undefined;
  for (const c of ctx.cast) {
    if (c.id === self.id) continue;
    const ox = xAt(c, frame);
    if (ox < 0 || ox > 1) continue;
    if (best === undefined || Math.abs(ox - x) < Math.abs(best - x)) best = ox;
  }
  return best === undefined || best === x ? undefined : best > x ? "right" : "left";
};

/** Walk or run to `x`. Returns the arrival frame. */
export const walk = (ctx: MoveCtx, c: CastTrack, frame: number, x: number, kind: GaitKind, facing?: Facing): number => {
  const from = xAt(c, frame);
  const dur = gaitFrames(kind, (x - from) * ctx.width, ctx.set.figureHeightPx, ctx.fps);
  const travel: Facing = x >= from ? "right" : "left";
  c.moveKeys.push({ frame, x, durationFrames: dur, ease: "linear" });
  c.gaitKeys.push({ frame, durationFrames: dur, kind });
  if (facingAt(c, frame) !== travel) c.facingKeys.push({ frame, facing: travel });
  const end = frame + dur;
  const final = facing ?? faceOthers(ctx, c, end, x) ?? travel;
  if (final !== travel) c.facingKeys.push({ frame: end, facing: final });
  return end;
};

/** Front-hand reach in px (figure space, facing right) in `pose`. */
const reach = (ctx: MoveCtx, c: CastTrack, pose: string): number => {
  const j = solveSkeleton(ctx.lib.characters[c.character]!, toAngles(ctx.lib.poses[pose]!), ctx.set.figureHeightPx);
  return Math.max(j.handR.x, j.handL.x);
};

/** Half the body's width at the chest (what a shove lands on). */
const chest = (ctx: MoveCtx, c: CastTrack): number => {
  const ch = ctx.lib.characters[c.character]!;
  const h = ctx.set.figureHeightPx * ch.proportions.height;
  return ch.style.torso.style === "bean" ? (ch.style.torso.width * h) / 2 : ch.style.strokeWidth;
};

const STEP_IN = 8;
const HOLD = 14;

/** Both step together, face each other and slap hands at `frame`. */
export const highFive = (ctx: MoveCtx, a: CastTrack, b: CastTrack, frame: number): void => {
  const start = Math.max(0, frame - STEP_IN);
  const [xa, xb] = [xAt(a, start), xAt(b, start)];
  const [left, right] = xa <= xb ? [a, b] : [b, a];
  const gap = ((reach(ctx, a, "high-five") + reach(ctx, b, "high-five")) * 0.96) / ctx.width;
  const mid = (xa + xb) / 2;
  const targets: [CastTrack, number, Facing][] = [
    [left, mid - gap / 2, "right"],
    [right, mid + gap / 2, "left"],
  ];
  for (const [c, x, facing] of targets) {
    if (facingAt(c, start) !== facing) c.facingKeys.push({ frame: start, facing });
    if (Math.abs(xAt(c, start) - x) > 0.005) {
      c.moveKeys.push({ frame: start, x, durationFrames: frame - start || 1, ease: "linear" });
      c.gaitKeys.push({ frame: start, durationFrames: frame - start || 1, kind: "walk" });
    }
    c.poseKeys.push({ frame: Math.max(0, frame - 4), pose: "high-five" });
    c.poseKeys.push({ frame: frame + HOLD, pose: "idle" });
  }
};

/** `a` steps in and shoves `b`, who staggers back `distance` (fraction of frame width). */
export const shove = (ctx: MoveCtx, a: CastTrack, b: CastTrack, frame: number, distance: number): void => {
  const start = Math.max(0, frame - STEP_IN);
  const xb = xAt(b, start);
  const dir = xb >= xAt(a, start) ? 1 : -1;
  const x = xb - (dir * (reach(ctx, a, "shove") + chest(ctx, b))) / ctx.width;
  const facing: Facing = dir > 0 ? "right" : "left";
  if (facingAt(a, start) !== facing) a.facingKeys.push({ frame: start, facing });
  if (Math.abs(xAt(a, start) - x) > 0.005) {
    a.moveKeys.push({ frame: start, x, durationFrames: frame - start || 1, ease: "linear" });
    a.gaitKeys.push({ frame: start, durationFrames: frame - start || 1, kind: "walk" });
  }
  a.poseKeys.push({ frame: Math.max(0, frame - 6), pose: "shove" });
  a.poseKeys.push({ frame: frame + HOLD, pose: "idle" });
  b.poseKeys.push({ frame: Math.max(0, frame - 1), pose: "recoil", durationFrames: 3 });
  b.poseKeys.push({ frame: frame + HOLD + 4, pose: "idle" });
  // Keep the target far enough from the stage edge that its face can still be framed.
  b.moveKeys.push({ frame, x: Math.min(0.78, Math.max(0.22, xb + dir * distance)), durationFrames: 8 });
  b.hopKeys.push({ frame, height: 0.04 });
};
