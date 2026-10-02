import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { images, library, pronunciations, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import {
  approvalStatus,
  checkSkit,
  compileExpr,
  compileFigures,
  compileSkit,
  contentHash,
  estimateWords,
  evalFigure,
  exprError,
  FigureCueSchema,
  FigureSchema,
  fromPremise,
  keplerPosition,
  mapSpokenToCaption,
  parseSkit,
  pronunciationsFor,
  skitLines,
  sourcesText,
  tally,
  themeContrast,
  themeFor,
  visViva,
  PALETTES,
  type Diagnostic,
} from "../src/engine";
import { typeset } from "../src/node/equations";
import { compile, fakeVoice } from "./director-fixtures";

const premise = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../src/data/templates/myth-flip.json"), "utf8"));
const W = 1080;
const H = 1920;

const figs = (figures: unknown[], cues: { cue: unknown; frame: number }[] = []) => {
  const diags: Diagnostic[] = [];
  const out = compileFigures({
    figures: figures.map((f) => FigureSchema.parse(f)),
    cues: cues.map((c, i) => ({ cue: FigureCueSchema.parse(c.cue), frame: c.frame, path: `cues[${i}]` })),
    fps: 30,
    width: W,
    height: H,
    lib: { equations: {}, images },
    diags,
    pathOf: (i) => `figures[${i}]`,
  });
  return { ...out, diags };
};

describe("expressions", () => {
  it("evaluates maths with variables, implicit multiplication and functions", () => {
    expect(compileExpr("0.5*g*x^2")({ g: 9.8, x: 2 })).toBeCloseTo(19.6);
    expect(compileExpr("2x + 1")({ x: 3 })).toBe(7);
    expect(compileExpr("-2^2")({})).toBe(-4);
    expect(compileExpr("sin(pi/2) + exp(0)")({})).toBeCloseTo(2);
  });
  it("names the problem in bad or unsafe input", () => {
    expect(exprError("x +")).toBeTruthy();
    expect(exprError("alert(1)")).toBeTruthy();
    expect(exprError("y*2", ["x"])).toContain('"y"');
  });
});

describe("physics", () => {
  it("a Kepler orbit speeds up near the star (equal areas), and vis-viva agrees", () => {
    const e = 0.6;
    const step = (p: number) => {
      const a = keplerPosition(p, e);
      const b = keplerPosition(p + 0.001, e);
      return Math.hypot(b.x - a.x, b.y - a.y);
    };
    expect(step(0) / step(0.5)).toBeCloseTo(((1 + e) / (1 - e)), 1);
    expect(visViva(1 - e) / visViva(1 + e)).toBeCloseTo((1 + e) / (1 - e), 5);
  });
  it("1000 seeded dice come out near 1/6 each", () => {
    const counts = tally("t", "dice", 1000, 6, 6);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1000);
    for (const c of counts) expect(Math.abs(c / 1000 - 1 / 6)).toBeLessThan(0.05);
  });
});

describe("figures", () => {
  const drop = { id: "drop", kind: "plot", params: { x: [0, 2], y: [0, 20] }, state: "myth", states: { myth: { label: "Heavy", series: [{ fn: "7*x^2" }] }, truth: { label: "Same", series: [{ fn: "4.9*x^2" }] } } };
  it("a strike state change keeps the old state as a struck ghost, then the new one", () => {
    const { tracks, diags } = figs([drop], [{ frame: 30, cue: { do: "state", id: "drop", state: "truth", style: "strike" } }]);
    expect(diags).toEqual([]);
    const t = tracks[0]!;
    expect(evalFigure(t, 10, 30).label).toBe("Heavy");
    const after = evalFigure(t, 80, 30);
    expect(after.label).toBe("Same");
    expect(after.ghost?.label).toBe("Heavy");
  });
  it("set cues tween numbers", () => {
    const { tracks } = figs([{ id: "h", kind: "histogram", params: { n: 0 } }], [{ frame: 0, cue: { do: "set", id: "h", params: { n: 1000 }, durationMs: 1000 } }]);
    const n = (f: number) => evalFigure(tracks[0]!, f, 30).params.n as number;
    expect(n(15)).toBeGreaterThan(0);
    expect(n(15)).toBeLessThan(1000);
    expect(n(40)).toBe(1000);
  });
  it("checks params per kind with a path, and unknown figures and states", () => {
    const { diags } = figs([{ id: "w", kind: "wave", params: { mode: "spiral" } }], [{ frame: 0, cue: { do: "show", id: "nope" } }]);
    expect(diags.map((d) => d.code)).toEqual(["figure-params", "unknown-figure"]);
    expect(diags[0]!.path).toBe("figures[0].params.mode");
  });
  it("a callout resolves another figure's anchor; an image carries its credit", () => {
    const { tracks, credits, diags } = figs([
      { id: "orbit", kind: "orbit", params: { e: 0.5 } },
      { id: "c", kind: "callout", params: { text: "fast", target: "orbit.perihelion" } },
      { id: "img", kind: "image", params: { image: "pillars-webb" } },
    ]);
    expect(diags).toEqual([]);
    expect(Array.isArray(tracks[1]!.base.target)).toBe(true);
    expect(credits[0]!.text).toContain("NASA, ESA, CSA, STScI");
  });
  it("a figure shown, hidden and shown again is on screen both times, with its credit each time", () => {
    const { tracks, credits, diags } = figs(
      [{ id: "img", kind: "image", params: { image: "pillars-webb" } }],
      [
        { frame: 60, cue: { do: "hide", id: "img" } },
        { frame: 200, cue: { do: "show", id: "img" } },
      ],
    );
    expect(diags).toEqual([]);
    const on = (f: number) => evalFigure(tracks[0]!, f, 30).visible;
    expect([on(30), on(120), on(220)]).toEqual([true, false, true]);
    expect(credits.map((c) => [c.from, c.to])).toEqual([[0, 69], [200, Number.MAX_SAFE_INTEGER]]);
  });
  it("an equation with no cache is a warning; with a cache that lacks it, an error", () => {
    const eq = { id: "e", kind: "equation", params: { tex: "E = mc^2" } };
    expect(figs([eq]).diags.length).toBe(1);
    const diags: Diagnostic[] = [];
    compileFigures({ figures: [FigureSchema.parse(eq)], cues: [], fps: 30, width: W, height: H, lib: { equations: {} }, diags, pathOf: (i) => `figures[${i}]` });
    expect(diags[0]!.level).toBe("error");
  });
  it("MathJax splits tagged terms into their own parts, with boxes", () => {
    const t = typeset("E = \\class{t-mass}{m}\\class{t-c}{c^2}");
    expect(t.parts.map((p) => p.cls).filter(Boolean)).toEqual(["t-mass", "t-c"]);
    expect(t.parts.every((p) => p.box[2] > 0 && p.box[3] > 0)).toBe(true);
    expect(() => typeset("\\frac{a")).toThrow(/TeX error/);
  });
  it("a figure change gets the wide shot; a look can target a figure", () => {
    const r = compile(
      [
        { id: "a", speaker: "milo", line: "Look at this graph here.", figures: [{ do: "show", id: "g" }], actions: [{ who: "milo", do: "look", to: "figure:g.origin" }] },
        { id: "b", speaker: "june", line: "Nice." },
      ],
      { figures: [{ id: "g", kind: "plot", hidden: true, params: { series: [{ fn: "x" }] } }] },
    );
    expect(r.timeline.shots.some((s) => s.framing === "wide" && s.reason === "wide for the figure")).toBe(true);
    expect(r.timeline.figures?.[0]?.spans[0]?.show.frame).toBeGreaterThan(0);
  });
});

describe("science sets", () => {
  it("every palette keeps dark outlines ≥ 3:1, and figures readable on it", () => {
    for (const id of ["deep-space", "void", "blueprint", "lab-white"]) expect(themeContrast(themeFor(PALETTES[id]!), PALETTES[id]!), id).toBeGreaterThanOrEqual(3);
  });
});

describe("myth-flip", () => {
  const skit = fromPremise(premise, library, sets);
  it("stages roles: takeaway is the punchline, the skeptic concedes, claims carry over", () => {
    const beats = skit.beats!;
    expect(beats.map((b) => b.role)).toEqual(["myth", "pushback", "prediction", "demo", "reaction", "why", "why-it-felt-true", "takeaway"]);
    expect(beats[7]).toMatchObject({ punchline: true });
    expect(beats[4]!.actions).toContainEqual(expect.objectContaining({ do: "gag", gag: "concede" }));
    expect(skit.claims?.length).toBe(2);
    expect(skit.cast[0]).toMatchObject({ pose: "arms-crossed" });
  });
  it("compiles, passes the self-check, and warns until approved", () => {
    const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 400 + l.text.split(/\s+/).length * 330 }));
    const r = compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions, figures: { images } });
    expect(checkSkit({ result: r, lib: library, sets, safeArea }).findings.filter((f) => f.level === "error")).toEqual([]);
    expect(r.warnings.map((w) => w.code)).toContain("approval-unapproved");
  });
  it("warns on a number with no claim, and a myth-flip with no why-it-felt-true", () => {
    const p = { ...premise, claims: [], lines: premise.lines.filter((l: { role: string }) => l.role !== "why-it-felt-true").map((l: { role: string; text: string }) => (l.role === "myth" ? { ...l, text: "Heavy things fall 10 times faster." } : l)) };
    const s = fromPremise(p, library, sets);
    const lines = skitLines(parseSkit(s)).map((l) => ({ id: l.id, text: l.text, durationMs: 2000 }));
    const codes = compileSkit({ skit: s, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions }).warnings.map((w) => w.code);
    expect(codes).toEqual(expect.arrayContaining(["claim-missing", "why-it-felt-true"]));
  });
});

describe("approval", () => {
  const base = { ...fromPremise(premise, library, sets), claims: [{ text: "g is 9.8 m/s²", source: "OpenStax", checkedBy: "owner", beats: [] }] };
  it("is pinned to the content: key order doesn't matter, an edit does", () => {
    const approved = { ...base, approval: { approvedBy: "owner", hash: contentHash(base), at: "2026-10-02" } };
    expect(approvalStatus(approved).ok).toBe(true);
    const reordered = Object.fromEntries(Object.entries(approved).reverse());
    expect(approvalStatus(reordered).ok).toBe(true);
    const edited = { ...approved, beats: approved.beats!.map((b, i) => (i === 0 ? { ...b, line: "Heavy things fall slower." } : b)) };
    expect(approvalStatus(edited)).toMatchObject({ ok: false, reason: "changed" });
  });
  it("unchecked claims block it, and sources.txt lists claims, simplifications and credits", () => {
    const s = { ...base, claims: [{ text: "x", source: "y", checkedBy: null, beats: [] }] };
    expect(approvalStatus({ ...s, approval: { approvedBy: "o", hash: contentHash(s), at: "2026-10-02" } })).toMatchObject({ reason: "unchecked-claims" });
    const txt = sourcesText(parseSkit({ ...premise.claims ? fromPremise(premise, library, sets) : base }), [images["pillars-webb"]!]);
    expect(txt).toContain("OpenStax");
    expect(txt).toContain("Simplifications");
    expect(txt).toContain("cc-by-4.0");
  });
});

describe("voice: spoken text and pronunciations", () => {
  it("maps spoken timings back onto symbol captions", () => {
    const words = mapSpokenToCaption("E = mc², and that is it", estimateWords("E equals m c squared, and that is it", 3000), 3000);
    expect(words.map((w) => w.text)).toEqual(["E =", "mc²,", "and", "that", "is", "it"]);
    for (let i = 1; i < words.length; i++) expect(words[i]!.startMs).toBeGreaterThanOrEqual(words[i - 1]!.startMs);
  });
  it("lists the spoken form and pronunciation hints per line; the caption stays the script", () => {
    const { skit } = { skit: { schemaVersion: 2, meta: { title: "t" }, set: "void-1", cast: [{ id: "vera", character: "vera", mark: "left" }, { id: "gus", character: "gus", mark: "right" }], beats: [{ id: "a", speaker: "vera", line: "ħ = h / 2π, said Schrödinger.", spoken: "h-bar equals h over two pi, said Schrödinger." }] } };
    const [l] = skitLines(parseSkit(skit), pronunciations);
    expect(l).toMatchObject({ text: "ħ = h / 2π, said Schrödinger.", spoken: "h-bar equals h over two pi, said Schrödinger." });
    expect(l!.pronounce?.[0]?.say).toBe("SHROH-ding-er");
    expect(pronunciationsFor("two muons", pronunciations).map((p) => p.word)).toEqual(["muons"]);
  });
});
