import type { ActorTracks, SetDef } from "../../engine";
import { seatHeightAt } from "../../engine";

/** One StagingLab scene: a set and a few seconds of business for each cast member (local frames). */
export type Scene = {
  set: string;
  note: string;
  cast: { left: CastTracks; right: CastTracks };
};
type CastTracks = Omit<ActorTracks, "character" | "seatKeys"> & {
  /** Frames at which this cast member sits on its mark's seat (true) or stands (false). */
  sit?: [frame: number, seated: boolean][];
};

export const SCENE_FRAMES = 150;

const pose = (...keys: [number, string][]) => keys.map(([frame, p]) => ({ frame, pose: p }));
const expr = (...keys: [number, string][]) => keys.map(([frame, e]) => ({ frame, expression: e }));

export const SCENES: Scene[] = [
  {
    set: "plain-1",
    note: "plain · symbols ? ! speed lines",
    cast: {
      left: {
        poseKeys: pose([0, "idle"], [20, "think"], [90, "recoil"]),
        expressionKeys: expr([0, "neutral"], [20, "confused"], [90, "shocked"]),
        symbolKeys: [
          { frame: 22, symbol: "question", durationFrames: 55 },
          { frame: 90, symbol: "speed-lines", durationFrames: 50 },
        ],
      },
      right: {
        poseKeys: pose([0, "idle"], [60, "point"], [120, "hands-on-hips"]),
        expressionKeys: expr([0, "neutral"], [60, "angry"], [120, "smug"]),
        symbolKeys: [{ frame: 60, symbol: "exclaim", durationFrames: 40 }],
      },
    },
  },
  {
    set: "living-1",
    note: "interior · cup, sweat",
    cast: {
      left: {
        poseKeys: pose([0, "idle"], [40, "shrug"], [100, "facepalm"]),
        expressionKeys: expr([0, "neutral"], [40, "cringe"], [100, "sad"]),
        symbolKeys: [{ frame: 44, symbol: "sweat", durationFrames: 60 }],
      },
      right: {
        poseKeys: pose([0, "hold-chest"], [70, "lean-in"], [110, "hold-chest"]),
        expressionKeys: expr([0, "happy"], [70, "sarcastic"]),
        propKeys: [{ frame: 0, hand: "R", prop: "cup" }],
      },
    },
  },
  {
    set: "office-1",
    note: "office · seated at desk (fg), laptop",
    cast: {
      left: {
        sit: [[0, true]],
        poseKeys: pose([0, "sit"], [50, "point"], [95, "sit"]),
        expressionKeys: expr([0, "deadpan"], [50, "annoyed"], [95, "deadpan"]),
      },
      right: {
        poseKeys: pose([0, "hold-chest"], [60, "hold-chest"], [100, "shrug"]),
        expressionKeys: expr([0, "happy"], [100, "confused"]),
        propKeys: [
          { frame: 0, hand: "R", prop: "laptop" },
          { frame: 100, hand: "R", prop: null },
        ],
      },
    },
  },
  {
    set: "lounge-1",
    note: "interior · couch, sit → stand",
    cast: {
      left: {
        sit: [[0, true]],
        poseKeys: pose([0, "sit"], [70, "facepalm"]),
        expressionKeys: expr([0, "neutral"], [70, "cringe"]),
      },
      right: {
        sit: [
          [0, true],
          [60, false],
        ],
        poseKeys: pose([0, "sit"], [60, "arms-up"], [110, "hands-on-hips"]),
        expressionKeys: expr([0, "neutral"], [60, "happy"], [110, "smug"]),
      },
    },
  },
  {
    set: "park-1",
    note: "park · bench, sign, sit down",
    cast: {
      left: {
        sit: [
          [0, false],
          [30, true],
        ],
        poseKeys: pose([0, "idle"], [30, "sit"], [100, "think"]),
        expressionKeys: expr([0, "neutral"], [100, "confused"]),
        symbolKeys: [{ frame: 104, symbol: "question", durationFrames: 46 }],
      },
      right: {
        poseKeys: pose([0, "idle"], [60, "hold-up"]),
        expressionKeys: expr([0, "neutral"], [60, "crying"]),
        propKeys: [{ frame: 60, hand: "R", prop: "sign" }],
      },
    },
  },
  {
    set: "street-1",
    note: "street · mic, phone drop",
    cast: {
      left: {
        poseKeys: pose([0, "hold-out"], [95, "recoil"]),
        expressionKeys: expr([0, "happy"], [95, "shocked"]),
        propKeys: [{ frame: 0, hand: "R", prop: "mic" }],
      },
      right: {
        poseKeys: pose([0, "hold-phone"], [90, "arms-up"]),
        expressionKeys: expr([0, "neutral"], [90, "shocked"]),
        propKeys: [
          { frame: 0, hand: "R", prop: "phone" },
          { frame: 90, hand: "R", prop: null, drop: true },
        ],
        symbolKeys: [
          { frame: 90, symbol: "exclaim", durationFrames: 40 },
          { frame: 90, symbol: "speed-lines", durationFrames: 50 },
        ],
      },
    },
  },
];

/** Resolve `sit` flags into seat keys using the set's seat for the cast member's mark. */
export const seatKeysFor = (set: SetDef, mark: string, t: CastTracks): ActorTracks["seatKeys"] => {
  if (!t.sit) return undefined;
  const seatPx = seatHeightAt(set, mark);
  if (seatPx === undefined) throw new Error(`Set "${set.id}" has no seat for mark "${mark}"`);
  return t.sit.map(([frame, seated]) => ({ frame, seatPx: seated ? seatPx : null }));
};
