import { evalExpressionTrack, type ExpressionKey, type FaceState } from "../face/expressions";
import type { Expression, SymbolId } from "../face/schema";
import { speechMouth } from "../face/visemes";
import type { MouthCue } from "../voice/schema";
import { applyGait, type GaitKey } from "./gait";
import { blinkAmount, idleOffsets } from "./idle";
import { evalPoseTrack, type PoseKey } from "./pose";
import type { Character, Pose, PoseAngles } from "./schema";
import { evalSeat, type SeatKey } from "./seat";
import type { PropDef, PropKey } from "../props/schema";
import { evalProps, type PropState, type Reframe } from "../props/track";
import { easeOutCubic, bump } from "../lib/easing";
import { lerp } from "../lib/math";
import { rigMetrics, solveSkeleton, type Joints, type RigMetrics } from "./skeleton";

export type Library = {
  characters: Record<string, Character>;
  poses: Record<string, Pose>;
  expressions: Record<string, Expression>;
  props: Record<string, PropDef>;
};

export const getter =
  <T,>(kind: string, table: Record<string, T>) =>
  (id: string): T => {
    const v = table[id];
    if (!v) throw new Error(`Unknown ${kind} "${id}". Known: ${Object.keys(table).join(", ")}`);
    return v;
  };

export type ActorTracks = {
  character: string;
  seed?: string;
  poseKeys: readonly PoseKey[];
  expressionKeys: readonly ExpressionKey[];
  /** Optional gaze override (x,y in [-1,1]), e.g. listeners looking at the speaker. */
  gaze?: { x: number; y: number };
  /** Timed gaze overrides; `null` hands that axis back to the expression. Blends over 4 frames. */
  gazeKeys?: readonly GazeKey[];
  /** Small head nods (listeners, and a speaker's stressed words). */
  nodKeys?: readonly NodKey[];
  /** A brow lift added on top of the expression (a question). */
  browKeys?: readonly BrowKey[];
  /** Where the root stands at a frame (stage px) and which way it faces. Keeps dropped props in place. */
  rootAt?: (frame: number) => { x: number; sign: 1 | -1 };
  idle?: number;
  /** Sit down / stand up (seat heights come from the set: `seatHeightAt`). */
  seatKeys?: readonly SeatKey[];
  /** Symbols popped on top of the expression (M4 `symbol` action). Default 30 frames. */
  symbolKeys?: readonly SymbolKey[];
  /** Hold / put away / drop hand props. */
  propKeys?: readonly PropKey[];
  /** Spoken lines: mouth cues (line-relative ms) starting at `startFrame`. */
  speech?: readonly SpeechClip[];
  /** Walk / run cycles layered on the pose (the director moves the root). */
  gaitKeys?: readonly GaitKey[];
};

export type SymbolKey = { frame: number; symbol: SymbolId; durationFrames?: number };
export type GazeKey = { frame: number; x: number | null; y?: number | null };
export type NodKey = { frame: number; /** Degrees of forward head tilt at the bottom of the nod. */ amount?: number };
export type BrowKey = { frame: number; raise: number };

export const GAZE_BLEND_FRAMES = 4;
export const NOD_FRAMES = 9;
const NOD_DEG = 7;

/** Gaze with timed overrides layered on the expression's own gaze (keys sorted by frame). */
export const evalGaze = (keys: readonly GazeKey[] | undefined, frame: number, base: { x: number; y: number }) => {
  const blendAt = (a: { x: number; y: number }, b: { x: number; y: number }, elapsed: number) => {
    const t = easeOutCubic(elapsed / GAZE_BLEND_FRAMES);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  };
  let seg: { start: { x: number; y: number }; target: { x: number; y: number }; frame: number } | undefined;
  for (const k of keys ?? []) {
    if (k.frame > frame) break;
    const start = seg ? blendAt(seg.start, seg.target, k.frame - seg.frame) : base;
    seg = { start, target: { x: k.x ?? base.x, y: k.y ?? base.y }, frame: k.frame };
  }
  return seg ? blendAt(seg.start, seg.target, frame - seg.frame) : base;
};

const BROW_FRAMES = 8;

/** Extra brow raise from lifts active at `frame` (a question's last word). */
export const browLift = (keys: readonly BrowKey[] | undefined, frame: number): number => {
  let raise = 0;
  for (const k of keys ?? []) raise += k.raise * bump((frame - k.frame) / BROW_FRAMES);
  return raise;
};

/** Forward head tilt from nods active at `frame`. */
export const nodOffset = (keys: readonly NodKey[] | undefined, frame: number): number => {
  let deg = 0;
  for (const k of keys ?? []) deg += (k.amount ?? NOD_DEG) * bump((frame - k.frame) / NOD_FRAMES);
  return deg;
};
export const DEFAULT_SYMBOL_FRAMES = 30;

/** Add active symbol events to the face; returns each event symbol's age for its entry pop. */
const applySymbols = (face: FaceState, keys: readonly SymbolKey[] | undefined, frame: number) => {
  const ages: Partial<Record<SymbolId, number>> = {};
  for (const k of keys ?? []) {
    const age = frame - k.frame;
    if (age < 0 || age >= (k.durationFrames ?? DEFAULT_SYMBOL_FRAMES)) continue;
    if (!face.symbols.includes(k.symbol)) face.symbols = [...face.symbols, k.symbol];
    ages[k.symbol] = age;
  }
  return ages;
};

export type SpeechClip = { startFrame: number; cues: readonly MouthCue[] };

/** Lip-sync layered on the expression mouth while a line is playing. */
const applySpeech = (face: FaceState, speech: readonly SpeechClip[] | undefined, frame: number, fps: number): void => {
  for (const clip of speech ?? []) {
    const ms = ((frame - clip.startFrame) / fps) * 1000;
    const end = clip.cues[clip.cues.length - 1]?.endMs ?? 0;
    if (ms >= 0 && ms < end) {
      face.mouth = speechMouth(face.mouth, clip.cues, ms);
      return;
    }
  }
};

export type ActorState = {
  character: Character;
  angles: PoseAngles;
  joints: Joints;
  metrics: RigMetrics;
  face: FaceState;
  blink: number;
  symbolsSince: number;
  /** Ages of event symbols (see `symbolKeys`). */
  symbolAges: Partial<Record<SymbolId, number>>;
  props: PropState;
};

/** Figure space at `dropFrame` → stage → figure space now (x mirrors with facing). */
const reframeFrom =
  (rootAt: NonNullable<ActorTracks["rootAt"]>, frame: number): Reframe =>
  (p, dropFrame) => {
    const then = rootAt(dropFrame);
    const now = rootAt(frame);
    const stageX = then.x + then.sign * p.x;
    return { x: (stageX - now.x) * now.sign, y: p.y, angle: p.angle * then.sign * now.sign };
  };

const lastKeyFrame = (keys: readonly ExpressionKey[], frame: number): number => {
  let at = 0;
  for (const k of keys) if (k.frame <= frame) at = k.frame;
  return at;
};

/** Everything needed to draw one actor at `frame`. Pure: same inputs → same state. */
export const evalActor = (
  lib: Library,
  tracks: ActorTracks,
  frame: number,
  fps: number,
  figureHeightPx: number,
): ActorState => {
  const character = getter("character", lib.characters)(tracks.character);
  const seed = tracks.seed ?? character.id;
  const getPose = getter("pose", lib.poses);
  const bodyAt = (f: number) => {
    const seat = evalSeat(tracks.seatKeys, f);
    const posed = evalPoseTrack(tracks.poseKeys, f, getPose);
    const base = seat ? posed : applyGait(posed, tracks.gaitKeys, f, fps);
    const idle = idleOffsets(seed, f, fps, tracks.idle ?? 1);
    const angles: PoseAngles = { ...base, torso: base.torso + idle.torso, head: base.head + idle.head + nodOffset(tracks.nodKeys, f) };
    const joints = solveSkeleton(character, angles, figureHeightPx, {
      torsoScale: idle.torsoScale,
      seat,
    });
    return { angles, joints };
  };
  const { angles, joints } = bodyAt(frame);
  const face = evalExpressionTrack(tracks.expressionKeys, frame, getter("expression", lib.expressions));
  if (tracks.gaze) face.gaze = tracks.gaze;
  if (tracks.gazeKeys?.length) face.gaze = evalGaze(tracks.gazeKeys, frame, face.gaze);
  const lift = browLift(tracks.browKeys, frame);
  if (lift) {
    face.browL = { ...face.browL, raise: face.browL.raise + lift };
    face.browR = { ...face.browR, raise: face.browR.raise + lift };
  }
  applySpeech(face, tracks.speech, frame, fps);
  const symbolAges = applySymbols(face, tracks.symbolKeys, frame);
  const props = evalProps(
    tracks.propKeys,
    frame,
    fps,
    getter("prop", lib.props),
    (f, hand) => {
      const j = bodyAt(f).joints;
      return hand === "L" ? { hand: j.handL, elbow: j.elbowL } : { hand: j.handR, elbow: j.elbowR };
    },
    figureHeightPx,
    tracks.rootAt ? reframeFrom(tracks.rootAt, frame) : undefined,
  );
  return {
    character,
    angles,
    joints,
    metrics: rigMetrics(character, figureHeightPx),
    face,
    blink: blinkAmount(seed, frame, fps),
    symbolsSince: lastKeyFrame(tracks.expressionKeys, frame),
    symbolAges,
    props,
  };
};
