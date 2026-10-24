import { add, clamp, DEG, dirFromAngle, lerp, scale, type Vec2 } from "../../lib/math";
import type { PoseAngles } from "../schema";
import type { Extras, Joints, RigMetrics } from "../skeleton";
import { shapeBuildMetrics } from "./proportions";
import type { Shape } from "./schema";

type Lengths = { body: number; upper: number; lower: number; headR: number };

/** Rotate by `deg` (y down: + turns +x toward +y, so a positive pitch drops the nose). */
const rotate = (v: Vec2, deg: number): Vec2 => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

/**
 * The quadruped skeleton, on the biped's pose angles so every pose, gait and director rule keeps
 * working. The back legs are the biped's legs (`hip*`, `knee*`); the front legs are its arms
 * (`shoulder*`, `elbow*`), so `wave` lifts a front paw and `hold` puts a prop in the near paw;
 * `torso` pitches the body (a lean-in drops the nose); a `sit` pose or a seat drops onto the
 * haunches. Joints keep their biped names: `hip` is the rear hip, `shoulder` the front shoulder,
 * `elbow*`/`hand*` the front legs and paws, `knee*`/`ankle*`/`foot*` the back legs.
 */
export const solveQuadruped = (s: Shape, p: PoseAngles, m: RigMetrics, len: Lengths, extras: Extras = {}): Joints => {
  const bh = shapeBuildMetrics(s).bodyWidth * m.heightPx;
  const footOffset: Vec2 = { x: m.footRx * 0.45, y: m.footRy * 0.35 };

  // How much the pose sits: a folded hip (the sit pose) or a seat.
  const avgHip = (p.hipL + p.hipR) / 2;
  const sit = Math.max(clamp((avgHip - 30) / 45, 0, 1), extras.seat?.amount ?? 0);

  // Back legs, world-relative from the rear hip, exactly as the biped's.
  const hip0: Vec2 = { x: 0, y: 0 };
  const backLeg = (hipA: number, kneeA: number) => {
    const knee = add(hip0, scale(dirFromAngle(hipA), len.upper));
    const ankle = add(knee, scale(dirFromAngle(hipA - kneeA), len.lower));
    return { knee, ankle, foot: add(ankle, footOffset) };
  };
  // Sitting folds the back legs under the rump (a seat sits the same way as the sit pose).
  const bL = backLeg(lerp(p.hipL, 85, sit), lerp(p.kneeL, 100, sit));
  const bR = backLeg(lerp(p.hipR, 88, sit), lerp(p.kneeR, 104, sit));
  const backDrop = Math.max(bL.foot.y, bR.foot.y);

  // Pitch: the lean, then sitting tips the front up just enough for the front paws to reach the floor.
  const frontReach = len.upper + len.lower;
  const sitPitch = -Math.asin(clamp((frontReach - backDrop) / len.body, 0, 0.7)) * (180 / Math.PI);
  const pitch = lerp(clamp(p.torso * 0.4, -20, 20), sitPitch, sit);
  const along = (v: Vec2): Vec2 => rotate(v, pitch);
  const shoulder0 = along({ x: len.body, y: 0 });

  // Front legs from the arm angles: small angles stand, big ones lift the paw forward. Sitting
  // straightens them under the chest.
  const frontLeg = (sh: number, el: number) => {
    const a = lerp(sh * 0.6 + Math.max(0, sh - 40) * 0.35, 0, sit * (sh > 60 ? 0.3 : 1));
    // Only a raised paw bends at the wrist; folded-arm poses (arms-crossed, hold-chest) stand.
    const raised = clamp((sh - 30) / 40, 0, 1);
    const bend = lerp(el * 0.5 * raised + el * 0.1 * (1 - raised), 0, sit * (sh > 60 ? 0.3 : 1));
    const elbow = add(shoulder0, scale(dirFromAngle(a), len.upper));
    const paw = add(elbow, scale(dirFromAngle(a + bend), len.lower));
    return { elbow, paw };
  };
  const fL = frontLeg(p.shoulderL, p.elbowL);
  const fR = frontLeg(p.shoulderR, p.elbowR);

  // Ground: the lowest paw or foot touches y = 0; on a seat, the rump rests on it instead.
  const lowest = Math.max(bL.foot.y, bR.foot.y, fL.paw.y + footOffset.y, fR.paw.y + footOffset.y) + m.footRy;
  const seat = extras.seat;
  const seated = seat ? seat.seatPx + bh * 0.3 : lowest;
  // Centre the body on the mark (the root), not the rear hip.
  const lift: Vec2 = { x: -shoulder0.x / 2, y: -Math.max(lowest, lerp(lowest, seated, seat?.amount ?? 0)) };
  const at = (v: Vec2) => add(v, lift);

  const shoulder = at(shoulder0);
  const neck = add(shoulder, along({ x: bh * 0.12, y: -bh * 0.42 }));
  const head = add(shoulder, along({ x: bh * 0.18 + len.headR * 0.2, y: -(bh * 0.45 + len.headR * 0.62) }));
  return {
    hip: at(hip0),
    neck,
    shoulder,
    head,
    headTilt: pitch + p.head,
    elbowL: at(fL.elbow),
    handL: at(fL.paw),
    elbowR: at(fR.elbow),
    handR: at(fR.paw),
    kneeL: at(bL.knee),
    ankleL: at(bL.ankle),
    kneeR: at(bR.knee),
    ankleR: at(bR.ankle),
    footL: at(bL.foot),
    footR: at(bR.foot),
  };
};
