import { describe, expect, it } from "vitest";
import { library, safeArea, sets } from "../src/data";
import { checkSkit, contrastRatio, inside, subtitleRect, wrapLines, type CheckReport } from "../src/engine";
import { compile } from "./director-fixtures";

const check = (r: ReturnType<typeof compile>): CheckReport => checkSkit({ result: r, lib: library, sets, safeArea });
const ids = (r: CheckReport, level = "error") => r.findings.filter((f) => f.level === level).map((f) => f.check);

const exchange = [
  { id: "a", speaker: "milo", line: "Did you eat my lunch?" },
  { id: "b", speaker: "june", line: "Define eat.", expression: "smug" },
  { id: "c", speaker: "milo", line: "You're chewing right now.", expression: "annoyed" },
  { id: "d", speaker: "june", line: "Chewing is not eating.", expression: "deadpan" },
];

describe("self-check", () => {
  it("passes the director's default staging of an exchange", () => {
    const r = check(compile(exchange));
    expect(ids(r)).toEqual([]);
    expect(r.ran).toContain("faces-safe");
  });
  it("flags a punchline with no camera event", () => {
    const beats = exchange.map((b) => (b.id === "d" ? { ...b, shot: { framing: "two" as const } } : b));
    expect(ids(check(compile(beats)))).toContain("punchline-camera");
  });
  it("flags a punchline with no reaction beat after it", () => {
    const r = compile(exchange);
    const timeline = { ...r.timeline, beats: r.timeline.beats.filter((b) => b.kind !== "reaction") };
    const cut = { ...r, scenes: [{ ...r.scenes[0]!, timeline }], program: { ...r.program, scenes: [{ ...r.program.scenes[0]!, timeline }] } };
    expect(ids(check(cut))).toContain("punchline-reaction");
  });
  it("reaction: false opts the punchline out of the reaction rule", () => {
    const beats = exchange.map((b) => (b.id === "d" ? { ...b, reaction: false as const } : b));
    expect(ids(check(compile(beats)))).not.toContain("punchline-reaction");
  });
  it("flags a strong emotion in a silent beat whose shot the skit keeps on two", () => {
    const beats = [
      ...exchange.slice(0, 2),
      { id: "s", silent: true, durationMs: 1200, actions: [{ who: "milo", do: "expression" as const, expression: "shocked" }] },
      ...exchange.slice(2),
    ];
    const ok = check(compile(beats));
    expect(ok.findings.some((f) => f.check === "emotion-closeups" && f.level === "error")).toBe(false);
  });
});

describe("text layout + contrast", () => {
  it("wraps long text and keeps subtitle blocks in the safe area", () => {
    expect(wrapLines("one two three four five six seven eight", 74, 400).length).toBeGreaterThan(1);
    const { rect } = subtitleRect("Totally fine.", 1080, 1920, safeArea);
    const safe = { x: 0.04 * 1080, y: 0.14 * 1920, w: 0.84 * 1080, h: 0.56 * 1920 };
    expect(inside(rect, safe)).toBe(true);
  });
  it("WCAG contrast", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("safe-area profiles", async () => {
  const { safeAreaProfiles } = await import("../src/data");
  const { strictestSafeArea } = await import("../src/engine");
  it("safe-area.json is the strictest of the platform profiles (run pnpm safearea after measuring)", () => {
    expect(strictestSafeArea(safeAreaProfiles)).toEqual(safeArea);
  });
});
