import { describe, expect, it } from "vitest";
import { library, reactions, sets, sfxLibrary } from "../src/data";
import { compileSkit, SkitError, skitLines, parseSkit, type Diagnostic, type SkitInput } from "../src/engine";
import { fakeVoice } from "./director-fixtures";

const doc = (scenes: SkitInput["scenes"], extra: Partial<SkitInput> = {}): SkitInput => ({
  schemaVersion: 1,
  meta: { title: "scenes" },
  cast: [
    { id: "milo", character: "milo", mark: "left" },
    { id: "june", character: "june", mark: "right" },
  ],
  scenes,
  ...extra,
});
const run = (skit: SkitInput) => {
  const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 1000 }));
  return compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions });
};
const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
  throw new Error("expected a SkitError");
};

const two = doc([
  { id: "a", set: "office-1", beats: [{ id: "a1", speaker: "milo", line: "One two three." }] },
  { id: "b", set: "park-1", transition: { type: "fade", durationMs: 400 }, beats: [{ id: "b1", speaker: "june", line: "Four five six." }] },
]);

describe("multi-scene skits", () => {
  it("joins scenes with overlapping transitions", () => {
    const r = run(two);
    const [a, b] = r.program.scenes;
    expect(r.scenes.map((s) => s.timeline.set)).toEqual(["office-1", "park-1"]);
    expect(b!.transitionIn).toEqual({ type: "fade", durationFrames: 12 });
    expect(b!.from).toBe(a!.timeline.durationInFrames - 12);
    expect(r.program.durationInFrames).toBe(b!.from + b!.timeline.durationInFrames);
  });
  it("the punchline is the last spoken beat of the whole skit", () => {
    const r = run(two);
    expect(r.scenes[0]!.timeline.beats.some((x) => x.punchline)).toBe(false);
    expect(r.scenes[1]!.timeline.beats.find((x) => x.id === "b1")!.punchline).toBe(true);
    expect(r.scenes[1]!.timeline.beats.some((x) => x.kind === "reaction")).toBe(true);
  });
  it("later scenes start after their transition; the POV card stays in scene one", () => {
    const r = run({ ...two, overlay: { pov: "POV: test" } });
    const b1 = r.scenes[1]!.timeline.beats[0]!;
    expect(b1.from).toBe(Math.round(((400 + 250) / 1000) * 30));
    expect(r.scenes[0]!.timeline.pov).toBeDefined();
    expect(r.scenes[1]!.timeline.pov).toBeUndefined();
  });
  it("scene cast overrides placement and can leave people out", () => {
    const r = run(doc([{ id: "a", set: "plain-1", cast: [{ id: "june", mark: "center" }], beats: [{ id: "a1", speaker: "june", line: "Just me." }] }]));
    expect(r.timeline.cast.map((c) => c.id)).toEqual(["june"]);
    expect(r.timeline.cast[0]!.x).toBe(0.5);
  });
  it("diagnostics point into the scene", () => {
    const bad = doc([{ id: "a", set: "plain-1", beats: [{ id: "a1", speaker: "milo", line: "Hi.", actions: [{ who: "milo", do: "pose", pose: "shurg" }] }] }]);
    const [e] = errorsOf(() => run(bad));
    expect(e!.path).toBe("scenes[0].beats[0].actions[0].pose");
  });
  it("beats and scenes are exclusive; beat ids are unique across scenes", () => {
    expect(errorsOf(() => parseSkit({ ...two, beats: [{ id: "x", silent: true }] }))[0]!.message).toContain("not both");
    const dup = doc([
      { id: "a", set: "plain-1", beats: [{ id: "x", silent: true }] },
      { id: "b", set: "plain-1", beats: [{ id: "x", silent: true }] },
    ]);
    expect(errorsOf(() => run(dup))[0]!.message).toContain('duplicate beat id "x"');
  });
});
