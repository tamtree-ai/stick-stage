import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, series, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, docBeats, parseSkit, ScreenTextSchema, SignTextSchema, SkitError, stageActorsAt, type Diagnostic } from "../src/engine";
import { postManifest } from "../src/node";
import { applyPartLabels } from "../src/engine/set/labels";
import { fakeVoice } from "./director-fixtures";
import { ROOT } from "./server-fixtures";

const errorsOf = (fn: () => unknown): Diagnostic[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
  throw new Error("expected a SkitError");
};

describe("joke text and series", () => {
  it("rejects a fourth screen line and a two-line sign", () => {
    expect(ScreenTextSchema.safeParse("ONE\nTWO\nTHREE\nFOUR").success).toBe(false);
    expect(ScreenTextSchema.safeParse("ONE\nTWO").success).toBe(true);
    expect(SignTextSchema.safeParse("OUR\nFAULT").success).toBe(false);
    expect(SignTextSchema.safeParse("OUR FAULT").success).toBe(true);
  });

  it("a hold replaces the sign's words, and a drop keeps them", () => {
    const skit = {
      schemaVersion: 2,
      meta: { title: "sign" },
      set: "plain-1",
      cast: [
        { id: "milo", character: "milo", mark: "left", holding: { prop: "sign", text: "HELP" } },
        { id: "june", character: "june", mark: "right" },
      ],
      beats: [
        {
          id: "a",
          speaker: "milo",
          line: "Read the sign.",
          actions: [
            { who: "milo", do: "hold", prop: "sign", text: "OUR FAULT", at: { word: "sign" } },
            { who: "milo", do: "drop", at: { fraction: 1 } },
          ],
        },
      ],
    };
    const voice = fakeVoice([{ id: "a", text: "Read the sign.", durationMs: 1200 }]);
    const r = compileSkit({ skit, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
    const frame = r.timeline.durationInFrames - 1;
    const milo = stageActorsAt(library, r.timeline.cast, sets[r.timeline.set]!, frame, r.timeline.fps, r.timeline.width).find((a) => a.id === "milo")!;
    expect(milo.state.props.dropped[0]?.def.text).toBe("OUR FAULT");
    expect(r.warnings.some((w) => w.code === "prop-text")).toBe(false);
  });

  it("screen copy on a phone is a warning, and a missing part is an error", () => {
    const base = {
      schemaVersion: 2,
      meta: { title: "bad" },
      set: "plain-1",
      cast: [
        { id: "milo", character: "milo", mark: "left" },
        { id: "june", character: "june", mark: "right" },
      ],
      beats: [{ id: "a", speaker: "milo", line: "Hi.", actions: [{ who: "milo", do: "hold", prop: "phone", screen: "NO", at: { ms: 0 } }] }],
    };
    const voice = fakeVoice([{ id: "a", text: "Hi.", durationMs: 800 }]);
    const warned = compileSkit({ skit: base, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
    expect(warned.warnings.some((w) => w.code === "prop-screen")).toBe(true);
    const missing = errorsOf(() =>
      compileSkit({ skit: { ...base, labels: [{ part: "board", text: "NO" }] }, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea }),
    );
    expect(missing.some((d) => d.code === "label-part")).toBe(true);
  });

  it("paints a label onto the matching part and leaves the shared set alone", () => {
    const board = sets["classroom-1"]!.layers.find((p) => p.part === "board")!;
    expect(board.text).toBeUndefined();
    expect(applyPartLabels(board, [{ part: "board", text: "POP QUIZ" }]).text).toBe("POP QUIZ");
    expect(board.text).toBeUndefined();
  });

  it("the sign lab compiles, passes the check, and names its episode", () => {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, "public/skits/signlab/skit.json"), "utf8"));
    const doc = parseSkit(json);
    const voice = fakeVoice(docBeats(doc).flatMap((b) => (b.line ? [{ id: b.id, text: b.line, durationMs: 1400 }] : [])));
    const r = compileSkit({ skit: json, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
    expect(r.warnings.filter((w) => w.level === "error")).toEqual([]);
    expect(checkSkit({ result: r, lib: library, sets, safeArea }).errors).toBe(0);
    expect(r.scenes.map((s) => s.timeline.labels?.map((l) => l.part))).toEqual([["board"], ["desk"], ["tv"]]);
    const milo = r.scenes[0]!.timeline.cast.find((c) => c.id === "milo")!;
    expect(milo.propKeys[0]).toMatchObject({ prop: "laptop", screen: "NO\nSIGNAL" });
    expect(postManifest({ skit: "signlab", doc, program: r.program }).series).toEqual({ id: "milo-june", season: 1, episode: 1 });
    expect(series["milo-june"]?.cast).toEqual(["milo", "june"]);
  });
});
