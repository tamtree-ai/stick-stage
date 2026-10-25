import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXPRESSION_IDS, EXTRA_EXPRESSION_IDS, library } from "../src/data";
import {
  BODY_KINDS,
  CharacterSchema,
  characterDistance,
  charactersWithBuild,
  colorOf,
  EAR_KINDS,
  evalActor,
  EYE_KINDS,
  HAIR_KINDS,
  HEAD_KINDS,
  MARKING_KINDS,
  MUZZLE_KINDS,
  proportionsOf,
  rigMetrics,
  Rig,
  SHAPE_BUILDS,
  SHAPE_COLORS,
  SHAPE_DETAILS,
  shapeOf,
  shapeProportions,
  solveSkeleton,
  TAIL_KINDS,
  toAngles,
  tooAlike,
  type Character,
  type Library,
} from "../src/engine";

const FIG = 620;
const FPS = 30;
const SHAPE_CAST = ["tofu", "bobo", "pim", "mabel", "otto", "fennel", "biscuit", "wren", "blip"];

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

/** A library with one extra character parsed from a spec. */
const withSpec = (id: string, shape: Record<string, unknown>): Library => {
  const c = CharacterSchema.parse({ schemaVersion: 1, id, style: { build: "shape" }, shape });
  return { ...library, characters: { ...library.characters, [id]: c } };
};

describe("shape spec", () => {
  it("a character is a spec: a colour is enough", () => {
    const r = CharacterSchema.safeParse({ schemaVersion: 1, id: "blob", style: { build: "shape" }, shape: { color: "sky" } });
    expect(r.success).toBe(true);
    const c = r.data as Character;
    expect(shapeOf(c)?.build).toBe("kid");
    expect(proportionsOf(c)).toEqual(shapeProportions(c.shape!));
  });

  it('style.build "shape" without a shape block names the field', () => {
    const r = CharacterSchema.safeParse({ schemaVersion: 1, id: "x", style: { build: "shape" } });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.path.join(".") === "shape")).toBe(true);
  });

  it("an unknown colour names the token rule", () => {
    const r = CharacterSchema.safeParse({ schemaVersion: 1, id: "x", style: { build: "shape" }, shape: { color: "puce" } });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error!.issues)).toMatch(/colour token/);
  });

  it("tokens resolve to the palette, hex passes through", () => {
    expect(colorOf("sky")).toBe(SHAPE_COLORS.sky);
    expect(colorOf("#123456")).toBe("#123456");
  });

  it("builds stand in size order", () => {
    const h = (build: (typeof SHAPE_BUILDS)[number]) => shapeProportions(CharacterSchema.parse({ schemaVersion: 1, id: "x", style: { build: "shape" }, shape: { color: "sky", build } }).shape!).height;
    expect(h("tiny")).toBeLessThan(h("kid"));
    expect(h("kid")).toBeLessThan(h("round"));
    expect(h("round")).toBeLessThan(h("adult"));
    expect(h("adult")).toBeLessThan(h("tall"));
  });
});

describe("shape parts", () => {
  // Every kind of every part, drawn on a plain spec in a few poses, must give finite numbers.
  const cases: [string, Record<string, unknown>][] = [
    ...HEAD_KINDS.map((kind) => [`head ${kind}`, { head: { kind } }] as [string, Record<string, unknown>]),
    ...BODY_KINDS.map((kind) => [`body ${kind}`, { body: { kind } }] as [string, Record<string, unknown>]),
    ...EAR_KINDS.map((kind) => [`ears ${kind}`, { ears: { kind, inner: "pink" } }] as [string, Record<string, unknown>]),
    ...MUZZLE_KINDS.map((kind) => [`muzzle ${kind}`, { muzzle: { kind } }] as [string, Record<string, unknown>]),
    ...EYE_KINDS.map((kind) => [`eyes ${kind}`, { eyes: { kind } }] as [string, Record<string, unknown>]),
    ...TAIL_KINDS.map((kind) => [`tail ${kind}`, { tail: { kind } }] as [string, Record<string, unknown>]),
    ...HAIR_KINDS.map((kind) => [`hair ${kind}`, { hair: { kind, color: "chocolate" } }] as [string, Record<string, unknown>]),
    ...MARKING_KINDS.map((kind) => [`marking ${kind}`, { markings: [{ kind, color: "white" }] }] as [string, Record<string, unknown>]),
    ...SHAPE_DETAILS.map((id) => [`detail ${id}`, { details: [{ id }] }] as [string, Record<string, unknown>]),
    ["brows and cheeks", { brows: true, cheeks: "pink" }],
  ];
  for (const build of SHAPE_BUILDS)
    for (const [name, part] of cases)
      it(`${build}: ${name} draws with finite numbers`, () => {
        const lib = withSpec("spec", { color: "grass", build, ...part });
        for (const [pose, expr] of [["idle", "neutral"], ["arms-up", "shocked"], ["sit", "crying"]] as const)
          expect(markup(lib, "spec", pose, expr, 13), `${pose}`).not.toMatch(/NaN|Infinity|undefined/);
      });

  it("a detail actually draws (the spec is not ignored)", () => {
    const plain = markup(withSpec("spec", { color: "grass" }), "spec", "idle", "neutral");
    expect(markup(withSpec("spec", { color: "grass", details: [{ id: "crown" }] }), "spec", "idle", "neutral")).not.toBe(plain);
    expect(markup(withSpec("spec", { color: "grass", ears: { kind: "long" } }), "spec", "idle", "neutral")).not.toBe(plain);
  });
});

describe("shape cast", () => {
  for (const id of SHAPE_CAST) {
    it(`${id}: lowest foot on the ground in every pose`, () => {
      const c = library.characters[id]!;
      // A quadruped may stand on a front paw; "quadruped plan" checks paws and feet together.
      if (shapeOf(c)?.plan === "quadruped") return;
      for (const p of Object.values(library.poses)) {
        const j = solveSkeleton(c, toAngles(p), FIG);
        const bottom = Math.max(j.footL.y, j.footR.y) + rigMetrics(c, FIG).footRy;
        expect(Math.abs(bottom), p.id).toBeLessThan(0.5);
      }
    });

    it(`${id}: draws every pose and expression with finite numbers`, () => {
      const exprs = [...EXPRESSION_IDS, ...EXTRA_EXPRESSION_IDS];
      Object.keys(library.poses).forEach((pose, i) => {
        expect(markup(library, id, pose, exprs[i % exprs.length]!, i * 7), pose).not.toMatch(/NaN|Infinity|undefined/);
      });
    });

    it(`${id}: same frame, same drawing; no outlines`, () => {
      const svg = markup(library, id, "shrug", "laughing", 41);
      expect(svg).toBe(markup(library, id, "shrug", "laughing", 41));
      expect(svg).not.toContain(`stroke="${library.characters[id]!.style.stroke}"`);
    });
  }

  it("no two of the shape cast read as the same character", () => {
    for (const a of SHAPE_CAST)
      for (const b of SHAPE_CAST)
        if (a < b) expect(tooAlike(characterDistance(library.characters[a]!, library.characters[b]!)), `${a} vs ${b}`).toBe(false);
  });

  it("forcing the shape tier leaves stick and toon characters as they were", () => {
    const shapeLib: Library = { ...library, characters: charactersWithBuild(library.characters, "shape") };
    for (const id of ["milo", "june", "vera"]) expect(markup(shapeLib, id, "point", "happy")).toBe(markup(library, id, "point", "happy"));
  });
});

describe("quadruped plan", () => {
  const dog = library.characters.biscuit!;
  const pose = (id: string) => toAngles(library.poses[id]!);
  const ground = (j: ReturnType<typeof solveSkeleton>) => {
    const m = rigMetrics(dog, FIG);
    return Math.max(j.footL.y, j.footR.y, j.handL.y + m.footRy * 0.35, j.handR.y + m.footRy * 0.35) + m.footRy;
  };

  it("biscuit is a quadruped and its body runs front to back, not up", () => {
    expect(shapeOf(dog)?.plan).toBe("quadruped");
    const j = solveSkeleton(dog, pose("idle"), FIG);
    expect(Math.abs(j.shoulder.x - j.hip.x)).toBeGreaterThan(Math.abs(j.shoulder.y - j.hip.y) * 2);
    expect(j.head.y).toBeLessThan(j.shoulder.y);
  });

  it("the lowest paw or foot is on the ground in every pose", () => {
    for (const p of Object.keys(library.poses)) expect(Math.abs(ground(solveSkeleton(dog, pose(p), FIG))), p).toBeLessThan(0.5);
  });

  it("wave lifts the near front paw; sit drops the rump and raises the chest", () => {
    const idle = solveSkeleton(dog, pose("idle"), FIG);
    const wave = solveSkeleton(dog, pose("wave"), FIG);
    expect(wave.handR.y).toBeLessThan(wave.handL.y - 10);
    const sit = solveSkeleton(dog, pose("sit"), FIG);
    expect(sit.shoulder.y - sit.hip.y).toBeLessThan(idle.shoulder.y - idle.hip.y - 10);
  });

  it("folded-arm poses keep the front legs standing", () => {
    for (const p of ["arms-crossed", "hold-chest"]) {
      const j = solveSkeleton(dog, pose(p), FIG);
      expect(j.handR.y - j.shoulder.y, p).toBeGreaterThan(0);
    }
  });

  it("draws every pose and expression; holds a prop in the near paw", () => {
    const exprs = [...EXPRESSION_IDS, ...EXTRA_EXPRESSION_IDS];
    Object.keys(library.poses).forEach((p, i) => expect(markup(library, "biscuit", p, exprs[i % exprs.length]!, i * 5), p).not.toMatch(/NaN|Infinity|undefined/));
  });

  it("a quadruped spec parses with every build", () => {
    for (const build of SHAPE_BUILDS) {
      const lib = withSpec("q", { plan: "quadruped", color: "tan", build, tail: { kind: "long" }, ears: { kind: "pointed" } });
      expect(markup(lib, "q", "idle", "happy"), build).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
