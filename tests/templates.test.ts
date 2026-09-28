import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, fromPremise, lastWordAnchor, parseSkit, SkitError, skitLines, TEMPLATES, type Diagnostic } from "../src/engine";
import { fakeVoice } from "./director-fixtures";

const premise = (t: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../src/data/templates", `${t}.json`), "utf8"));
const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics;
    throw e;
  }
  throw new Error("expected a SkitError");
};

describe("templates", () => {
  for (const t of TEMPLATES)
    it(`${t}: the placeholder premise stages into a skit that compiles and passes the self-check`, () => {
      const skit = fromPremise(premise(t), library, sets);
      const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 400 + l.text.split(/\s+/).length * 330 }));
      const result = compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions });
      const report = checkSkit({ result, lib: library, sets, safeArea });
      expect(report.findings.filter((f) => f.level === "error")).toEqual([]);
    });

  for (const set of Object.values(sets).filter((s) => s.aspect === "9:16"))
    it(`exchange in ${set.id}: stages, compiles and passes the self-check`, () => {
      const skit = fromPremise({ ...premise("exchange"), set: set.id }, library, sets);
      const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 400 + l.text.split(/\s+/).length * 330 }));
      const result = compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions });
      expect(skit.set).toBe(set.id);
      expect(checkSkit({ result, lib: library, sets, safeArea }).findings.filter((f) => f.level === "error")).toEqual([]);
    });

  it("exchange: roles drive expression, gestures and the punchline pause + slam", () => {
    const skit = fromPremise(premise("exchange"), library, sets);
    const [a, , c, d] = skit.beats!;
    expect(a!.expression).toBe("neutral");
    expect(c!.actions![0]).toMatchObject({ do: "pose", pose: "point" });
    expect(d).toMatchObject({ punchline: true, pauseBeforeMs: 450, text: [{ type: "slam", value: "OPTIONAL" }] });
  });
  it("interview: the host holds the mic and swings it to the guest", () => {
    const skit = fromPremise(premise("interview"), library, sets);
    expect(skit.cast[0]).toMatchObject({ holding: { prop: "mic" }, label: "reporter" });
    expect(skit.beats![1]!.actions!.at(-1)).toMatchObject({ who: "june", do: "pose", pose: "hold-out" });
  });
  it("me-vs-me needs labels; lines need a known speaker", () => {
    const p = premise("me-vs-me");
    expect(errorsOf(() => fromPremise({ ...p, cast: p.cast.map((c: object) => ({ ...c, label: undefined })) }, library, sets))[0]!.message).toContain("label");
    expect(errorsOf(() => fromPremise({ ...p, lines: [{ who: "mee", text: "Hi." }] }, library, sets))[0]!.message).toContain('did you mean "me"');
  });
  it("last-word anchors survive punctuation and repeats", () => {
    expect(lastWordAnchor("Fine. I'm fine. Totally FINE!")).toEqual({ word: "fine", occurrence: 3 });
  });

  it("scenes: beat ids and roles run across the skit, and each scene sits on its own set", () => {
    const skit = fromPremise(
      {
        schemaVersion: 1,
        template: "exchange",
        title: "Two rooms",
        pov: "POV: the move",
        cast: [
          { id: "milo", character: "milo" },
          { id: "june", character: "june" },
        ],
        scenes: [
          { set: "office-1", lines: [{ who: "milo", text: "The desk is the setup." }, { who: "june", text: "It gets worse here." }] },
          { set: "park-1", pov: "POV: outside", lines: [{ who: "milo", text: "The bench is worse." }, { who: "june", text: "The punchline lands.", slam: "LANDS" }] },
        ],
      },
      library,
      sets,
    );
    expect(skit.beats).toBeUndefined();
    expect(skit.scenes?.map((s) => s.set)).toEqual(["office-1", "park-1"]);
    expect(skit.scenes?.flatMap((s) => s.beats.map((b) => b.id))).toEqual(["l1", "l2", "l3", "l4"]);
    expect(skit.scenes?.[0]?.beats[0]).toMatchObject({ expression: "neutral" });
    expect(skit.scenes?.[0]?.beats[1]?.punchline).toBeUndefined();
    expect(skit.scenes?.[1]?.beats[1]).toMatchObject({ punchline: true, text: [{ type: "slam", value: "LANDS" }] });
    expect(skit.scenes?.[0]?.pov).toBe("POV: the move");
    expect(skit.scenes?.[1]?.pov).toBe("POV: outside");
    expect(skit.scenes?.[0]?.cast).toEqual([expect.objectContaining({ id: "milo", seated: true }), { id: "june" }]);
    expect(skit.scenes?.[1]?.cast).toEqual([
      expect.objectContaining({ id: "milo", seated: true }),
      expect.objectContaining({ id: "june", seated: true }),
    ]);
    expect(skit.cast.every((c) => !("seated" in c) || !c.seated)).toBe(true);
    const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 800 }));
    const result = compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions });
    expect(checkSkit({ result, lib: library, sets, safeArea }).findings.filter((f) => f.level === "error")).toEqual([]);
  });
});
