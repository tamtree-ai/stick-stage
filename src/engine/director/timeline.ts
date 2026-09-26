import type { ExpressionKey } from "../face/expressions";
import type { PropKey } from "../props/schema";
import type { GazeKey, NodKey, SpeechClip, SymbolKey } from "../rig/actorState";
import type { GaitKey } from "../rig/gait";
import type { PoseKey } from "../rig/pose";
import type { SeatKey } from "../rig/seat";
import type { Camera } from "../shots/Stage";
import type { Framing } from "../shots/framing";
import type { CaptionPage } from "../text/captions";

/**
 * Compiled skit: frame-indexed tracks, fully resolved (no anchors, no defaults left to apply).
 * Plain JSON, so it can be passed as composition props and written to `generated/timeline.json`.
 */

export type Facing = "left" | "right";

/** Quick cartoon move to a new horizontal position (fraction of frame width). */
export type MoveKey = { frame: number; x: number; durationFrames: number; /** Default "snap" (cartoon slide); "linear" for walks. */ ease?: "snap" | "linear" };
export type FacingKey = { frame: number; facing: Facing };
export type HopKey = { frame: number; /** Fraction of figure height. */ height: number };

export type CastTrack = {
  id: string;
  character: string;
  seed: string;
  /** Starting position (fraction of frame width) and facing. */
  x: number;
  facing: Facing;
  poseKeys: PoseKey[];
  expressionKeys: ExpressionKey[];
  gazeKeys: GazeKey[];
  nodKeys: NodKey[];
  seatKeys: SeatKey[];
  propKeys: PropKey[];
  symbolKeys: SymbolKey[];
  speech: SpeechClip[];
  moveKeys: MoveKey[];
  facingKeys: FacingKey[];
  hopKeys: HopKey[];
  gaitKeys: GaitKey[];
};

export type BeatKind = "line" | "silent" | "reaction";

export type BeatSpan = {
  id: string;
  kind: BeatKind;
  /** Inserted by the director (the reaction close-up after the punchline). */
  synthetic: boolean;
  punchline: boolean;
  from: number;
  /** Exclusive. */
  to: number;
  speaker?: string;
  /** Spoken beats: audio start/end frames. */
  audioFrom?: number;
  audioTo?: number;
};

/** A hard cut to a framing, locked off at the cut frame. */
export type ShotKey = {
  frame: number;
  framing: Framing;
  on?: string;
  camera: Camera;
  /** Why the director put it there (for labels, the M5 self-check and debugging). */
  reason: string;
};

export type PunchIn = {
  frame: number;
  on: string;
  /** Stage point kept fixed on screen while zooming (the subject's head). */
  cx: number;
  cy: number;
  factor: number;
  durationFrames: number;
};

export type Shake = { frame: number; durationFrames: number; intensity: number };

export type AudioClip = { frame: number; durationFrames: number; src: string; beatId: string };
export type SfxEvent = { frame: number; id: string; src: string; volume: number; durationFrames: number };
export type SlamEvent = { text: string; from: number; to: number };

export type Timeline = {
  schemaVersion: 1;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  set: string;
  cast: CastTrack[];
  beats: BeatSpan[];
  shots: ShotKey[];
  punchIns: PunchIn[];
  shakes: Shake[];
  audio: AudioClip[];
  sfx: SfxEvent[];
  pov?: { text: string; from: number; to: number };
  slams: SlamEvent[];
  pages: CaptionPage[];
};

/** How a scene comes in (`cut` has no overlap). */
export type SceneTransition = { type: "cut" | "fade" | "slide" | "wipe" | "clock-wipe"; durationFrames: number };

export type ProgramScene = {
  id: string;
  /** First frame of the scene in the whole skit (transitions overlap the previous scene). */
  from: number;
  transitionIn?: SceneTransition;
  timeline: Timeline;
};

/** A compiled skit: one or more scene timelines joined by transitions (`generated/timeline.json`). */
export type Program = {
  schemaVersion: 1;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  scenes: ProgramScene[];
};
