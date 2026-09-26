import { evalExpressionTrack, type ExpressionKey, type FaceState } from "../face/expressions";
import type { Expression, SymbolId } from "../face/schema";
import { speechMouth } from "../face/visemes";
import type { MouthCue } from "../voice/schema";
import { blinkAmount, idleOffsets } from "./idle";
import { evalPoseTrack, type PoseKey } from "./pose";
import type { Character, Pose, PoseAngles } from "./schema";
import { evalSeat, type SeatKey } from "./seat";
import type { PropDef, PropKey } from "../props/schema";
import { evalProps, type PropState } from "../props/track";
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
  idle?: number;
  /** Sit down / stand up (seat heights come from the set: `seatHeightAt`). */
  seatKeys?: readonly SeatKey[];
  /** Symbols popped on top of the expression (M4 `symbol` action). Default 30 frames. */
  symbolKeys?: readonly SymbolKey[];
  /** Hold / put away / drop hand props. */
  propKeys?: readonly PropKey[];
  /** Spoken lines: mouth cues (line-relative ms) starting at `startFrame`. */
  speech?: readonly SpeechClip[];
};

export type SymbolKey = { frame: number; symbol: SymbolId; durationFrames?: number };
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
    const base = evalPoseTrack(tracks.poseKeys, f, getPose);
    const idle = idleOffsets(seed, f, fps, tracks.idle ?? 1);
    const angles: PoseAngles = { ...base, torso: base.torso + idle.torso, head: base.head + idle.head };
    const joints = solveSkeleton(character, angles, figureHeightPx, {
      torsoScale: idle.torsoScale,
      seat: evalSeat(tracks.seatKeys, f),
    });
    return { angles, joints };
  };
  const { angles, joints } = bodyAt(frame);
  const face = evalExpressionTrack(tracks.expressionKeys, frame, getter("expression", lib.expressions));
  if (tracks.gaze) face.gaze = tracks.gaze;
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
