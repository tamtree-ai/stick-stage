import { describe, expect, it } from "vitest";
import { EXPRESSION_IDS, EXTRA_POSE_IDS, library, POSE_IDS, PROP_IDS, sets } from "../src/data";
import { accessoryIds, getPalette, KITS, PART_INFO, PARTS, PALETTES, resolveExpression, SEAT_PARTS } from "../src/engine";

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
  it("has the M3 poses and props", () => {
    for (const p of EXTRA_POSE_IDS) expect(library.poses[p], p).toBeDefined();
    for (const p of PROP_IDS) expect(library.props[p], p).toBeDefined();
  });
  it("has a set for every kit, and marks/seats referenced by parts exist", () => {
    for (const k of KITS) expect(Object.values(sets).some((s) => s.kit === k), k).toBe(true);
    for (const s of Object.values(sets)) {
      for (const p of [...s.layers, ...s.foreground]) {
        if (p.mark) expect(s.marks, `${s.id}/${p.part}`).toHaveProperty(p.mark);
        for (const m of p.seatFor) expect(s.marks, `${s.id}/${p.part}`).toHaveProperty(m);
        if (p.seatFor.length) expect(SEAT_PARTS, `${s.id}/${p.part} is not a seat`).toHaveProperty(p.part);
        if (PART_INFO[p.part]?.foreground) expect(s.foreground, `${s.id}/${p.part}`).toContain(p);
      }
    }
  });
  it("every set has catalog text for set pickers", () => {
    for (const s of Object.values(sets)) {
      expect(s.description, s.id).toBeTruthy();
      expect(s.tags.length, s.id).toBeGreaterThan(2);
    }
  });
  it("every palette has the same seven tokens", () => {
    for (const p of Object.values(PALETTES)) expect(Object.keys(p).sort()).toEqual(["accent", "detail", "floor", "shade", "sky", "wallA", "wallB"]);
  });
  it("every set uses known palettes and parts", () => {
    for (const s of Object.values(sets)) {
      expect(() => getPalette(s.palette)).not.toThrow();
      for (const p of [...s.layers, ...s.foreground]) expect(Object.keys(PARTS)).toContain(p.part);
    }
  });
});
