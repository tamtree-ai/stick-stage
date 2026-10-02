/**
 * Typeset equations: MathJax runs in the prepare step (Node) and hands the engine plain SVG
 * pieces, cached by a hash of the TeX. The engine never runs MathJax.
 */
import { z } from "zod";

export const TypesetPartSchema = z.object({
  /** The `\class{t-…}` name, when the part is a tagged term. */
  cls: z.string().optional(),
  /** SVG markup in MathJax units, already placed (ancestor transforms applied). Fill is `currentColor`. */
  markup: z.string(),
  /** Bounding box in the same units, y down: x, y, w, h. */
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
export type TypesetPart = z.infer<typeof TypesetPartSchema>;

export const TypesetSchema = z.object({
  tex: z.string(),
  /** MathJax viewBox (x, y, w, h), y down. */
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  parts: z.array(TypesetPartSchema),
});
export type Typeset = z.infer<typeof TypesetSchema>;

/** `generated/equations.json`: TeX → typeset, written by prep. */
export const EquationCacheSchema = z.object({
  schemaVersion: z.literal(1),
  equations: z.record(z.string(), TypesetSchema),
});
export type EquationCache = z.infer<typeof EquationCacheSchema>;

/** The TeX strings a skit document's figures need (scene figures and `set` cues). */
export const texOf = (
  figures: readonly {
    kind: string;
    params?: Record<string, unknown>;
    states?: Record<string, Record<string, unknown>>;
  }[],
): string[] => {
  const out = new Set<string>();
  for (const f of figures) {
    if (f.kind !== "equation") continue;
    for (const p of [f.params ?? {}, ...Object.values(f.states ?? {})])
      if (typeof p.tex === "string") out.add(p.tex);
  }
  return [...out];
};

/** Every TeX a skit document's figures use, across scenes. */
export const texOfSkit = (doc: {
  figures?: FigureLike[];
  scenes?: { figures?: FigureLike[] }[];
}): string[] =>
  texOf([...(doc.figures ?? []), ...(doc.scenes ?? []).flatMap((s) => s.figures ?? [])]);

type FigureLike = {
  kind: string;
  params?: Record<string, unknown>;
  states?: Record<string, Record<string, unknown>>;
};
