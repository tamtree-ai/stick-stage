import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, planSegments, postText, SkitError, type SkitInput } from "../src/engine";
import { binSegments } from "../lambda/fanout";
import { bindData, parseSpoken, spokenMatches } from "../src/engine/director/data";
import { stamp } from "../src/engine/director/explainer";
import { cameraAt } from "../src/engine/director/camera";
import { BarChart, Counter, LineChart } from "../src/engine/viz/draw/data";
import { MapFig } from "../src/engine/viz/draw/map";
import { viewOf } from "../src/engine/viz/map";
import { FIGURE_PARAMS } from "../src/engine/viz/params";
import { themeFor } from "../src/engine/viz/theme";
import { getPalette } from "../src/engine/set/palettes";
import { fingerprint, sameness, samenessChecks, varietyChecks } from "../src/engine/qa/variety";
import { fakeVoice } from "./director-fixtures";

const sample = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../public/skits/costco-margins/skit.json"), "utf8")) as SkitInput;
const words = (s: string) => s.split(/\s+/).length;
const voiceOf = (skit: SkitInput) =>
  fakeVoice((skit.scenes ?? [{ beats: skit.beats! }]).flatMap((sc) => sc.beats.flatMap((b) => (b.line ? [{ id: b.id, text: b.line, ...(b.spoken ? { spoken: b.spoken } : {}), durationMs: Math.max(900, (words(b.line) / 3) * 1000) }] : []))));
const run = (skit: SkitInput) => compileSkit({ skit, voice: voiceOf(skit), lib: library, sets, sfx: sfxLibrary, reactions, safeArea });
const errors = (skit: SkitInput) => {
  try {
    run(skit);
    return [];
  } catch (e) {
    if (e instanceof SkitError) return e.diagnostics.filter((d) => d.level === "error");
    throw e;
  }
};
const clone = (): SkitInput => JSON.parse(JSON.stringify(sample));

describe("explainer documents", () => {
  it("compile with no cast, 16:9 by default, with chapters and the explainer style", () => {
    const r = run(sample);
    expect(r.doc.meta.aspect).toBe("16:9");
    expect(r.program.width).toBe(1920);
    expect(r.program.format).toBe("explainer");
    expect(r.program.chapters?.map((c) => c.title)).toEqual(["The puzzle", "Thin margins", "The membership card", "Everywhere it goes"]);
    expect(r.program.chapters![0]!.frame).toBe(0);
    expect(r.scenes[0]!.timeline.directing?.id).toBe("explainer");
  });

  it("still needs a cast without the explainer format", () => {
    const plain = clone();
    delete plain.format;
    expect(errors(plain).length).toBeGreaterThan(0);
  });

  it("fails compile when a spoken number doesn't match its dataset", () => {
    const bad = clone();
    bad.scenes![1]!.beats[1]!.line = "Most supermarkets keep around 24 cents. Costco keeps about 19.";
    bad.scenes![1]!.beats[1]!.numbers![1]!.text = "19";
    const errs = errors(bad);
    expect(errs.map((d) => d.code)).toContain("number-mismatch");
    expect(errs.find((d) => d.code === "number-mismatch")!.path).toBe("scenes[1].beats[1].numbers[1]");
  });

  it("fails compile on a number the line doesn't say, and on a bad data reference", () => {
    const bad = clone();
    bad.scenes![1]!.beats[1]!.numbers![0]!.text = "25";
    bad.scenes![1]!.figures![0]!.params = { series: [{ data: "@margins.nope" }] };
    const codes = errors(bad).map((d) => d.code);
    expect(codes).toContain("number-not-said");
    expect(codes).toContain("data-ref");
  });

  it("binds datasets into figure params and credits the source while the figure shows", () => {
    const r = run(sample);
    const bars = r.scenes[1]!.timeline.figures!.find((f) => f.id === "bars")!;
    expect((bars.base.series as { data: unknown }[])[0]!.data).toEqual([["Costco", 12.6], ["Kroger", 22.3], ["Walmart", 24.1], ["Target", 28]]);
    expect(bars.sources).toEqual(["margins"]);
    expect(r.scenes[1]!.timeline.credits?.[0]?.text).toBe("Illustrative numbers, not real data");
    const counter = r.scenes[2]!.timeline.figures!.find((f) => f.id === "fee-now")!;
    expect(counter.base.value).toBe(4.83);
  });

  it("places figures by slot", () => {
    const r = run(sample);
    const line = r.scenes[2]!.timeline.figures!.find((f) => f.id === "fee-line")!;
    expect(line.rect.x).toBeCloseTo((0.27 - 0.2) * 1920);
    expect(line.rect.w).toBeCloseTo(0.4 * 1920);
  });

  it("pushes the camera in on a focus cue and back out on focus none", () => {
    const tl = run(sample).scenes[0]!.timeline;
    const [inKey, outKey] = tl.focus!;
    expect(cameraAt(tl, 0).scale).toBe(1);
    // Asked for 1.25; capped so the whole counter stays above the captions.
    const zoomed = cameraAt(tl, inKey!.frame + inKey!.durationFrames);
    expect(zoomed.scale).toBeGreaterThan(1.1);
    expect(zoomed.scale).toBeLessThanOrEqual(1.25);
    const rect = tl.figures!.find((f) => f.id === "price")!.rect;
    expect((rect.y + rect.h - zoomed.cy) * zoomed.scale + 540).toBeLessThanOrEqual(0.72 * 1080 + 1);
    expect(cameraAt(tl, outKey!.frame + outKey!.durationFrames).scale).toBeCloseTo(1);
  });

  it("resolves map zoom to a numeric view so set cues fly between places", () => {
    const map = run(sample).scenes[3]!.timeline.figures!.find((f) => f.id === "map")!;
    expect(map.base.view).toEqual(viewOf("world"));
    expect(map.keys[0]!.params.view).toEqual(viewOf(["USA", "CAN", "MEX"]));
    expect(viewOf("XXX")).toMatch(/no country/);
  });

  it("puts chapters and sources in the post text", () => {
    const r = run(sample);
    const txt = postText(r.doc, library, r.program);
    expect(txt).toMatch(/^0:00 The puzzle$/m);
    expect(txt).toMatch(/^\d:\d\d Thin margins$/m);
    expect(txt).toContain("Sources\nMade-up sample numbers [illustrative numbers]");
    expect(stamp(3725 * 30, 30)).toBe("1:02:05");
  });
});

describe("spoken numbers", () => {
  it("parses units and scales", () => {
    expect(parseSpoken("$4.2 billion")).toEqual({ n: 4.2, scale: 1e9, decimals: 1 });
    expect(parseSpoken("1,200 stores")).toEqual({ n: 1200, scale: 1, decimals: 0 });
    expect(parseSpoken("no number")).toBeUndefined();
  });
  it("matches by rounding, in units or in the column's scale", () => {
    expect(spokenMatches("13", 12.6)).toBe(true);
    expect(spokenMatches("12", 12.6)).toBe(false);
    expect(spokenMatches("4.8 billion", 4.83)).toBe(true);
    expect(spokenMatches("4.8 billion", 4.83e9)).toBe(true);
    expect(spokenMatches("12.6%", 12.6)).toBe(true);
  });
  it("binds a cell and a column", () => {
    const data = { d: { columns: ["k", "v"], rows: [["a", 1], ["b", null]], source: { name: "x" }, illustrative: false } };
    const used = new Set<string>();
    expect(bindData({ a: "@d.v", b: "@d.v[a]" }, data, "p", [], used)).toEqual({ a: [["a", 1]], b: 1 });
    expect(used).toEqual(new Set(["d"]));
  });
});

describe("variety rules", () => {
  it("pass on the sample, and report the fingerprint", () => {
    const r = run(sample);
    expect(varietyChecks(r.program).map((f) => `${f.frame} ${f.message}`)).toEqual([]);
    const report = checkSkit({ result: r, lib: library, sets, safeArea });
    expect(report.fingerprint?.kinds).toEqual(["counter", "label", "bars", "line", "counter", "map"]);
    expect(report.ran).toContain("sameness");
  });

  it("flag a video with one kind and long still stretches", () => {
    const dull = clone();
    for (const sc of dull.scenes!) {
      sc.figures = [{ id: "c", kind: "counter", slot: "center", params: { value: 1 } }];
      for (const b of sc.beats) b.figures = [];
    }
    const checks = varietyChecks(run(dull).program).map((f) => f.check);
    expect(checks).toContain("variety-kinds");
    expect(checks).toContain("variety-run");
  });

  it("warn when a video looks like one in the history", () => {
    const fp = fingerprint(run(sample).program);
    expect(sameness(fp, fp).score).toBeCloseTo(1);
    const found = samenessChecks(fp, [fp]);
    expect(found.map((f) => f.check)).toEqual(["sameness", "sameness"]);
    expect(samenessChecks(fp, [{ kinds: ["map"], layout: [], sets: ["x"], opening: ["map"] }])).toEqual([]);
  });
});

describe("data figures draw", () => {
  const theme = themeFor(getPalette("paper"));
  const svg = (el: React.ReactElement) => renderToStaticMarkup(React.createElement("svg", null, el));
  const base = { w: 900, h: 500, theme, reveal: 1, t: 0, unit: 1 };
  it("line: values and event labels", () => {
    const p = FIGURE_PARAMS.line.parse({ series: [{ data: [[2020, 1], [2021, 2.5]] }], unit: { prefix: "$", decimals: 1 }, events: [{ at: 2021, label: "launch" }] });
    const out = svg(React.createElement(LineChart, { ...base, p, fs: 30 }));
    expect(out).toContain("$2.5");
    expect(out).toContain("launch");
  });
  it("bars: sorted, highlighted, half grown mid-reveal", () => {
    const p = FIGURE_PARAMS.bars.parse({ series: [{ data: [["a", 10], ["b", 30]] }], sort: "desc", highlight: ["a"] });
    const out = svg(React.createElement(BarChart, { ...base, p, fs: 30 }));
    expect(out.indexOf(">b<")).toBeLessThan(out.indexOf(">a<"));
    expect(out).toContain(theme.highlight);
  });
  it("counter ticks from `from` to `value` over the reveal", () => {
    const p = FIGURE_PARAMS.counter.parse({ value: 100, unit: { suffix: "%" } });
    expect(svg(React.createElement(Counter, { ...base, p, reveal: 0.5 }))).toContain("50%");
  });
  it("map: every country, highlighted ones filled", () => {
    const p = FIGURE_PARAMS.map.parse({ highlight: ["FRA"] });
    const out = svg(React.createElement(MapFig, { ...base, p, fs: 30, id: "m" }));
    expect((out.match(/<path /g) ?? []).length).toBeGreaterThan(170);
    expect(out).toContain(theme.highlight);
  });
});

describe("fan-out segments", () => {
  it("cut long scene bodies into chunks that tile the program", () => {
    const r = run(sample);
    const whole = planSegments(r.program, "e");
    const chunked = planSegments(r.program, "e", {}, 120);
    expect(chunked.length).toBeGreaterThan(whole.length);
    expect(chunked.every((s) => s.frames[1] - s.frames[0] + 1 <= 120)).toBe(true);
    const frames = chunked.map((s) => s.frames).sort((a, b) => a[0] - b[0]);
    frames.forEach((f, i) => i > 0 && expect(f[0]).toBe(frames[i - 1]![1] + 1));
    expect(frames.at(-1)![1]).toBe(r.program.durationInFrames - 1);
    expect(new Set(chunked.map((s) => s.hash)).size).toBe(chunked.length);
  });

  it("balance segments over workers by frames", () => {
    const seg = (id: string, n: number) => ({ id, kind: "body" as const, frames: [0, n - 1] as [number, number], scenes: [], hash: id });
    const bins = binSegments([seg("a", 900), seg("b", 600), seg("c", 500), seg("d", 400)], 2);
    const load = bins.map((b) => b.reduce((n, s) => n + s.frames[1] + 1, 0));
    // Greedy: 900 | 600+500, then 400 onto the lighter → 1300 / 1100.
    expect(load.sort()).toEqual([1100, 1300]);
    expect(binSegments([seg("a", 10)], 8)).toHaveLength(1);
  });
});
