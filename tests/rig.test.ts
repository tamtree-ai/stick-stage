import { describe, expect, it } from "vitest";
import { library, POSE_IDS } from "../src/data";
import { evalActor, getter, rigMetrics, solveSkeleton, toAngles, blinkAmount, evalPoseTrack, type ActorTracks } from "../src/engine";

const FIG = 760;
const FPS = 30;
const chars = Object.keys(library.characters);

describe("grounding", () => {
  for (const c of chars) {
    for (const p of POSE_IDS) {
      it(`${c} / ${p}: lowest foot sits on groundY`, () => {
        const ch = library.characters[c]!;
        const j = solveSkeleton(ch, toAngles(library.poses[p]!), FIG);
        const m = rigMetrics(ch, FIG);
        const bottom = Math.max(j.footL.y, j.footR.y) + m.footRy;
        expect(Math.abs(bottom)).toBeLessThan(0.5);
      });
    }
  }

  it("stays grounded with idle breathing/sway on every frame", () => {
    const tracks: ActorTracks = {
      character: "milo",
      poseKeys: POSE_IDS.map((pose, i) => ({ frame: i * 20, pose })),
      expressionKeys: [{ frame: 0, expression: "neutral" }],
    };
    for (let f = 0; f < 260; f++) {
      const s = evalActor(library, tracks, f, FPS, FIG);
      const bottom = Math.max(s.joints.footL.y, s.joints.footR.y) + s.metrics.footRy;
      expect(Math.abs(bottom)).toBeLessThan(0.5);
    }
  });
});

describe("determinism", () => {
  const tracks: ActorTracks = {
    character: "june",
    poseKeys: [
      { frame: 0, pose: "idle" },
      { frame: 10, pose: "arms-up" },
      { frame: 13, pose: "shrug" },
    ],
    expressionKeys: [
      { frame: 0, expression: "neutral" },
      { frame: 12, expression: "angry" },
    ],
  };
  it("same frame → same state, regardless of evaluation order", () => {
    const a = evalActor(library, tracks, 42, FPS, FIG);
    evalActor(library, tracks, 7, FPS, FIG);
    evalActor(library, tracks, 300, FPS, FIG);
    const b = evalActor(library, tracks, 42, FPS, FIG);
    expect(b).toEqual(a);
  });
});

describe("pose transitions", () => {
  const getPose = getter("pose", library.poses);
  const keys = [
    { frame: 0, pose: "idle" },
    { frame: 30, pose: "point" },
  ];
  it("is continuous at the key frame and reaches the target", () => {
    const before = evalPoseTrack(keys, 29, getPose);
    const at = evalPoseTrack(keys, 30, getPose);
    expect(at.shoulderR).toBeCloseTo(before.shoulderR);
    const done = evalPoseTrack(keys, 40, getPose);
    expect(done.shoulderR).toBeCloseTo(library.poses.point!.shoulderR);
  });
  it("overshoots slightly on the snappy default transition", () => {
    const target = library.poses.point!.shoulderR;
    const frames = [31, 32, 33].map((f) => evalPoseTrack(keys, f, getPose).shoulderR);
    expect(Math.max(...frames)).toBeGreaterThan(target);
  });
  it("anticipation dips away before a big gesture", () => {
    const k = [
      { frame: 0, pose: "idle" },
      { frame: 10, pose: "arms-up" },
    ];
    const start = evalPoseTrack(k, 9, getPose).shoulderR;
    const dip = evalPoseTrack(k, 10, getPose).shoulderR;
    expect(dip).toBeLessThan(start);
  });
  it("an interrupting key starts from the in-between state", () => {
    const k = [
      { frame: 0, pose: "idle" },
      { frame: 10, pose: "point" },
      { frame: 12, pose: "shrug" },
    ];
    const mid = evalPoseTrack(k.slice(0, 2), 12, getPose);
    const at = evalPoseTrack(k, 12, getPose);
    expect(at.shoulderR).toBeCloseTo(mid.shoulderR);
  });
});

describe("blinks", () => {
  it("blinks every 2.5–5 s", () => {
    const starts: number[] = [];
    let prev = 0;
    for (let f = 0; f < FPS * 60; f++) {
      const b = blinkAmount("milo", f, FPS);
      if (b > 0 && prev === 0) starts.push(f);
      prev = b;
    }
    expect(starts.length).toBeGreaterThan(10);
    for (let i = 1; i < starts.length; i++) {
      const gap = (starts[i]! - starts[i - 1]!) / FPS;
      expect(gap).toBeGreaterThanOrEqual(2.45);
      expect(gap).toBeLessThanOrEqual(5.05);
    }
  });
});
