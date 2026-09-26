import { easeOutBack, bump } from "../lib/easing";
import { lerp, lerpAngle } from "../lib/math";
import { POSE_ANGLES, type Pose, type PoseAngles } from "./schema";

export type PoseKey = {
  frame: number;
  pose: string;
  /** Main move length in frames. Default 4 (snappy). */
  durationFrames?: number;
};

export const DEFAULT_POSE_FRAMES = 4;
export const ANTICIPATION_FRAMES = 2;
const ANTICIPATION_AMOUNT = 0.12;

export const toAngles = (p: Pose): PoseAngles => ({
  torso: p.torso,
  head: p.head,
  shoulderL: p.shoulderL,
  elbowL: p.elbowL,
  shoulderR: p.shoulderR,
  elbowR: p.elbowR,
  hipL: p.hipL,
  kneeL: p.kneeL,
  hipR: p.hipR,
  kneeR: p.kneeR,
  bend: p.bend,
});

/** Blend every channel along its shortest arc; t may overshoot past 1. */
export const blendAngles = (a: PoseAngles, b: PoseAngles, t: number): PoseAngles => {
  const out = { bend: {} } as PoseAngles;
  for (const k of POSE_ANGLES) out[k] = lerpAngle(a[k], b[k], t);
  const bendKeys = ["armL", "armR", "legL", "legR"] as const;
  for (const k of bendKeys) {
    const av = a.bend[k];
    const bv = b.bend[k];
    if (av !== undefined || bv !== undefined) out.bend[k] = lerp(av ?? 0, bv ?? 0, t);
  }
  return out;
};

/** Transition progress for a move that started `elapsed` frames ago (may overshoot). */
export const transitionProgress = (
  elapsed: number,
  durationFrames: number,
  anticipation: boolean,
): number => {
  const lead = anticipation ? ANTICIPATION_FRAMES : 0;
  if (elapsed < lead) return -ANTICIPATION_AMOUNT * bump((elapsed + 1) / (lead + 1));
  const t = (elapsed - lead) / durationFrames;
  return t >= 1 ? 1 : easeOutBack(t);
};

export const transitionLength = (key: PoseKey, pose: Pose): number =>
  (pose.anticipation ? ANTICIPATION_FRAMES : 0) + (key.durationFrames ?? DEFAULT_POSE_FRAMES);

/**
 * Evaluate a pose track at `frame`. Keys must be sorted by frame. A key that interrupts
 * an unfinished transition starts from the interrupted in-between state.
 */
export const evalPoseTrack = (
  keys: readonly PoseKey[],
  frame: number,
  getPose: (id: string) => Pose,
): PoseAngles => {
  if (keys.length === 0) throw new Error("evalPoseTrack: empty track");
  const first = keys[0]!;
  let current = toAngles(getPose(first.pose));
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i]!;
    if (key.frame > frame) break;
    const target = getPose(key.pose);
    const next = keys[i + 1];
    // State at the moment this key begins (a following key may interrupt this one).
    const end = next && next.frame <= frame ? next.frame : frame;
    const t = transitionProgress(
      end - key.frame,
      key.durationFrames ?? DEFAULT_POSE_FRAMES,
      target.anticipation,
    );
    current = blendAngles(current, toAngles(target), t);
  }
  return current;
};
