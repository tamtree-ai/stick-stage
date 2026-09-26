import { easeOutCubic } from "../lib/easing";
import { clamp, DEG, dirFromAngle, lerp } from "../lib/math";
import type { Character } from "./schema";
import type { RigMetrics } from "./skeleton";

/** Sit on a seat whose top is `seatPx` above the ground, or stand up (`null`). */
export type SeatKey = { frame: number; seatPx: number | null };

export type SeatState = {
  /** 0 = standing, 1 = seated. */
  amount: number;
  seatPx: number;
};

export const SIT_FRAMES = 6;
export const STAND_FRAMES = 5;

/** Seated amount at `frame` from sorted seat keys (each move starts from the previous key's end state). */
export const evalSeat = (keys: readonly SeatKey[] | undefined, frame: number): SeatState | undefined => {
  if (!keys || keys.length === 0) return undefined;
  let idx = -1;
  for (let i = 0; i < keys.length; i++) if (keys[i]!.frame <= frame) idx = i;
  if (idx < 0) return undefined;
  const key = keys[idx]!;
  const prev = keys[idx - 1];
  const wasSeated = prev ? prev.seatPx !== null : false;
  const elapsed = frame - key.frame;
  if (key.seatPx !== null) {
    // Keys at frame 0 (or already seated on another seat) start seated.
    if (key.frame === 0 && !prev) return { amount: 1, seatPx: key.seatPx };
    if (wasSeated) return { amount: 1, seatPx: key.seatPx };
    return { amount: elapsed >= SIT_FRAMES ? 1 : easeOutCubic(elapsed / SIT_FRAMES), seatPx: key.seatPx };
  }
  if (!wasSeated || !prev || prev.seatPx === null) return undefined;
  if (elapsed >= STAND_FRAMES) return undefined;
  return { amount: 1 - easeOutCubic(elapsed / STAND_FRAMES), seatPx: prev.seatPx };
};

/** How far the seated body's underside sits below the hip joint. */
export const seatContact = (c: Character, m: RigMetrics): number =>
  c.style.torso.style === "bean" ? c.style.torso.width * m.heightPx * 0.25 : m.strokeWidth * 0.5;

export type LegAngles = { hipL: number; kneeL: number; hipR: number; kneeR: number };

/**
 * Two-bone IK in hip space (y down): thigh length `a`, shin `b`, ankle target (tx, ty).
 * Returns rig angles (thigh world angle, knee bend back). Out of reach → straight toward it.
 */
export const solveLeg = (a: number, b: number, tx: number, ty: number): { hip: number; knee: number } => {
  const d = Math.hypot(tx, ty);
  const toTarget = Math.atan2(tx, ty) / DEG;
  if (d >= a + b - 1e-6) return { hip: toTarget, knee: 0 };
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const hip = toTarget + Math.acos(cosA) / DEG;
  const k = dirFromAngle(hip);
  const shin = Math.atan2(tx - k.x * a, ty - k.y * a) / DEG;
  return { hip, knee: hip - shin };
};

/**
 * Seated legs: the hip rests on the seat and each foot is planted on the floor in front
 * (the back leg a little behind the front one). Feet dangle if the seat is too high.
 */
export const seatedLegs = (c: Character, m: RigMetrics, seatPx: number): LegAngles => {
  const H = m.heightPx;
  const a = c.proportions.thigh * H;
  const b = c.proportions.shin * H;
  const hipH = seatPx + seatContact(c, m);
  // Ankle height above the ground when the foot oval rests on it.
  const ty = hipH - m.footRy * 1.35;
  const L = solveLeg(a, b, a * 0.82, ty);
  const R = solveLeg(a, b, a * 1.0, ty);
  return { hipL: L.hip, kneeL: L.knee, hipR: R.hip, kneeR: R.knee };
};

export const blendLegs = (stand: LegAngles, sit: LegAngles, t: number): LegAngles => {
  const k = clamp(t, 0, 1);
  return {
    hipL: lerp(stand.hipL, sit.hipL, k),
    kneeL: lerp(stand.kneeL, sit.kneeL, k),
    hipR: lerp(stand.hipR, sit.hipR, k),
    kneeR: lerp(stand.kneeR, sit.kneeR, k),
  };
};
