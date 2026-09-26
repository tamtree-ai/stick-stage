import { add, dirFromAngle, lerp, scale, type Vec2 } from "../lib/math";
import type { Character, PoseAngles } from "./schema";
import { blendLegs, seatContact, seatedLegs, type SeatState } from "./seat";

export type Joints = {
  hip: Vec2;
  neck: Vec2;
  shoulder: Vec2;
  head: Vec2;
  /** Head tilt in degrees (+ = forward), used to rotate the face. */
  headTilt: number;
  elbowL: Vec2;
  handL: Vec2;
  elbowR: Vec2;
  handR: Vec2;
  kneeL: Vec2;
  ankleL: Vec2;
  kneeR: Vec2;
  ankleR: Vec2;
  /** Foot oval centers (drawn at ankles, shifted forward). */
  footL: Vec2;
  footR: Vec2;
};

export type RigMetrics = {
  heightPx: number;
  headR: number;
  strokeWidth: number;
  footRx: number;
  footRy: number;
  handR: number;
};

export const rigMetrics = (c: Character, figureHeightPx: number): RigMetrics => {
  const heightPx = figureHeightPx * c.proportions.height;
  const sw = c.style.strokeWidth;
  return {
    heightPx,
    headR: c.proportions.headRadius * heightPx,
    strokeWidth: sw,
    footRx: 0.055 * heightPx,
    footRy: 0.026 * heightPx,
    handR: sw * 0.95,
  };
};

export type Extras = {
  /** Multiplier on torso length (breathing). */
  torsoScale?: number;
  /** Sitting: the hip rests on a seat and the legs plant the feet (see `seat.ts`). */
  seat?: SeatState;
};

/**
 * Forward kinematics in figure space. The figure is placed so the lowest foot's
 * underside sits exactly on y = 0 at x = 0 (the root). Callers translate to groundY.
 */
export const solveSkeleton = (
  c: Character,
  p: PoseAngles,
  figureHeightPx: number,
  extras: Extras = {},
): Joints => {
  const m = rigMetrics(c, figureHeightPx);
  const H = m.heightPx;
  const P = c.proportions;

  // Legs are world-relative, measured from the hip at the origin.
  const seat = extras.seat;
  const stand = { hipL: p.hipL, kneeL: p.kneeL, hipR: p.hipR, kneeR: p.kneeR };
  const legs = seat ? blendLegs(stand, seatedLegs(c, m, seat.seatPx), seat.amount) : stand;
  const hip0: Vec2 = { x: 0, y: 0 };
  const thighL = legs.hipL;
  const thighR = legs.hipR;
  const kneeL0 = add(hip0, scale(dirFromAngle(thighL), P.thigh * H));
  const kneeR0 = add(hip0, scale(dirFromAngle(thighR), P.thigh * H));
  const ankleL0 = add(kneeL0, scale(dirFromAngle(thighL - legs.kneeL), P.shin * H));
  const ankleR0 = add(kneeR0, scale(dirFromAngle(thighR - legs.kneeR), P.shin * H));
  const footOffset: Vec2 = { x: m.footRx * 0.45, y: m.footRy * 0.35 };
  const footL0 = add(ankleL0, footOffset);
  const footR0 = add(ankleR0, footOffset);

  // Standing: lift the whole figure so the lowest foot touches y = 0.
  // Seated: the body's underside rests on the seat top. The hip never drops below the
  // height that keeps the feet on the floor (mid-sit), but can rise above it (dangling feet).
  const lowest = Math.max(footL0.y, footR0.y) + m.footRy;
  const seatedHip = seat ? seat.seatPx + seatContact(c, m) : lowest;
  const lift: Vec2 = { x: 0, y: -Math.max(lowest, lerp(lowest, seatedHip, seat?.amount ?? 0)) };
  const at = (v: Vec2) => add(v, lift);

  const hip = at(hip0);
  const torsoLen = P.torso * H * (extras.torsoScale ?? 1);
  const up = 180 - p.torso;
  const neck = add(hip, scale(dirFromAngle(up), torsoLen));
  const shoulder = add(hip, scale(dirFromAngle(up), torsoLen * 0.93));
  const headDir = up - p.head;
  const head = add(neck, scale(dirFromAngle(headDir), P.neck * H + m.headR));

  // Arms hang along the torso's downward direction (-torso) at 0°.
  const down = -p.torso;
  const upperL = down + p.shoulderL;
  const upperR = down + p.shoulderR;
  const elbowL = add(shoulder, scale(dirFromAngle(upperL), P.upperArm * H));
  const elbowR = add(shoulder, scale(dirFromAngle(upperR), P.upperArm * H));
  const handL = add(elbowL, scale(dirFromAngle(upperL + p.elbowL), P.forearm * H));
  const handR = add(elbowR, scale(dirFromAngle(upperR + p.elbowR), P.forearm * H));

  return {
    hip,
    neck,
    shoulder,
    head,
    headTilt: p.torso + p.head,
    elbowL,
    handL,
    elbowR,
    handR,
    kneeL: at(kneeL0),
    ankleL: at(ankleL0),
    kneeR: at(kneeR0),
    ankleR: at(ankleR0),
    footL: at(footL0),
    footR: at(footR0),
  };
};
