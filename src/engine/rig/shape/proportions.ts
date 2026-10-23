import type { Shape } from "./schema";

type Proportions = {
  height: number;
  headRadius: number;
  neck: number;
  torso: number;
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
};

/** Body widths and limb thickness, × the figure's height in px. */
export type ShapeBuildMetrics = { bodyWidth: number; limb: number };

/**
 * Build presets. Shape characters are short-limbed and big-headed; a kid stands about 0.62 of
 * a stick figure's height. Lengths are fractions of the build's own height, as in the stick rig.
 */
const BUILDS: Record<Shape["build"], Proportions & ShapeBuildMetrics> = {
  kid: { height: 0.62, headRadius: 0.24, neck: 0, torso: 0.24, upperArm: 0.15, forearm: 0.13, thigh: 0.085, shin: 0.08, bodyWidth: 0.34, limb: 0.085 },
  adult: { height: 0.85, headRadius: 0.19, neck: 0, torso: 0.28, upperArm: 0.16, forearm: 0.15, thigh: 0.12, shin: 0.11, bodyWidth: 0.3, limb: 0.07 },
  tall: { height: 1.0, headRadius: 0.16, neck: 0.02, torso: 0.31, upperArm: 0.17, forearm: 0.16, thigh: 0.15, shin: 0.14, bodyWidth: 0.25, limb: 0.06 },
  tiny: { height: 0.45, headRadius: 0.27, neck: 0, torso: 0.2, upperArm: 0.13, forearm: 0.12, thigh: 0.065, shin: 0.06, bodyWidth: 0.36, limb: 0.09 },
  round: { height: 0.72, headRadius: 0.21, neck: 0, torso: 0.27, upperArm: 0.15, forearm: 0.13, thigh: 0.075, shin: 0.07, bodyWidth: 0.46, limb: 0.085 },
};

export const shapeProportions = (s: Shape): Proportions => {
  const b = BUILDS[s.build];
  return {
    height: b.height * s.size,
    headRadius: b.headRadius * s.head.size,
    neck: b.neck,
    torso: b.torso,
    upperArm: b.upperArm,
    forearm: b.forearm,
    thigh: b.thigh,
    shin: b.shin,
  };
};

export const shapeBuildMetrics = (s: Shape): ShapeBuildMetrics => {
  const b = BUILDS[s.build];
  return { bodyWidth: b.bodyWidth * s.body.width, limb: b.limb };
};
