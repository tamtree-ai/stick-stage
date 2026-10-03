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
  evalHands,
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
import { thumbFlip } from "../src/engine/rig/toon/limbs";

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
        hands: s.hands,
      }),
    ),
  );
};

describe("toon build", () => {
  it("the science cast ships as toons; everyone else stays stick", () => {
    for (const [id, c] of Object.entries(library.characters)) expect(c.style.build, id).toBe(TOON_CAST.includes(id) ? "toon" : "stick");
    for (const id of TOON_CAST) expect(library.characters[id]!.toon, id).toBeDefined();
  });

  it('style.build "toon" without a toon block names the field', () => {
    const doc = { ...library.characters.milo!, style: { ...library.characters.milo!.style, build: "toon" } };
    const r = CharacterSchema.safeParse(doc);
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(["toon"]);
  });

  it("withBuild switches tier and proportions; characters without toon stay stick", () => {
    const vera = withBuild(library.characters.vera!, "stick");
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
    const stickLib: Library = { ...library, characters: charactersWithBuild(library.characters, "stick") };
    expect(markup(stickLib, "vera", "idle", "neutral")).not.toContain(library.characters.vera!.toon!.skin);
  });
});

describe("toon checks", () => {
  it("Vera and Gus read as different people (silhouette or colour)", () => {
    const d = characterDistance(toonLib.characters.vera!, toonLib.characters.gus!);
    expect(tooAlike(d)).toBe(false);
    expect(d.silhouette).toBeGreaterThan(0.3);
  });

  it("toon outlines keep ≥ 3:1 against skin and every set palette (dark palettes: through the rim)", () => {
    for (const id of TOON_CAST) {
      const t = library.characters[id]!.toon!;
      expect(contrastRatio(t.ink, t.skin), `${id} skin`).toBeGreaterThanOrEqual(3);
      for (const [pid, p] of Object.entries(PALETTES)) {
        if (p.rim) {
          // A dark ground: the light rim separates the outline from the set instead.
          expect(contrastRatio(p.rim, t.ink), `${pid} rim vs ink`).toBeGreaterThanOrEqual(3);
          for (const tone of [p.wallA, p.wallB]) expect(contrastRatio(p.rim, tone), `${pid} rim vs ${tone}`).toBeGreaterThanOrEqual(3);
          continue;
        }
        const worst = Math.min(...[p.wallA, p.wallB, p.floor, p.sky, p.shade].map((tone) => contrastRatio(t.ink, tone)));
        expect(worst, `${id} on ${pid}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("toon hands (T2)", () => {
  const pose = (id: string) => library.poses[id]!;
  it("hand shapes switch at the middle of a pose blend, not at its start", () => {
    const keys = [{ frame: 0, pose: "idle" }, { frame: 10, pose: "point" }];
    expect(evalHands(keys, 10, pose).R).toBeUndefined();
    expect(evalHands(keys, 11, pose).R).toBeUndefined();
    expect(evalHands(keys, 12, pose).R).toBe("point");
  });

  it("a held prop closes the hand; otherwise the pose's shape shows", () => {
    const s = evalActor(toonLib, { character: "vera", poseKeys: [{ frame: 0, pose: "point" }], expressionKeys: [{ frame: 0, expression: "neutral" }], propKeys: [{ frame: 0, hand: "L", prop: "mic" }] }, 5, FPS, FIG);
    expect(s.hands.R).toBe("point");
    expect(s.props.held.L).toBeDefined();
  });

  it("the thumb is on top of a forearm pointing forward or back, and forward on a hanging arm", () => {
    // Local −y of the hand is the thumb; rotate it by the forearm angle (and mirror on a flip).
    const thumbDir = (fore: { x: number; y: number }) => {
      const a = Math.atan2(fore.y, fore.x);
      const s = thumbFlip(fore) ? -1 : 1;
      return { x: s * Math.sin(a), y: -s * Math.cos(a) };
    };
    expect(thumbDir({ x: 1, y: 0 }).y).toBeLessThan(-0.9);
    expect(thumbDir({ x: -1, y: 0 }).y).toBeLessThan(-0.9);
    expect(thumbDir({ x: 0, y: 1 }).x).toBeGreaterThan(0.9);
    // A hanging arm's idle sway never flips the hand.
    expect(thumbFlip({ x: -0.2, y: 0.98 })).toBe(false);
  });

  it("every pose × hand shape draws with no NaN, and point draws a different hand than idle", () => {
    for (const id of TOON_CAST)
      for (const p of Object.keys(library.poses)) expect(markup(toonLib, id, p, "neutral"), `${id} ${p}`).not.toContain("NaN");
    expect(markup(toonLib, "gus", "point", "neutral")).not.toBe(markup(toonLib, "gus", "idle", "neutral"));
  });
});
