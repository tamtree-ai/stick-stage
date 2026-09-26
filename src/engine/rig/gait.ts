import { clamp } from "../lib/math";
import type { PoseAngles } from "./schema";

/**
 * Simple walk / run cycles (plan §7: "walk cycles, simple, not IK"). A gait key swings the legs
 * and arms on top of the current pose while the director moves the root linearly. The rig's
 * lowest-foot grounding gives the body bob for free; feet may slide a little, by design.
 */
export type GaitKind = "walk" | "run";
export type GaitKey = { frame: number; durationFrames: number; kind: GaitKind };

type Cycle = {
  /** Frames per full cycle (two steps) at 30 fps. */
  frames: number;
  hip: number;
  knee: number;
  arm: number;
  elbow: number;
  lean: number;
  /** Stage px per second, as a fraction of figure height. */
  speed: number;
};

export const GAITS: Record<GaitKind, Cycle> = {
  walk: { frames: 18, hip: 24, knee: 34, arm: 20, elbow: 18, lean: 3, speed: 0.95 },
  run: { frames: 12, hip: 40, knee: 80, arm: 48, elbow: 70, lean: 12, speed: 2.2 },
};

/** Frames to ease the cycle in and out, so a walk starts and stops without a pop. */
const RAMP = 3;

/** Frames to cover `distancePx` at a gait's speed. */
export const gaitFrames = (kind: GaitKind, distancePx: number, figurePx: number, fps: number): number =>
  Math.max(6, Math.round((Math.abs(distancePx) / (GAITS[kind].speed * figurePx)) * fps));

/** Add the active gait's swing to a pose (no-op outside a gait key). */
export const applyGait = (angles: PoseAngles, keys: readonly GaitKey[] | undefined, frame: number, fps: number): PoseAngles => {
  const k = keys?.find((g) => frame >= g.frame && frame < g.frame + g.durationFrames);
  if (!k) return angles;
  const c = GAITS[k.kind];
  const t = frame - k.frame;
  const amt = clamp(Math.min(t + 1, k.durationFrames - t) / RAMP, 0, 1);
  const phase = (2 * Math.PI * t * 30) / (c.frames * fps);
  const s = Math.sin(phase);
  // A leg bends its knee while it swings forward (the back half of the cycle for each leg).
  const liftL = Math.max(0, Math.cos(phase));
  const liftR = Math.max(0, -Math.cos(phase));
  return {
    ...angles,
    torso: angles.torso + c.lean * amt,
    hipL: angles.hipL + c.hip * s * amt,
    hipR: angles.hipR - c.hip * s * amt,
    kneeL: angles.kneeL + c.knee * liftL * amt,
    kneeR: angles.kneeR + c.knee * liftR * amt,
    shoulderL: angles.shoulderL - c.arm * s * amt,
    shoulderR: angles.shoulderR + c.arm * s * amt,
    elbowL: angles.elbowL + c.elbow * amt,
    elbowR: angles.elbowR + c.elbow * amt,
  };
};
