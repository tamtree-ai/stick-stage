import { easeOutBack } from "../lib/easing";
import { noise } from "../lib/seed";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import { clampCamera, frameShot, headInStage } from "../shots/framing";
import type { Camera } from "../shots/Stage";
import { stageActorsAt } from "./placement";
import { PUNCH_FACTOR, PUNCH_FRAMES, type ShotPlan } from "./shots";
import type { CastTrack, PunchIn, Shake, ShotKey, Timeline } from "./timeline";

/** Frame each planned cut from the actors as they stand at the cut frame (locked-off shots). */
export const solveShots = (
  plan: ShotPlan,
  cast: readonly CastTrack[],
  lib: Library,
  set: SetDef,
  fps: number,
  width: number,
  height: number,
): { shots: ShotKey[]; punchIns: PunchIn[]; shakes: Shake[] } => {
  const actorsAt = (f: number) => stageActorsAt(lib, cast, set, f, fps, width);
  // A face shot on someone mid-move frames them where they come to rest (the shot is locked off).
  const settle = (on: string | undefined, f: number) => {
    const c = cast.find((x) => x.id === on);
    if (!c) return f;
    // Moves in progress, and pose changes landing within the close-up's first second.
    const window = f + Math.round(fps);
    let at = f;
    for (const k of c.moveKeys) if (k.frame <= at + 2 && at < k.frame + k.durationFrames) at = k.frame + k.durationFrames;
    for (const k of c.poseKeys) if (k.frame > f - 6 && k.frame <= window) at = Math.max(at, k.frame + (k.durationFrames ?? 4) + 2);
    return at;
  };
  /** A group shot fits everyone at the cut and wherever they walk to before the next cut. */
  const groupActors = (from: number, to: number) => {
    const frames = new Set([from, Math.max(from, to - 1)]);
    for (const c of cast) for (const k of c.moveKeys) if (k.frame + k.durationFrames > from && k.frame < to) frames.add(Math.min(to - 1, k.frame + k.durationFrames));
    return [...frames].flatMap(actorsAt);
  };
  const shots = plan.cuts.map((c, i) => {
    const next = plan.cuts[i + 1]?.frame ?? Infinity;
    const end = Number.isFinite(next) ? next : Math.max(c.frame + 1, ...cast.flatMap((x) => x.moveKeys.map((k) => k.frame + k.durationFrames)));
    const actors = c.on ? actorsAt(settle(c.on, c.frame)) : c.framing === "two" ? groupActors(c.frame, end) : actorsAt(c.frame);
    return { frame: c.frame, framing: c.framing, on: c.on, reason: c.reason, camera: frameShot({ framing: c.framing, on: c.on }, actors, width, height, set.groundY) };
  });
  const punchIns = plan.punchIns.map((p): PunchIn => {
    const a = actorsAt(p.frame).find((x) => x.id === p.on)!;
    const { head } = headInStage(a, width, set.groundY);
    return { frame: p.frame, on: p.on, cx: head.x, cy: head.y, factor: PUNCH_FACTOR, durationFrames: PUNCH_FRAMES };
  });
  return { shots, punchIns, shakes: plan.shakes };
};

const SHAKE_PX = 22;

/** The cut in effect at `frame`. */
export const shotAt = (tl: Pick<Timeline, "shots">, frame: number): ShotKey => {
  let shot = tl.shots[0]!;
  for (const s of tl.shots) if (s.frame <= frame) shot = s;
  return shot;
};

/** Camera at `frame`: the latest cut, plus a punch-in since that cut, plus any shake. */
export const cameraAt = (tl: Pick<Timeline, "shots" | "punchIns" | "shakes" | "width" | "height">, frame: number): Camera => {
  const shot = shotAt(tl, frame);
  let cam = shot.camera;
  let punch: PunchIn | undefined;
  for (const p of tl.punchIns) if (p.frame <= frame && p.frame >= shot.frame) punch = p;
  if (punch) {
    const k = 1 + (punch.factor - 1) * easeOutBack((frame - punch.frame) / punch.durationFrames, 1.4);
    const s = cam.scale * k;
    // Zoom about the subject's head so it stays put on screen.
    cam = clampCamera(
      { scale: s, cx: punch.cx - (cam.scale / s) * (punch.cx - cam.cx), cy: punch.cy - (cam.scale / s) * (punch.cy - cam.cy) },
      tl.width,
      tl.height,
    );
  }
  for (const sh of tl.shakes) {
    const t = frame - sh.frame;
    if (t < 0 || t >= sh.durationFrames) continue;
    const decay = 1 - t / sh.durationFrames;
    // Zoom in a touch so the shake has room without showing past the set's edges.
    const scale = cam.scale * (1 + 0.05 * sh.intensity * decay);
    const amp = (SHAKE_PX * sh.intensity * decay) / scale;
    cam = clampCamera(
      { scale, cx: cam.cx + amp * noise(`shake-${sh.frame}`, "x", t * 0.9), cy: cam.cy + amp * noise(`shake-${sh.frame}`, "y", t * 0.9) },
      tl.width,
      tl.height,
    );
  }
  return cam;
};
