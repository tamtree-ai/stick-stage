import { easeOutBack } from "../lib/easing";
import { lerp } from "../lib/math";
import { evalActor, type ActorTracks, type Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import type { StageActor } from "../shots/Stage";
import type { CastTrack, Facing } from "./timeline";

/** Horizontal root position (fraction of frame width) at `frame`: quick eased moves between marks. */
export const xAt = (c: Pick<CastTrack, "x" | "moveKeys">, frame: number): number => {
  let x = c.x;
  c.moveKeys.forEach((k, i) => {
    if (k.frame > frame) return;
    // A later move interrupts this one from wherever it got to.
    const next = c.moveKeys[i + 1];
    const until = next && next.frame <= frame ? next.frame : frame;
    const t = (until - k.frame) / k.durationFrames;
    // Snappy cartoon slide: fast start, tiny overshoot at the end.
    x = t >= 1 ? k.x : lerp(x, k.x, easeOutBack(t, 0.8));
  });
  return x;
};

export const facingAt = (c: Pick<CastTrack, "facing" | "facingKeys">, frame: number): Facing => {
  let f = c.facing;
  for (const k of c.facingKeys) if (k.frame <= frame) f = k.facing;
  return f;
};

export const HOP_FRAMES = 10;

/** Root lift in px (negative = up) from hops: a quick parabola. */
export const hopAt = (c: Pick<CastTrack, "hopKeys">, frame: number, figurePx: number): number => {
  let dy = 0;
  for (const k of c.hopKeys) {
    const t = (frame - k.frame) / HOP_FRAMES;
    if (t > 0 && t < 1) dy -= 4 * t * (1 - t) * k.height * figurePx;
  }
  return dy;
};

/** Engine actor tracks for a compiled cast member (root placement included, so drops stay put). */
export const actorTracksFor = (c: CastTrack, width: number): ActorTracks => ({
  character: c.character,
  seed: c.seed,
  poseKeys: c.poseKeys,
  expressionKeys: c.expressionKeys,
  gazeKeys: c.gazeKeys,
  nodKeys: c.nodKeys,
  seatKeys: c.seatKeys,
  propKeys: c.propKeys,
  symbolKeys: c.symbolKeys,
  speech: c.speech,
  rootAt: (f) => ({ x: xAt(c, f) * width, sign: facingAt(c, f) === "left" ? -1 : 1 }),
});

/** Every cast member ready for `<Stage>` / `frameShot` at `frame`. */
export const stageActorsAt = (
  lib: Library,
  cast: readonly CastTrack[],
  set: SetDef,
  frame: number,
  fps: number,
  width: number,
): StageActor[] =>
  cast.map((c) => ({
    id: c.id,
    x: xAt(c, frame),
    facing: facingAt(c, frame),
    dy: hopAt(c, frame, set.figureHeightPx),
    state: evalActor(lib, actorTracksFor(c, width), frame, fps, set.figureHeightPx),
  }));

/**
 * Gaze (x forward, y down, in [-1,1]) for a character at `self` looking at stage point `p`.
 * Only the direction matters; the eye rig caps the reach.
 */
export const gazeToward = (self: { x: number; facing: Facing }, target: { x: number; y?: number }, headY?: number) => {
  const dx = (target.x - self.x) * (self.facing === "left" ? -1 : 1);
  const x = Math.max(-1, Math.min(1, dx / 0.25)) * 0.55;
  const y = target.y !== undefined && headY !== undefined ? Math.max(-1, Math.min(1, (target.y - headY) / 0.25)) * 0.5 : 0;
  return { x, y };
};
