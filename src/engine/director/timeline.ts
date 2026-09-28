import type { ExpressionKey } from "../face/expressions";
import type { PropKey } from "../props/schema";
import type { BrowKey, GazeKey, NodKey, SpeechClip, SymbolKey } from "../rig/actorState";
import type { GaitKey } from "../rig/gait";
import type { PoseKey } from "../rig/pose";
import type { SeatKey } from "../rig/seat";
import type { Camera } from "../shots/Stage";
import type { Framing } from "../shots/framing";
import type { PartLabel } from "../set/schema";
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
  /** Name tag above the head in group shots. */
  label?: string;
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
  /** A brow lift on a question, added on top of the expression. */
  browKeys: BrowKey[];
  /** A stiff fall, rotating the body down onto the ground. */
  fallKeys: FallKey[];
};

export type FallKey = { frame: number };

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
  /** A voice-over line (the skit's narrator). */
  narrator?: boolean;
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
/** A list reveal: item `i` pops in at `at[i]`; the list leaves at `to` (the next cut). */
export type ListEvent = { items: string[]; at: number[]; to: number };
/** A title card: the kicker from `kickerFrom`, title line `i` from `at[i]`, all until `to`. */
export type CardEvent = { kicker?: string; lines: string[]; kickerFrom: number; at: number[]; to: number };

export type Timeline = {
  schemaVersion: 1;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  set: string;
  /** Per-scene words on set parts. Absent when the scene has none. */
  labels?: PartLabel[];
  cast: CastTrack[];
  beats: BeatSpan[];
  shots: ShotKey[];
  punchIns: PunchIn[];
  shakes: Shake[];
  audio: AudioClip[];
  sfx: SfxEvent[];
  pov?: { text: string; from: number; to: number };
  slams: SlamEvent[];
  lists: ListEvent[];
  card?: CardEvent;
  pages: CaptionPage[];
  /** How narrator caption pages are drawn (skits with a narrator). */
  narratorCaption?: "italic" | "boxed";
  /** The style's targets, so QA checks the cut it was directed with. */
  directing?: { id: string; closeupBudgetMs: number; minPunchGapMs: number; minCloseupMs: number; oneThingFrames: number; length: [number, number] };
  /** BCP 47. Captions and cards follow `direction`. */
  language?: string;
  direction?: "ltr" | "rtl";
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
  /** Original bed. Absent when the skit names none. */
  music?: { src: string; gain: number; ducked: number };
  /** A flash of a later frame, then a slide into beat one. */
  hook?: { kind: "teaser" | "slam"; scene: number; frame: number; prefixFrames: number; transitionFrames: number };
  /** The still the cover and thumbnail are framed from. */
  cover?: { scene: number; frame: number; title: string; badge?: string };
};
