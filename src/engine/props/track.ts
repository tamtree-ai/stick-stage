import { easeOutBack } from "../lib/easing";
import { lerp, type Vec2 } from "../lib/math";
import { PROP_BOUNDS } from "./draw";
import type { PropDef, PropKey } from "./schema";

export type Hand = "L" | "R";

export type HeldProp = { def: PropDef; hand: Hand; /** Pop-in scale (overshoots, settles at 1). */ pop: number };

/** A prop that left the hand, in figure space (root at 0,0 on the ground). */
export type DroppedProp = { def: PropDef; x: number; y: number; angle: number };

export type PropState = { held: Partial<Record<Hand, HeldProp>>; dropped: DroppedProp[] };

/** Hand position + forearm direction at some frame (from the actor's own pose track). */
export type HandAt = (frame: number, hand: Hand) => { hand: Vec2; elbow: Vec2 };

export const POP_FRAMES = 4;

/** Rotation (degrees, SVG clockwise) that points the prop's up axis along its grip. */
export const propAngle = (def: PropDef, elbow: Vec2, hand: Vec2): number =>
  def.align === "forearm" ? (Math.atan2(hand.x - elbow.x, -(hand.y - elbow.y)) * 180) / Math.PI + def.angle : def.angle;

/** Prop size unit in px: standing figure height × prop size. */
export const propUnit = (def: PropDef, figurePx: number) => figurePx * def.size;

// Drop physics in units of figure height per second.
const DROP_VX = 0.35;
const DROP_VY = -0.6;
const GRAVITY = 7;
const BOUNCE_S = 0.18;
const BOUNCE_H = 0.035;
/** Dropped props come to rest lying on their side. */
const REST_ANGLE = 90;

/** Where a prop dropped at `t0` (s ago = t) is now: arcs out, spins once, lands, bounces. */
export const fallPose = (def: PropDef, from: Vec2, angle0: number, t: number, figurePx: number): Omit<DroppedProp, "def"> => {
  const u = propUnit(def, figurePx);
  const g = GRAVITY * figurePx;
  const vy = DROP_VY * figurePx;
  const vx = DROP_VX * figurePx;
  // Rotated 90° clockwise, local x becomes y: the prop's far edge (x1) is its lowest point.
  const restY = -PROP_BOUNDS[def.kind].x1 * u;
  const disc = vy * vy + 2 * g * Math.max(0, restY - from.y);
  const land = (-vy + Math.sqrt(disc)) / g;
  if (t < land) {
    return { x: from.x + vx * t, y: from.y + vy * t + 0.5 * g * t * t, angle: lerp(angle0, REST_ANGLE + 360, t / land) };
  }
  const since = t - land;
  const bounce = since < BOUNCE_S ? Math.sin((Math.PI * since) / BOUNCE_S) * BOUNCE_H * figurePx : 0;
  return { x: from.x + vx * land, y: restY - bounce, angle: REST_ANGLE };
};

/**
 * Evaluate prop keys (sorted by frame) at `frame`. A hand holds the prop of its latest key.
 * A drop key makes the previously held prop fall; it stays on the floor until the same prop
 * is picked up again.
 */
export const evalProps = (
  keys: readonly PropKey[] | undefined,
  frame: number,
  fps: number,
  getProp: (id: string) => PropDef,
  handAt: HandAt,
  figurePx: number,
): PropState => {
  const state: PropState = { held: {}, dropped: [] };
  if (!keys || keys.length === 0) return state;
  const past = keys.filter((k) => k.frame <= frame);
  for (const hand of ["L", "R"] as const) {
    const last = [...past].reverse().find((k) => k.hand === hand);
    if (last?.prop) {
      const age = frame - last.frame;
      const pop = age >= POP_FRAMES ? 1 : 0.4 + 0.6 * easeOutBack((age + 1) / POP_FRAMES, 2);
      state.held[hand] = { def: getProp(last.prop), hand, pop };
    }
  }
  past.forEach((k, i) => {
    if (!k.drop) return;
    const before = past.slice(0, i).reverse().find((p) => p.hand === k.hand);
    if (!before?.prop) return;
    const id = before.prop;
    if (past.slice(i + 1).some((p) => p.prop === id)) return;
    const def = getProp(id);
    const at = handAt(k.frame, k.hand);
    const pose = fallPose(def, at.hand, propAngle(def, at.elbow, at.hand), (frame - k.frame) / fps, figurePx);
    state.dropped.push({ def, ...pose });
  });
  return state;
};
