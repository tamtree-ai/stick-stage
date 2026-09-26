import { describe, expect, it } from "vitest";
import { EXPRESSION_IDS, library, POSE_IDS, sets } from "../src/data";
import { accessoryIds, getPalette, PARTS, resolveExpression } from "../src/engine";

describe("data library", () => {
  it("has the required M1 poses and expressions", () => {
    expect(POSE_IDS).toHaveLength(12);
    expect(EXPRESSION_IDS).toHaveLength(12);
    for (const p of POSE_IDS) expect(library.poses[p], p).toBeDefined();
    for (const e of EXPRESSION_IDS) expect(library.expressions[e], e).toBeDefined();
  });
  it("every expression resolves (mouth presets exist)", () => {
    for (const e of Object.values(library.expressions)) expect(() => resolveExpression(e)).not.toThrow();
  });
  it("every accessory is registered", () => {
    const known = accessoryIds();
    for (const c of Object.values(library.characters)) for (const a of c.accessories) expect(known).toContain(a.id);
  });
  it("every set uses known palettes and parts", () => {
    for (const s of Object.values(sets)) {
      expect(() => getPalette(s.palette)).not.toThrow();
      for (const p of [...s.layers, ...s.foreground]) expect(Object.keys(PARTS)).toContain(p.part);
    }
  });
});
