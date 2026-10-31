import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, series, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, deliveryFor, parseSkit, SkitError, skitLines, verdictValueAt, wordingChecks, type CheckReport } from "../src/engine";
import { compile, skitOf } from "./director-fixtures";

/** "Who's Wrong?": the verdict meter, the argument style's fast pace, and the wording checks. */

const check = (r: ReturnType<typeof compile>): CheckReport => checkSkit({ result: r, lib: library, sets, safeArea });
const checks = (r: CheckReport, level = "warning") => r.findings.filter((f) => f.level === level).map((f) => f.check);

const fight = [
  { id: "a", speaker: "milo", line: "Let's just split it evenly.", verdict: 45 },
  { id: "b", speaker: "june", line: "I had a side salad.", verdict: 70 },
  { id: "c", speaker: "milo", line: "One was a sharing steak—" },
  { id: "d", speaker: "june", line: "You didn't share it!", verdict: 80 },
  { id: "e", speaker: "milo", line: "Your birthday. You had the lobster.", verdict: 48 },
];
const meter = { overlay: { verdict: {}, subtitles: true } };

describe("verdict meter", () => {
  it("keys the meter at the end of each line that moves it, from the start value", () => {
    const tl = compile(fight, meter).timeline;
    const v = tl.verdict!;
    expect(v.sides.map((s) => s.name)).toEqual(["MILO", "JUNE"]);
    expect(v.keys.map((k) => k.value)).toEqual([50, 45, 70, 80, 48]);
    const b = tl.beats.find((x) => x.id === "b")!;
    expect(v.keys[2]!.frame).toBe(b.audioTo);
    expect(v.intro).toBe(true);
  });

  it("asks for comments from the end of the punchline", () => {
    const tl = compile(fight, meter).timeline;
    const punch = tl.beats.find((b) => b.punchline)!;
    expect(tl.verdict!.askFrom).toBe(punch.audioTo);
    expect(tl.verdict!.ask).toBe("Comment: MILO or JUNE?");
  });

  it("tips with an overshoot and settles on the key", () => {
    const keys = [{ frame: 0, value: 50 }, { frame: 10, value: 80 }];
    expect(verdictValueAt(keys, 5)).toBe(50);
    expect(verdictValueAt(keys, 18)).toBeGreaterThan(80);
    expect(verdictValueAt(keys, 40)).toBe(80);
  });

  it("drops a POV card under the meter, with a warning", () => {
    const r = compile(fight, { overlay: { verdict: {}, pov: "POV: the bill arrives", subtitles: true } });
    expect(r.timeline.pov).toBeUndefined();
    expect(r.warnings.map((w) => w.code)).toContain("verdict-top");
  });

  it("refuses a side that isn't in the cast", () => {
    expect(() => compile(fight, { overlay: { verdict: { sides: ["milo", "gus"] }, subtitles: true } })).toThrow(SkitError);
  });

  it("carries the meter into the next scene without the stamp", () => {
    const { skit, voice } = skitOf(fight, meter);
    const scenes = [
      { id: "one", beats: fight.slice(0, 2) },
      { id: "two", beats: fight.slice(2) },
    ];
    const r = compileSkit({ skit: { ...skit, beats: undefined, scenes }, voice, lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
    const second = r.scenes[1]!.timeline.verdict!;
    expect(second.intro).toBe(false);
    expect(second.keys[0]!.value).toBe(70);
  });
});

describe("argument style", () => {
  it("answers a cut-off line with no gap", () => {
    const tl = compile(fight, { style: "argument" }).timeline;
    const c = tl.beats.find((b) => b.id === "c")!;
    const d = tl.beats.find((b) => b.id === "d")!;
    expect(d.audioFrom).toBe(c.audioTo);
  });

  it("voices lines fast: quicker, with under half the pauses", () => {
    const doc = parseSkit(compile(fight, { style: "argument" }).doc);
    const lines = skitLines(doc);
    expect(lines.every((l) => l.pace === "fast")).toBe(true);
    const slow = deliveryFor({ expression: "angry" });
    const fast = deliveryFor({ expression: "angry", pace: "fast" });
    expect(fast.speed).toBeGreaterThan(slow.speed);
    expect(fast.pauseScale).toBeLessThan(slow.pauseScale / 2);
  });

  it("takes the pace from the series when the skit names none", () => {
    const doc = parseSkit({ ...compile(fight).doc, meta: { title: "t", series: { id: "whos-wrong", season: 1, episode: 1 } } });
    expect(skitLines(doc, [], series)[0]!.pace).toBe("fast");
    expect(skitLines(doc)[0]!.pace).toBeUndefined();
  });

  it("flags dead air and slow talking only on a fast-paced skit", () => {
    const slow = fight.map((b, i) => (i === 1 ? { ...b, pauseBeforeMs: 900 } : b));
    expect(checks(check(compile(slow, { style: "argument" })))).toContain("dead-air");
    expect(checks(check(compile(slow)))).not.toContain("dead-air");
    // The fixture voice talks at 180 wpm, so the rate check passes it.
    expect(checks(check(compile(fight, { style: "argument" })))).not.toContain("speech-rate");
  });
});

describe("wording", () => {
  it("flags model phrases on any skit, and long lines on a fast one", () => {
    const beats = [
      { id: "a", speaker: "milo", line: "Fun fact: it turns out the bill is shared." },
      { id: "b", speaker: "june", line: "I do not think that a shared bill is fair to people who only had a side salad today." },
    ].map((b) => ({ ...b, silent: false, actions: [], sfx: [], text: [], figures: [], audio: { source: "tts" as const } }));
    const f = wordingChecks(beats, true);
    expect(f.find((x) => x.check === "ai-wording")?.message).toMatch(/fun fact.*turns out/);
    expect(f.map((x) => x.check)).toContain("line-length");
    expect(f.find((x) => x.check === "stiff-wording")?.message).toContain("don't");
    expect(wordingChecks(beats, false).map((x) => x.check)).not.toContain("line-length");
  });
});
