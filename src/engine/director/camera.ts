import { easeOutBack } from "../lib/easing";
import { noise } from "../lib/seed";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import { clampCamera, faceRect, frameShot, headInStage, type Framing } from "../shots/framing";
import { inside } from "../text/layout";
import { safeRect, type Rect, type SafeArea } from "../text/safeArea";
import type { Camera } from "../shots/Stage";
import { stageActorsAt } from "./placement";
import { PUNCH_FACTOR, PUNCH_FRAMES, type ShotPlan } from "./shots";
import type { CastTrack, PunchIn, Shake, ShotKey, Timeline } from "./timeline";

/** Used when the caller gives no safe area (the conservative TikTok / Reels / Shorts profile). */
export const DEFAULT_SAFE_AREA: SafeArea = { schemaVersion: 1, top: 0.14, bottom: 0.3, left: 0.04, right: 0.12 };

/** Frame each planned cut from the actors as they stand at the cut frame (locked-off shots). */
export const solveShots = (
  plan: ShotPlan,
  cast: readonly CastTrack[],
  lib: Library,
  set: SetDef,
  fps: number,
  width: number,
  height: number,
  safeArea: SafeArea = DEFAULT_SAFE_AREA,
  /** Scene length: the last cut holds until here. */
  durationInFrames?: number,
  /** Stage rectangles a two-shot keeps in frame over [from, to) (figures on screen). */
  keepInFrame: (from: number, to: number) => Rect[] = () => [],
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
  /**
   * A face shot is locked off, but the subject may still be moving (a recoil, a gesture):
   * frame the head's average position over the shot's first second and where it settles.
   */
  const faceCamera = (c: ShotPlan["cuts"][number], end: number): { framing: Framing; camera: Camera; note: string } => {
    const last = Math.min(end - 1, c.frame + Math.round(fps));
    const frames = [...new Set([c.frame, ...[0.25, 0.5, 0.75, 1].map((t) => Math.round(c.frame + t * (last - c.frame))), Math.min(end - 1, settle(c.on, c.frame))])];
    const subject = frames.map((f) => actorsAt(f).find((a) => a.id === c.on)!);
    // Step back (extreme → close → medium) until the face features stay in the safe area over
    // the shot: a moving head, or one near the stage edge where the camera can't center it.
    const ladder: Framing[] = c.framing === "extreme" ? ["extreme", "close", "medium"] : c.framing === "close" ? ["close", "medium"] : [c.framing];
    const safe = safeRect(safeArea, width, height);
    let best: { framing: Framing; camera: Camera } | undefined;
    for (const framing of ladder) {
      const cams = frames.map((f) => frameShot({ framing, on: c.on }, actorsAt(f), width, height, set.groundY));
      const avg = (k: "cx" | "cy") => cams.reduce((sum, x) => sum + x[k], 0) / cams.length;
      const camera = clampCamera({ scale: cams[0]!.scale, cx: avg("cx"), cy: avg("cy") }, width, height);
      best = { framing, camera };
      if (subject.every((a) => inside(faceRect(a, camera, width, height, set.groundY), safe, 0.02 * width))) break;
    }
    return { ...best!, note: best!.framing === c.framing ? "" : ` (${best!.framing}: face wouldn't fit ${c.framing})` };
  };
  const shots = plan.cuts.map((c, i) => {
    const next = plan.cuts[i + 1]?.frame ?? Infinity;
    const end = Number.isFinite(next) ? next : (durationInFrames ?? Math.max(c.frame + 1, ...cast.flatMap((x) => x.moveKeys.map((k) => k.frame + k.durationFrames))));
    if (c.on) {
      const f = faceCamera(c, end);
      return { frame: c.frame, framing: f.framing, on: c.on, reason: c.reason + f.note, camera: f.camera };
    }
    const camera = frameShot({ framing: c.framing, on: c.on }, c.framing === "two" ? groupActors(c.frame, end) : actorsAt(c.frame), width, height, set.groundY, c.framing === "two" ? keepInFrame(c.frame, end) : []);
    return { frame: c.frame, framing: c.framing, on: c.on, reason: c.reason, camera };
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
