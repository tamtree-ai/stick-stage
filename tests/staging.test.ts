import { describe, expect, it } from "vitest";
import { library, sets } from "../src/data";
import {
  evalActor,
  evalSeat,
  fallPose,
  PROP_BOUNDS,
  propBounds,
  propUnit,
  rigMetrics,
  SEAT_HEIGHT,
  seatContact,
  seatHeightAt,
  solveLeg,
  STAND_FRAMES,
  type ActorTracks,
} from "../src/engine";
import { dirFromAngle } from "../src/engine/lib/math";
import { PROP_POSES } from "../src/app/labs/propPoses";
import { SCENES } from "../src/app/labs/stagingScenes";

const FIG = 720;
const FPS = 30;
const chars = Object.keys(library.characters);
const footBottom = (s: ReturnType<typeof evalActor>) => Math.max(s.joints.footL.y, s.joints.footR.y) + s.metrics.footRy;

describe("two-bone leg IK", () => {
  it("reaches a reachable target and goes straight toward an unreachable one", () => {
    const a = 100;
    const b = 90;
    for (const [tx, ty] of [
      [80, 120],
      [120, 40],
      [30, 150],
    ] as const) {
      const { hip, knee } = solveLeg(a, b, tx, ty);
      const k = dirFromAngle(hip);
      const s = dirFromAngle(hip - knee);
      expect(k.x * a + s.x * b).toBeCloseTo(tx, 6);
      expect(k.y * a + s.y * b).toBeCloseTo(ty, 6);
      expect(knee).toBeGreaterThan(0); // knee points forward, shin bends back
    }
    expect(solveLeg(a, b, 0, 400).knee).toBe(0);
  });
});

describe("seating", () => {
  for (const c of chars) {
    for (const [kind, h] of Object.entries(SEAT_HEIGHT)) {
      it(`${c} on a ${kind}: body rests on the seat, feet on or above the floor`, () => {
        const seatPx = h * FIG;
        const s = evalActor(
          library,
          { character: c, poseKeys: [{ frame: 0, pose: "sit" }], expressionKeys: [{ frame: 0, expression: "neutral" }], seatKeys: [{ frame: 0, seatPx }] },
          40,
          FPS,
          FIG,
        );
        const contact = seatContact(s.character, rigMetrics(s.character, FIG));
        expect(s.joints.hip.y + contact).toBeCloseTo(-seatPx, 3);
        const feet = footBottom(s);
        // Never through the floor. Milo and June were proportioned to plant on every seat.
        // Shorter characters (kids, Moss) dangle when the seat is too high; seat.ts allows that.
        expect(feet).toBeLessThan(0.5);
        if (c === "milo" || c === "june") expect(Math.abs(feet)).toBeLessThan(0.5);
        // Upper-body pose still applies (sit pose), feet in front of the hip.
        expect(s.joints.footR.x).toBeGreaterThan(s.joints.hip.x);
      });
    }
  }

  const tracks: ActorTracks = {
    character: "milo",
    poseKeys: [{ frame: 0, pose: "idle" }],
    expressionKeys: [{ frame: 0, expression: "neutral" }],
    seatKeys: [
      { frame: 0, seatPx: null },
      { frame: 10, seatPx: 130 },
      { frame: 40, seatPx: null },
    ],
    idle: 0,
  };
  it("sits down smoothly and stands back up grounded", () => {
    const at = (f: number) => evalActor(library, tracks, f, FPS, FIG);
    expect(Math.abs(footBottom(at(9)))).toBeLessThan(0.5);
    const hips = [10, 11, 12, 13, 14, 15, 16, 17].map((f) => at(f).joints.hip.y);
    // Hip descends (y grows downward) monotonically onto the seat, feet never leave the floor.
    for (let i = 1; i < hips.length; i++) expect(hips[i]!).toBeGreaterThanOrEqual(hips[i - 1]! - 1e-9);
    expect(hips[hips.length - 1]).toBeCloseTo(at(30).joints.hip.y, 3);
    for (let f = 0; f < 60; f++) expect(footBottom(at(f)), `@${f}`).toBeLessThan(0.5);
    expect(at(40 + STAND_FRAMES).joints.hip.y).toBeCloseTo(at(9).joints.hip.y, 3);
  });
  it("evalSeat is undefined before any seated key", () => {
    expect(evalSeat(tracks.seatKeys, 5)).toBeUndefined();
    expect(evalSeat(tracks.seatKeys, 60)).toBeUndefined();
    expect(evalSeat(tracks.seatKeys, 25)).toEqual({ amount: 1, seatPx: 130 });
  });
  it("sets resolve seats for the marks that list them", () => {
    expect(seatHeightAt(sets["office-1"]!, "left")).toBeCloseTo(SEAT_HEIGHT.chair * FIG);
    expect(seatHeightAt(sets["office-1"]!, "right")).toBeUndefined();
    expect(seatHeightAt(sets["park-1"]!, "right")).toBeCloseTo(SEAT_HEIGHT.bench * FIG);
  });
});

describe("props", () => {
  it("a held prop stays in the hand through every pose change", () => {
    for (const [prop, pose] of PROP_POSES) {
      const tracks: ActorTracks = {
        character: "june",
        poseKeys: ["idle", pose, "point", "shrug", "arms-up", "recoil", "sit"].map((p, i) => ({ frame: i * 6, pose: p })),
        expressionKeys: [{ frame: 0, expression: "neutral" }],
        propKeys: [{ frame: 0, hand: "R", prop }],
      };
      for (let f = 0; f < 50; f++) {
        const s = evalActor(library, tracks, f, FPS, FIG);
        expect(s.props.held.R?.def.id, `${prop} @${f}`).toBe(prop);
        expect(s.props.held.L).toBeUndefined();
      }
    }
  });
  it("pops in on pickup and is gone after put-away", () => {
    const tracks: ActorTracks = {
      character: "milo",
      poseKeys: [{ frame: 0, pose: "hold-phone" }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
      propKeys: [
        { frame: 5, hand: "R", prop: "phone" },
        { frame: 20, hand: "R", prop: null },
      ],
    };
    const at = (f: number) => evalActor(library, tracks, f, FPS, FIG).props;
    expect(at(4).held.R).toBeUndefined();
    expect(at(5).held.R!.pop).toBeLessThan(1);
    expect(at(12).held.R!.pop).toBe(1);
    expect(at(20).held.R).toBeUndefined();
    expect(at(20).dropped).toHaveLength(0);
  });
  it("a dropped prop falls to the floor, lands lying down and stays until picked up", () => {
    const tracks: ActorTracks = {
      character: "milo",
      poseKeys: [{ frame: 0, pose: "hold-phone" }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
      propKeys: [
        { frame: 0, hand: "R", prop: "phone" },
        { frame: 10, hand: "R", prop: null, drop: true },
        { frame: 80, hand: "L", prop: "phone" },
      ],
    };
    const at = (f: number) => evalActor(library, tracks, f, FPS, FIG).props;
    const phone = library.props.phone!;
    const rest = -PROP_BOUNDS.phone.x1 * propUnit(phone, FIG);
    const start = at(10).dropped[0]!;
    const hand = evalActor(library, tracks, 10, FPS, FIG).joints.handR;
    expect(start.x).toBeCloseTo(hand.x);
    expect(start.y).toBeCloseTo(hand.y);
    const landed = at(60).dropped[0]!;
    expect(landed.y).toBeCloseTo(rest);
    expect(landed.angle).toBe(90);
    expect(at(79).dropped).toHaveLength(1);
    expect(at(80).dropped).toHaveLength(0);
    expect(at(80).held.L?.def.id).toBe("phone");
  });
  it("a dropped drawn prop rests on the floor", () => {
    const fries = library.props.fries!;
    const tracks: ActorTracks = {
      character: "milo",
      poseKeys: [{ frame: 0, pose: "idle" }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
      propKeys: [
        { frame: 0, hand: "R", prop: "fries" },
        { frame: 10, hand: "R", prop: null, drop: true },
      ],
    };
    const at = (f: number) => evalActor(library, tracks, f, FPS, FIG).props;
    const rest = -propBounds(fries).x1 * propUnit(fries, FIG);
    expect(at(60).dropped[0]!.y).toBeCloseTo(rest);
    expect(at(60).dropped[0]!.angle).toBe(90);
  });
  it("fall is frame-pure and never sinks below its rest height", () => {
    const phone = library.props.phone!;
    const rest = -PROP_BOUNDS.phone.x1 * propUnit(phone, FIG);
    for (let t = 0; t < 1.5; t += 1 / FPS) {
      const p = fallPose(phone, { x: 10, y: -300 }, 20, t, FIG);
      expect(p.y).toBeLessThanOrEqual(rest + 1e-6);
      expect(fallPose(phone, { x: 10, y: -300 }, 20, t, FIG)).toEqual(p);
    }
  });
});

describe("symbol events", () => {
  it("add a symbol for its duration on top of the expression", () => {
    const tracks: ActorTracks = {
      character: "milo",
      poseKeys: [{ frame: 0, pose: "idle" }],
      expressionKeys: [{ frame: 0, expression: "angry" }],
      symbolKeys: [{ frame: 10, symbol: "question", durationFrames: 20 }],
    };
    const at = (f: number) => evalActor(library, tracks, f, FPS, FIG);
    expect(at(9).face.symbols).not.toContain("question");
    expect(at(15).face.symbols).toEqual(expect.arrayContaining(["anger", "question"]));
    expect(at(15).symbolAges.question).toBe(5);
    expect(at(30).face.symbols).not.toContain("question");
  });
});

describe("staging lab scenes", () => {
  it("use known sets, and every seated cast member has a seat", () => {
    for (const sc of SCENES) {
      const set = sets[sc.set];
      expect(set, sc.set).toBeDefined();
      for (const [mark, t] of Object.entries(sc.cast)) {
        if (t.sit?.some(([, s]) => s)) expect(seatHeightAt(set!, mark), `${sc.set}/${mark}`).toBeDefined();
      }
    }
  });
});
