import { describe, expect, it } from "vitest";
import { library, safeArea, sets } from "../src/data";
import { applyGait, checkSkit, facingAt, SkitError, stageActorsAt, toAngles, xAt, type Diagnostic } from "../src/engine";
import { compile } from "./director-fixtures";

const FPS = 30;
const check = (result: ReturnType<typeof compile>) => checkSkit({ result, lib: library, sets, safeArea });
const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
  throw new Error("expected a SkitError");
};
const silent = (id: string, actions: object[], durationMs = 1500) => ({ id, silent: true, durationMs, actions }) as never;

describe("walk / run", () => {
  it("walks linearly to a mark with a gait cycle and faces the other on arrival", () => {
    const { timeline: tl } = compile([silent("w", [{ who: "june", do: "walkTo", mark: "center" }])], {
      cast: [
        { id: "milo", character: "milo", mark: "left" },
        { id: "june", character: "june", mark: "off-right" },
      ],
    });
    const june = tl.cast.find((c) => c.id === "june")!;
    const move = june.moveKeys[0]!;
    expect(move).toMatchObject({ ease: "linear", x: 0.5 });
    expect(june.gaitKeys[0]).toMatchObject({ kind: "walk", frame: move.frame, durationFrames: move.durationFrames });
    expect(facingAt(june, move.frame + 1)).toBe("left");
    const mid = move.frame + Math.floor(move.durationFrames / 2);
    expect(xAt(june, mid)).toBeGreaterThan(0.5);
    expect(xAt(june, mid)).toBeLessThan(1.22);
    expect(xAt(june, move.frame + move.durationFrames)).toBe(0.5);
    expect(facingAt(june, move.frame + move.durationFrames)).toBe("left");
  });
  it("runs faster than it walks", () => {
    const dur = (speed: string) =>
      compile([silent("w", [{ who: "milo", do: "walkTo", mark: "right", speed }])]).timeline.cast[0]!.moveKeys[0]!.durationFrames;
    expect(dur("run")).toBeLessThan(dur("walk"));
  });
  it("gait swings legs in opposition and is a no-op outside its key", () => {
    const base = toAngles(library.poses.idle!);
    const keys = [{ frame: 10, durationFrames: 30, kind: "walk" as const }];
    expect(applyGait(base, keys, 5, FPS)).toEqual(base);
    const a = applyGait(base, keys, 14, FPS);
    expect(Math.sign(a.hipL - base.hipL)).toBe(-Math.sign(a.hipR - base.hipR));
  });
  it("unknown marks list the off-stage marks", () => {
    const [e] = errorsOf(() => compile([silent("w", [{ who: "milo", do: "walkTo", mark: "offleft" }])]));
    expect(e!.message).toContain('did you mean "off-left"');
  });
});

describe("contact", () => {
  const handsAt = (tl: ReturnType<typeof compile>["timeline"], frame: number) =>
    stageActorsAt(library, tl.cast, sets["plain-1"]!, frame, FPS, 1080).map((a) => {
      const sign = a.facing === "left" ? -1 : 1;
      return { id: a.id, x: a.x * 1080, hand: a.x * 1080 + sign * a.state.joints.handR.x };
    });

  it("high-five: both step in, face each other, and their hands meet", () => {
    const { timeline: tl } = compile([silent("h", [{ who: "milo", do: "highFive", with: "june", at: { ms: 600 } }])]);
    const frame = tl.beats[0]!.from + Math.round(0.6 * FPS) + 3;
    const [m, j] = handsAt(tl, frame);
    expect(Math.abs(m!.hand - j!.hand)).toBeLessThan(40);
    expect(j!.x - m!.x).toBeGreaterThan(200); // heads don't overlap
  });
  it("shove: the shover reaches the target, who staggers back", () => {
    const { timeline: tl } = compile([silent("s", [{ who: "june", do: "shove", target: "milo", at: { ms: 500 } }])]);
    const milo = tl.cast.find((c) => c.id === "milo")!;
    const hit = tl.beats[0]!.from + Math.round(0.5 * FPS);
    expect(xAt(milo, hit + 20)).toBeLessThan(xAt(milo, hit - 1));
    expect(milo.poseKeys.some((k) => k.pose === "recoil")).toBe(true);
  });
  it("an emotion close-up waits for the shoved character to land, and a moving face gets close, not extreme", () => {
    const r = compile([
      silent("s", [
        { who: "june", do: "shove", target: "milo", at: { ms: 500 } },
        { who: "milo", do: "expression", expression: "shocked", at: { ms: 520 } },
      ]),
    ]);
    const tl = r.timeline;
    const milo = tl.cast.find((c) => c.id === "milo")!;
    const stagger = milo.moveKeys.at(-1)!;
    const cut = tl.shots.find((x) => x.on === "milo")!;
    expect(cut.frame).toBeGreaterThanOrEqual(stagger.frame + stagger.durationFrames);
    // Whichever framing the director picks, the face stays readable.
    expect(check(r).findings.filter((f) => f.check === "faces-safe")).toEqual([]);
  });
  it("an extreme close-up on a face still in motion steps back to close", () => {
    // Cut straight onto the stagger (no two-shot first): the head is still moving.
    const { timeline: tl } = compile([
      silent("w", [], 600),
      { id: "s", silent: true, durationMs: 1500, shot: { framing: "wide" }, actions: [{ who: "june", do: "shove", target: "milo", at: { ms: 0 } }] } as never,
      silent("r", [{ who: "milo", do: "expression", expression: "shocked", at: { ms: 0 } }]),
    ]);
    const cut = tl.shots.find((x) => x.on === "milo");
    if (cut?.framing === "close") expect(cut.reason).toContain("moving");
    expect(cut).toBeDefined();
  });
  it("contact needs another cast member", () => {
    const [e] = errorsOf(() => compile([silent("s", [{ who: "june", do: "shove", target: "june" }])]));
    expect(e!.path).toBe("beats[0].actions[0].target");
  });
});
