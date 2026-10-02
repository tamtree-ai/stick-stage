import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXPRESSION_IDS, EXTRA_EXPRESSION_IDS, library } from "../src/data";
import {
  CharacterSchema,
  characterDistance,
  charactersWithBuild,
  contrastRatio,
  evalActor,
  proportionsOf,
  rigMetrics,
  Rig,
  solveSkeleton,
  toAngles,
  tooAlike,
  toonOf,
  withBuild,
  type Library,
} from "../src/engine";
import { PALETTES } from "../src/engine/set/palettes";

const FIG = 720;
const FPS = 30;
const TOON_CAST = ["vera", "gus"];
const toonLib: Library = { ...library, characters: charactersWithBuild(library.characters, "toon") };

const markup = (lib: Library, character: string, pose: string, expression: string, frame = 0) => {
  const s = evalActor(lib, { character, poseKeys: [{ frame: 0, pose }], expressionKeys: [{ frame: 0, expression }] }, frame, FPS, FIG);
  return renderToStaticMarkup(
    React.createElement(
      "svg",
      null,
      React.createElement(Rig, {
        character: s.character,
        joints: s.joints,
        metrics: s.metrics,
        bend: s.angles.bend,
        face: s.face,
        blink: s.blink,
        frame,
        symbolsSince: s.symbolsSince,
        symbolAges: s.symbolAges,
        props: s.props,
      }),
    ),
  );
};

describe("toon build", () => {
  it("the shipped cast stays stick until a file opts in; the science cast carries a toon block", () => {
    for (const [id, c] of Object.entries(library.characters)) expect(c.style.build, id).toBe("stick");
    for (const id of TOON_CAST) expect(library.characters[id]!.toon, id).toBeDefined();
  });

  it('style.build "toon" without a toon block names the field', () => {
    const doc = { ...library.characters.milo!, style: { ...library.characters.milo!.style, build: "toon" } };
    const r = CharacterSchema.safeParse(doc);
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(["toon"]);
  });

  it("withBuild switches tier and proportions; characters without toon stay stick", () => {
    const vera = library.characters.vera!;
    expect(proportionsOf(vera)).toBe(vera.proportions);
    const toon = withBuild(vera, "toon");
    expect(toonOf(toon)).toBe(vera.toon);
    expect(proportionsOf(toon)).toBe(vera.toon!.proportions);
    expect(withBuild(library.characters.milo!, "toon")).toBe(library.characters.milo);
    expect(toonOf(withBuild(toon, "stick"))).toBeUndefined();
  });

  it("stick characters draw exactly as before when the toon library is used", () => {
    for (const id of ["milo", "june", "moss"]) expect(markup(toonLib, id, "point", "happy")).toBe(markup(library, id, "point", "happy"));
  });
});

describe("toon rig", () => {
  for (const id of TOON_CAST) {
    it(`${id}: lowest foot on the ground in every pose`, () => {
      const c = toonLib.characters[id]!;
      for (const p of Object.values(library.poses)) {
        const j = solveSkeleton(c, toAngles(p), FIG);
        const bottom = Math.max(j.footL.y, j.footR.y) + rigMetrics(c, FIG).footRy;
        expect(Math.abs(bottom), p.id).toBeLessThan(0.5);
      }
    });

    it(`${id}: draws every pose and expression with finite numbers`, () => {
      const exprs = [...EXPRESSION_IDS, ...EXTRA_EXPRESSION_IDS];
      Object.keys(library.poses).forEach((pose, i) => {
        const svg = markup(toonLib, id, pose, exprs[i % exprs.length]!, i * 7);
        expect(svg, pose).not.toMatch(/NaN|Infinity|undefined/);
      });
    });

    it(`${id}: same frame, same drawing`, () => {
      expect(markup(toonLib, id, "shrug", "laughing", 41)).toBe(markup(toonLib, id, "shrug", "laughing", 41));
    });
  }

  it("draws toon parts the stick build does not have", () => {
    const svg = markup(toonLib, "vera", "idle", "neutral");
    // Skin, iris and the hair colour all come from the toon block.
    for (const c of [library.characters.vera!.toon!.skin, library.characters.vera!.toon!.eyes.iris, library.characters.vera!.toon!.hair.fill]) expect(svg).toContain(c);
    expect(markup(library, "vera", "idle", "neutral")).not.toContain(library.characters.vera!.toon!.skin);
  });
});

describe("toon checks", () => {
  it("Vera and Gus read as different people (silhouette or colour)", () => {
    const d = characterDistance(toonLib.characters.vera!, toonLib.characters.gus!);
    expect(tooAlike(d)).toBe(false);
    expect(d.silhouette).toBeGreaterThan(0.3);
  });

  it("toon outlines keep ≥ 3:1 against skin and every set palette", () => {
    for (const id of TOON_CAST) {
      const t = library.characters[id]!.toon!;
      expect(contrastRatio(t.ink, t.skin), `${id} skin`).toBeGreaterThanOrEqual(3);
      for (const [pid, p] of Object.entries(PALETTES)) {
        const worst = Math.min(...[p.wallA, p.wallB, p.floor, p.sky, p.shade].map((tone) => contrastRatio(t.ink, tone)));
        expect(worst, `${id} on ${pid}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
