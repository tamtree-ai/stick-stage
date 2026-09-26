import { describe, expect, it } from "vitest";
import { EXPRESSION_IDS, library, POSE_IDS, sets } from "../src/data";
import { evalActor, FACE_FRAMING, frameShot, headInStage, type StageActor } from "../src/engine";

const W = 1080;
const H = 1920;
const set = sets["living-1"]!;

const actor = (id: string, x: number, facing: "left" | "right", pose = "idle"): StageActor => ({
  id,
  x,
  facing,
  state: evalActor(
    library,
    {
      character: id,
      poseKeys: [{ frame: 0, pose }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
    },
    0,
    30,
    set.figureHeightPx,
  ),
});

const cast = [actor("milo", 0.27, "right"), actor("june", 0.73, "left")];

/** Stage point → screen point under a camera (same transform as <Stage>). */
const toScreen = (cam: { scale: number; cx: number; cy: number }, p: { x: number; y: number }) => ({
  x: W / 2 + cam.scale * (p.x - cam.cx),
  y: H / 2 + cam.scale * (p.y - cam.cy),
});

describe("face framings", () => {
  for (const a of cast) {
    for (const framing of ["medium", "close", "extreme"] as const) {
      it(`${framing} on ${a.id}: head width, eye line, whole head in frame`, () => {
        const cam = frameShot({ framing, on: a.id }, cast, W, H, set.groundY);
        const { head, eyes, R } = headInStage(a, W, set.groundY);
        const spec = FACE_FRAMING[framing];
        expect((2 * R * cam.scale) / W).toBeCloseTo(spec.headWidth, 5);
        expect(toScreen(cam, eyes).y / H).toBeCloseTo(spec.eyeLine, 2);
        const c = toScreen(cam, head);
        expect(c.x - R * cam.scale).toBeGreaterThan(0);
        expect(c.x + R * cam.scale).toBeLessThan(W);
      });
    }
  }

  it("never shows past the stage edges", () => {
    for (const pose of POSE_IDS) {
      const edge = [actor("milo", 0.02, "right", pose), actor("june", 0.98, "left", pose)];
      for (const on of ["milo", "june"]) {
        for (const framing of ["medium", "close", "extreme", "two"] as const) {
          const cam = frameShot({ framing, on }, edge, W, H, set.groundY);
          const hw = W / (2 * cam.scale);
          const hh = H / (2 * cam.scale);
          expect(cam.cx - hw).toBeGreaterThanOrEqual(-1e-6);
          expect(cam.cx + hw).toBeLessThanOrEqual(W + 1e-6);
          expect(cam.cy - hh).toBeGreaterThanOrEqual(-1e-6);
          expect(cam.cy + hh).toBeLessThanOrEqual(H + 1e-6);
        }
      }
    }
  });

  it("two-shot keeps both heads in frame", () => {
    const cam = frameShot({ framing: "two" }, cast, W, H, set.groundY);
    for (const a of cast) {
      const p = toScreen(cam, headInStage(a, W, set.groundY).head);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(W);
    }
  });

  it("face shots need a subject", () => {
    expect(() => frameShot({ framing: "close" }, cast, W, H, set.groundY)).toThrow(/needs "on"/);
  });

  it("strong emotions carry a close-up hint", () => {
    for (const id of ["shocked", "crying", "cringe"])
      expect(library.expressions[id]!.closeup).toBe("extreme");
    for (const id of EXPRESSION_IDS) {
      const hint = library.expressions[id]!.closeup;
      if (hint) expect(["close", "extreme"]).toContain(hint);
    }
  });
});
