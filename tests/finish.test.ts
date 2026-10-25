import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { library, sets } from "../src/data";
import { evalActor, Stage, type Finish, type StageActor } from "../src/engine";
import { compile } from "./director-fixtures";

const set = sets["wide-park"]!;
const actors: StageActor[] = ["biscuit", "pim", "vera"].map((character, i) => ({
  id: character,
  x: 0.25 + i * 0.25,
  facing: i ? "left" : "right",
  state: evalActor(library, { character, poseKeys: [{ frame: 0, pose: "wave" }], expressionKeys: [{ frame: 0, expression: "happy" }] }, 0, 30, set.figureHeightPx),
}));
const stage = (finish?: Finish) =>
  renderToStaticMarkup(React.createElement(Stage, { set, actors, width: 1920, height: 1080, frame: 0, ...(finish ? { finish } : {}) }));

describe("stage finish", () => {
  it("flat is the default and draws exactly what the stage drew before (channels keep their look)", () => {
    expect(stage("flat")).toBe(stage());
    expect(stage()).not.toMatch(/feTurbulence|feMorphology|feOffset/);
  });

  it("illustrated adds the figure line, part shading and the paper/grain overlay", () => {
    const m = stage("illustrated");
    expect(m).toMatch(/feOffset/);
    expect(m).not.toMatch(/feMorphology/); // slow in Chrome; the line is built from offsets
    expect(m).toMatch(/feTurbulence/);
    // per-part shading inside the shape rigs (head, near arm or front leg)
    expect((m.match(/<filter id="cel/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("a skit's finish rides on the compiled program; flat is left off", () => {
    const beats = [{ id: "a", speaker: "milo", line: "Hello there friend." }];
    expect(compile(beats, { finish: "illustrated" }).program.finish).toBe("illustrated");
    expect(compile(beats, { finish: "flat" }).program.finish).toBeUndefined();
    expect(compile(beats).program.finish).toBeUndefined();
  });
});
