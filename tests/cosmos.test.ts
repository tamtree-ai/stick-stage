import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FIGURE_PARAMS } from "../src/engine/viz/params";
import { Progress, spreadLabels } from "../src/engine/viz/draw/cosmos";
import { themeFor } from "../src/engine/viz/theme";
import { getPalette } from "../src/engine/set/palettes";
import { Stage } from "../src/engine";
import { sets } from "../src/data";

const theme = themeFor(getPalette("nebula"));
const seg = (label: string, value: number, extra = {}) => ({ label, value, ...extra });
const draw = (params: unknown) =>
  renderToStaticMarkup(
    React.createElement("svg", null, React.createElement(Progress, { p: FIGURE_PARAMS.progress.parse(params), w: 900, h: 400, theme, reveal: 1, t: 0, unit: 1, fs: 30 })),
  );

describe("progress figure", () => {
  it("shares fill from the left in proportion to the total", () => {
    const svg = draw({ segments: [seg("atoms", 5), seg("dark matter", 27), seg("dark energy", 68)] });
    // 5 % of 900 px, then 27 % starting where atoms end.
    expect(svg).toContain('x="0" y="');
    expect(svg).toMatch(/width="45"/);
    expect(svg).toMatch(/x="45" y="[\d.]+" width="243"/);
    for (const t of ["5%", "27%", "68%", "atoms", "dark matter", "dark energy"]) expect(svg).toContain(t);
  });

  it("the readout waits for the first value (never \"0% read\")", () => {
    expect(draw({ segments: [seg("atoms", 0)], readout: "{0}% read" })).not.toContain("read");
    expect(draw({ segments: [seg("atoms", 5)], readout: "{0}% read" })).toContain("5% read");
  });

  it("draws ? marks and the you-are-here chip only when asked", () => {
    expect(draw({ segments: [seg("atoms", 5)] })).not.toContain("?");
    expect(draw({ segments: [seg("atoms", 5)], restAsk: 1 })).toContain("?");
    expect(draw({ segments: [seg("atoms", 5), seg("dm", 27, { ask: 1 })] })).toContain("?");
    expect(draw({ segments: [seg("atoms", 5)], here: { segment: 0 } })).toContain("you are here ↑");
  });

  it("rejects a label over 60 characters and more than 6 segments", () => {
    expect(FIGURE_PARAMS.progress.safeParse({ segments: Array.from({ length: 7 }, (_, i) => seg(`s${i}`, 1)) }).success).toBe(false);
  });

  it("spreads crowded labels apart and keeps them in the box", () => {
    const xs = spreadLabels([{ x: 20, w: 80 }, { x: 60, w: 120 }, { x: 890, w: 100 }], 900, 10);
    expect(xs[0]).toBe(40);
    expect(xs[1]! - 60).toBeGreaterThanOrEqual(xs[0]! + 40 + 10 - 1);
    expect(xs[2]).toBe(850);
  });
});

describe("nebula set", () => {
  it("wraps the cast in a light rim only on a palette that has one", () => {
    const html = (set: string) => renderToStaticMarkup(React.createElement(Stage, { set: sets[set]!, actors: [], width: 1080, height: 1920, frame: 0 }));
    expect(html("space-2")).toContain("feMorphology");
    expect(html("space-1")).not.toContain("feMorphology");
  });
});
