import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library, musicLibrary, reactions, safeArea, series, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, fromPremise, parseSkit, SkitError, skitLines } from "../src/engine";
import { fakeVoice } from "./director-fixtures";

const premise = (t: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../src/data/templates", `${t}.json`), "utf8"));

const compile = (skit: unknown, music = false) => {
  const doc = parseSkit(skit);
  const lines = skitLines(doc).map((l) => ({ id: l.id, text: l.text, durationMs: 400 + l.text.split(/\s+/).length * 330 }));
  return compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions, safeArea, ...(music ? { music: musicLibrary } : {}) });
};

describe("formats", () => {
  for (const id of ["explainerlab", "familylab", "fablelab", "triolab", "thoughtlab", "musiclab"])
    it(`${id} compiles and passes the self-check`, () => {
      const skit = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../public/skits", id, "skit.json"), "utf8"));
      expect(checkSkit({ result: compile(skit, id === "musiclab"), lib: library, sets, safeArea }).errors).toBe(0);
    });

  it("a trio stands left, center, and right", () => {
    const skit = fromPremise(premise("trio"), library, sets);
    expect(skit.cast.map((c) => c.mark)).toEqual(["left", "center", "right"]);
    expect(checkSkit({ result: compile(skit), lib: library, sets, safeArea }).errors).toBe(0);
  });

  it("a fable sends Dash off as Moss lands the line", () => {
    const skit = fromPremise(premise("fable"), library, sets);
    const last = skit.beats!.at(-1)!;
    expect(last.speaker).toBe("moss");
    expect(last.actions).toEqual(expect.arrayContaining([expect.objectContaining({ who: "dash", do: "walkTo", mark: "off-right" })]));
  });

  it("family needs a kid, and fable is Dash then Moss", () => {
    const family = premise("family");
    expect(() => fromPremise({ ...family, cast: family.cast.map((c: { character: string }) => ({ ...c, character: "milo", id: c.character === "lila" ? "milo" : "june" })) }, library, sets)).toThrow(SkitError);
    expect(() => fromPremise({ ...premise("fable"), cast: [{ id: "milo", character: "milo" }, { id: "june", character: "june" }] }, library, sets)).toThrow(SkitError);
  });

  it("a thought shuts the mouth and captions the line in the narrator style", () => {
    const plain = fromPremise(premise("exchange"), library, sets);
    const skit = fromPremise(premise("exchange"), library, sets);
    skit.beats![2]!.voiceOver = true;
    const spoken = (s: ReturnType<typeof compile>) => s.timeline.cast.find((c) => c.id === "milo")!.speech.length;
    expect(spoken(compile(skit))).toBe(spoken(compile(plain)) - 1);
    const r = compile(skit);
    expect(r.timeline.pages.some((p) => p.narrator && p.text.includes("worse"))).toBe(true);
  });

  it("the room bed is ducked, and an unknown bed is an error", () => {
    const skit = { ...fromPremise(premise("exchange"), library, sets), music: "room" };
    expect(compile(skit, true).program.music).toEqual({ src: "music/room.wav", gain: 0.18, ducked: 0.05 });
    expect(() => compile({ ...skit, music: "nope" }, true)).toThrow(SkitError);
  });

  it("park fables names Moss and Dash", () => {
    expect(series["park-fables"]?.cast).toEqual(["moss", "dash"]);
    expect(series["park-fables"]?.homeSets).toEqual(["park-1", "park-2"]);
  });
});
