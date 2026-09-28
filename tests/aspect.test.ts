import { describe, expect, it } from "vitest";
import { castNotes, catalog, library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, draftPrompt, evalActor, faceFraming, frameShot, fromPremise, headInStage, parseBrief, parseSkit, SkitError, skitLines, WIDE_FACE_FRAMING, writerWorld, type StageActor } from "../src/engine";
import { fakeVoice } from "./director-fixtures";

const world = writerWorld(catalog, castNotes);
const W = 1920;
const H = 1080;

const exchange = (set: string) => ({
  schemaVersion: 1,
  template: "exchange" as const,
  aspect: "16:9" as const,
  title: "Across the room",
  pov: "POV: the wide room",
  hashtags: ["stickfigure"],
  set,
  cast: [
    { id: "reed", character: "reed" },
    { id: "nell", character: "nell" },
  ],
  lines: [
    { who: "reed", text: "Setup line: the hook, said in the first second.", role: "setup" as const },
    { who: "nell", text: "Answer line.", role: "setup" as const },
    { who: "reed", text: "Escalation line: it gets worse.", role: "escalation" as const },
    { who: "nell", text: "Punchline.", role: "punchline" as const, slam: "OPTIONAL" },
  ],
});

const compile = (skit: unknown) => {
  const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 400 + l.text.split(/\s+/).length * 330 }));
  return compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
};

const actor = (id: string, x: number, facing: "left" | "right"): StageActor => ({ id, x, facing, state: evalActor(library, { character: id, poseKeys: [{ frame: 0, pose: "idle" }], expressionKeys: [{ frame: 0, expression: "neutral" }] }, 0, 30, sets["wide-living"]!.figureHeightPx) });

describe("aspect", () => {
  it("offers exactly two frames, with cast and rooms that belong to each", () => {
    expect(catalog.aspects).toEqual([
      { id: "9:16", width: 1080, height: 1920, label: "Short" },
      { id: "16:9", width: 1920, height: 1080, label: "Widescreen" },
    ]);
    expect(
      catalog.characters
        .filter((c) => c.aspect === "16:9")
        .map((c) => c.id)
        .sort(),
    ).toEqual(["nell", "pip", "reed"]);
    expect(catalog.characters.filter((c) => c.aspect === "9:16").map((c) => c.id)).toEqual(expect.arrayContaining(["milo", "june"]));
    expect(catalog.sets.filter((s) => s.aspect === "16:9").map((s) => s.id)).toEqual(expect.arrayContaining(["wide-living", "wide-office", "wide-park", "wide-street", "wide-cafe", "wide-plain", "wide-lounge", "wide-classroom"]));
    expect(catalog.sets.find((s) => s.id === "living-1")?.aspect).toBe("9:16");
    expect(catalog.templates.find((t) => t.id === "exchange")?.defaultSets).toEqual({ "9:16": "living-1", "16:9": "wide-living" });
  });

  it("a brief picks one frame, and the other frame's cast and rooms are refused", () => {
    const wide = parseBrief(
      {
        topic: "a plan that already failed",
        aspect: "16:9",
        cast: [
          { id: "reed", character: "reed" },
          { id: "nell", character: "nell" },
        ],
        set: "wide-living",
      },
      world,
    );
    expect(wide.aspect).toBe("16:9");
    expect(() => parseBrief({ topic: "x", aspect: "16:9", cast: [{ id: "milo", character: "milo" }] }, world)).toThrow(SkitError);
    expect(() => parseBrief({ topic: "x", aspect: "9:16", cast: [{ id: "reed", character: "reed" }] }, world)).toThrow(SkitError);
    expect(() => parseBrief({ topic: "x", aspect: "16:9", cast: [{ id: "reed", character: "reed" }], set: "living-1" }, world)).toThrow(SkitError);
  });

  it("the draft prompt names only this frame's rooms", () => {
    const { system } = draftPrompt(
      parseBrief(
        {
          topic: "the long table",
          aspect: "16:9",
          cast: [
            { id: "reed", character: "reed" },
            { id: "nell", character: "nell" },
          ],
        },
        world,
      ),
      world,
    );
    expect(system).toContain("16:9 widescreen");
    expect(system).toContain("wide-living");
    expect(system).not.toContain("living-1");
    expect(system).toContain("states the plan");
  });

  it("a 16:9 skit renders at 1920×1080 on a wide room", () => {
    for (const set of Object.values(sets).filter((s) => s.aspect === "16:9")) {
      const skit = fromPremise(exchange(set.id), library, sets);
      expect(skit.set).toBe(set.id);
      const result = compile(skit);
      expect(result.program.width).toBe(1920);
      expect(result.program.height).toBe(1080);
      expect(result.doc.meta.aspect).toBe("16:9");
      expect(checkSkit({ result, lib: library, sets, safeArea }).errors).toBe(0);
    }
  });

  it("shorts characters stay off widescreen rooms, and the reverse", () => {
    expect(() => fromPremise({ ...exchange("living-1"), aspect: "16:9" }, library, sets)).toThrow(SkitError);
    expect(() =>
      fromPremise(
        {
          ...exchange("wide-living"),
          aspect: "9:16",
          cast: [
            { id: "milo", character: "milo" },
            { id: "june", character: "june" },
          ],
        },
        library,
        sets,
      ),
    ).toThrow(SkitError);
  });

  it("1920×1080 with no aspect key is a widescreen video; any other size is refused", () => {
    const base = { schemaVersion: 2, set: "wide-plain", cast: [{ id: "reed", character: "reed", mark: "center" }], beats: [{ id: "a", speaker: "reed", line: "Hello there." }] };
    expect(parseSkit({ ...base, meta: { title: "Wide", width: 1920, height: 1080 } }).meta).toMatchObject({ aspect: "16:9", width: 1920, height: 1080 });
    expect(parseSkit({ ...base, meta: { title: "Wide", aspect: "16:9" }, set: "wide-plain" }).meta).toMatchObject({ aspect: "16:9", width: 1920, height: 1080 });
    expect(() => parseSkit({ ...base, meta: { title: "Odd", width: 1000, height: 1000 } })).toThrow(/only two frames/);
  });

  it("face framings on 16:9 use the wide table and keep the head in frame", () => {
    const cast = [actor("reed", 0.28, "right"), actor("nell", 0.72, "left")];
    const groundY = sets["wide-living"]!.groundY;
    for (const a of cast) {
      for (const framing of ["medium", "close", "extreme"] as const) {
        const cam = frameShot({ framing, on: a.id }, cast, W, H, groundY);
        const { head, eyes, R } = headInStage(a, W, groundY);
        const spec = WIDE_FACE_FRAMING[framing];
        expect(faceFraming(W, H)).toBe(WIDE_FACE_FRAMING);
        expect((2 * R * cam.scale) / W).toBeCloseTo(spec.headWidth, 5);
        const eyeY = H / 2 + cam.scale * (eyes.y - cam.cy);
        expect(eyeY / H).toBeCloseTo(spec.eyeLine, 2);
        const cx = W / 2 + cam.scale * (head.x - cam.cx);
        expect(cx - R * cam.scale).toBeGreaterThan(0);
        expect(cx + R * cam.scale).toBeLessThan(W);
      }
    }
  });
});
