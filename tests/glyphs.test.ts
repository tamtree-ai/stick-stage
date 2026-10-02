import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SYMBOL_FALLBACKS } from "../src/engine/text/fonts";

/** Code points a TrueType font maps (cmap formats 4 and 12). */
const cmap = (file: string): Set<number> => {
  const b = fs.readFileSync(file);
  const n = b.readUInt16BE(4);
  let off = -1;
  for (let i = 0; i < n; i++) if (b.toString("ascii", 12 + i * 16, 16 + i * 16) === "cmap") off = b.readUInt32BE(12 + i * 16 + 8);
  if (off < 0) throw new Error(`${file}: no cmap`);
  const out = new Set<number>();
  const tables = b.readUInt16BE(off + 2);
  for (let t = 0; t < tables; t++) {
    const sub = off + b.readUInt32BE(off + 4 + t * 8 + 4);
    const format = b.readUInt16BE(sub);
    if (format === 4) {
      const segs = b.readUInt16BE(sub + 6) / 2;
      const ends = sub + 14;
      const starts = ends + segs * 2 + 2;
      const deltas = starts + segs * 2;
      const ranges = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const end = b.readUInt16BE(ends + s * 2);
        const start = b.readUInt16BE(starts + s * 2);
        const delta = b.readInt16BE(deltas + s * 2);
        const ro = b.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const g = ro === 0 ? (c + delta) & 0xffff : b.readUInt16BE(ranges + s * 2 + ro + (c - start) * 2);
          if (g !== 0) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = b.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const start = b.readUInt32BE(sub + 16 + g * 12);
        const end = b.readUInt32BE(sub + 20 + g * 12);
        for (let c = start; c <= end; c++) out.add(c);
      }
    }
  }
  return out;
};

const PUBLIC = path.join(import.meta.dirname, "../public");
const SCIENCE = "α β γ δ λ μ ν π σ τ φ ψ ω Δ Σ Ω ħ ∫ ∑ ∞ ≈ ≠ ≤ ≥ ∝ √ ⁻ ¹ ² ³ × · → ½ ° ±".split(" ");

describe("science glyphs", () => {
  const stack = [{ family: "Montserrat", file: "fonts/Montserrat-Variable.ttf" }, ...SYMBOL_FALLBACKS].map((f) => ({ ...f, map: cmap(path.join(PUBLIC, f.file)) }));
  it("every symbol a caption or board may use is in the text font or a fallback", () => {
    const missing = SCIENCE.filter((ch) => !stack.some((f) => f.map.has(ch.codePointAt(0)!)));
    expect(missing).toEqual([]);
  });
  it("the check would catch a gap: Montserrat alone lacks Greek and maths", () => {
    const latin = stack[0]!.map;
    expect(SCIENCE.filter((ch) => !latin.has(ch.codePointAt(0)!)).length).toBeGreaterThan(5);
  });
});
