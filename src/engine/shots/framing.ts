import { clamp } from "../lib/math";
import type { Rect } from "../text/safeArea";
import type { Camera, StageActor } from "./Stage";

export const FRAMINGS = ["wide", "two", "medium", "close", "extreme"] as const;
export type Framing = (typeof FRAMINGS)[number];

/**
 * Face framings, tuned for 9:16. `headWidth` = head diameter as a fraction of frame width,
 * `eyeLine` = where the eyes land as a fraction of frame height (below the ~14% top safe area).
 */
export const FACE_FRAMING = {
  medium: { headWidth: 0.4, eyeLine: 0.3 },
  close: { headWidth: 0.62, eyeLine: 0.36 },
  extreme: { headWidth: 0.84, eyeLine: 0.42 },
} as const;

/**
 * Face framings for 16:9. Head width is a fraction of the wide frame, so the same
 * 9:16 fractions would fill the short height with a head. These keep a medium shot
 * at about a head and shoulders.
 */
export const WIDE_FACE_FRAMING = {
  medium: { headWidth: 0.16, eyeLine: 0.38 },
  close: { headWidth: 0.24, eyeLine: 0.42 },
  extreme: { headWidth: 0.32, eyeLine: 0.45 },
} as const;

/** `9:16` uses `FACE_FRAMING`. A landscape frame uses `WIDE_FACE_FRAMING`. */
export const faceFraming = (width: number, height: number) => (width > height ? WIDE_FACE_FRAMING : FACE_FRAMING);

/** Lead room: the subject sits this fraction of frame width *behind* center, looking into space. */
export const LEAD_ROOM = 0.03;

export type ShotSpec = { framing: Framing; on?: string };

type Pt = { x: number; y: number };

/** Head center, eye-line point and head radius of an actor in stage pixels. */
export const headInStage = (
  a: StageActor,
  width: number,
  groundY: number,
): { head: Pt; eyes: Pt; R: number } => {
  const { joints, metrics, character } = a.state;
  const sign = a.facing === "left" ? -1 : 1;
  const R = metrics.headR;
  const t = (joints.headTilt * Math.PI) / 180;
  // Eye midpoint in head-local coords, rotated with the head (SVG rotate is clockwise in y-down space).
  const lx = character.face.offsetX * R;
  const ly = character.face.eyeY * R;
  const ex = lx * Math.cos(t) - ly * Math.sin(t);
  const ey = lx * Math.sin(t) + ly * Math.cos(t);
  const head = { x: a.x * width + sign * joints.head.x, y: groundY + (a.dy ?? 0) + joints.head.y };
  return { head, eyes: { x: head.x + sign * ex, y: head.y + ey }, R };
};

/** Keep the view inside the stage so a zoomed camera never shows past the set's edges. */
export const clampCamera = (cam: Camera, width: number, height: number): Camera => {
  const s = Math.max(1, cam.scale);
  const hw = width / (2 * s);
  const hh = height / (2 * s);
  return { scale: s, cx: clamp(cam.cx, hw, width - hw), cy: clamp(cam.cy, hh, height - hh) };
};

/** Camera for a face framing on one actor. */
const faceShot = (
  a: StageActor,
  kind: keyof typeof FACE_FRAMING,
  width: number,
  height: number,
  groundY: number,
): Camera => {
  const { head, eyes, R } = headInStage(a, width, groundY);
  const spec = faceFraming(width, height)[kind];
  const scale = (spec.headWidth * width) / (2 * R);
  const lead = (a.facing === "right" ? 1 : -1) * LEAD_ROOM * (width / scale);
  // Solve cy so the eyes land on the eye line: H/2 + scale·(eyes.y − cy) = eyeLine·H.
  const cy = eyes.y - ((spec.eyeLine - 0.5) * height) / scale;
  // Horizontally center the head (not the eyes, which sit forward) so hair and bun stay in frame.
  return clampCamera({ scale, cx: head.x + lead, cy }, width, height);
};

/** Fit every actor head-to-feet with some padding; never zooms out past full frame. */
const groupShot = (
  actors: readonly StageActor[],
  width: number,
  height: number,
  groundY: number,
): Camera => {
  // Characters waiting off stage (entrances, exits) don't widen the shot.
  const onStage = actors.filter((a) => a.x >= 0 && a.x <= 1);
  if (onStage.length === 0) return { scale: 1, cx: width / 2, cy: height / 2 };
  const heads = onStage.map((a) => headInStage(a, width, groundY));
  const R = Math.max(...heads.map((h) => h.R));
  const x0 = Math.min(...heads.map((h) => h.head.x)) - 2.2 * R;
  const x1 = Math.max(...heads.map((h) => h.head.x)) + 2.2 * R;
  const y0 = Math.min(...heads.map((h) => h.head.y)) - 1.6 * R;
  const y1 = groundY + 0.6 * R;
  const scale = clamp(Math.min(width / (x1 - x0), height / (y1 - y0)), 1, 1.6);
  return clampCamera({ scale, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }, width, height);
};

/**
 * Framing preset → camera. `close`/`extreme`/`medium` need `on`; `two` fits the whole cast
 * (or just `on` + one other if given); `wide` is the full frame.
 */
export const frameShot = (
  shot: ShotSpec,
  actors: readonly StageActor[],
  width: number,
  height: number,
  groundY: number,
): Camera => {
  if (shot.framing === "wide") return { scale: 1, cx: width / 2, cy: height / 2 };
  if (shot.framing === "two") return groupShot(actors, width, height, groundY);
  const subject = actors.find((a) => a.id === shot.on);
  if (!subject)
    throw new Error(
      `Shot "${shot.framing}" needs "on" to name a cast member (got "${shot.on ?? ""}")`,
    );
  return faceShot(subject, shot.framing, width, height, groundY);
};

/** Eyes, brows and mouth of an actor, in screen px under `cam` (the part that must stay readable). */
export const faceRect = (a: StageActor, cam: Camera, width: number, height: number, groundY: number): Rect => {
  const { head, eyes, R } = headInStage(a, width, groundY);
  const c = a.state.character.face;
  const sign = a.facing === "left" ? -1 : 1;
  const cx = head.x + sign * c.offsetX * R;
  const x0 = cx - 0.6 * R;
  const y0 = eyes.y - 0.55 * R;
  const y1 = head.y + (c.mouthY + 0.22) * R;
  const s = cam.scale;
  return { x: (x0 - cam.cx) * s + width / 2, y: (y0 - cam.cy) * s + height / 2, w: 1.2 * R * s, h: (y1 - y0) * s };
};
