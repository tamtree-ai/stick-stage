/** Figure params, continued: scales, histograms, equations and images. */
import { z } from "zod";
import { color, range, text } from "./paramsBase";

export const NumberLineParams = z.strictObject({
  min: z.number().default(0),
  max: z.number().default(10),
  /** Powers of ten: `min`/`max` are exponents (−15 … 26). */
  log: z.boolean().default(false),
  /** Tick spacing (log: in exponents). */
  step: z.number().positive().default(1),
  labels: z.boolean().default(true),
  marks: z
    .array(z.strictObject({ value: z.number(), label: text.optional(), color: color.optional() }))
    .max(12)
    .default([]),
  /** A moving pointer (animate it with `set`). */
  pointer: z.number().optional(),
  pointerLabel: text.optional(),
  color: color.default("ink"),
  /** Zoom window: only [from, to] of the line is shown (animate it to zoom in). */
  view: range.optional(),
});

export const HistogramParams = z.strictObject({
  source: z.enum(["dice", "two-dice", "coin", "normal", "values"]).default("dice"),
  sides: z.number().int().min(2).max(20).default(6),
  bins: z.number().int().min(2).max(40).default(12),
  /** How many draws so far (animate it: 0 → 1000). */
  n: z.number().min(0).max(20000).default(0),
  seed: z.string().default("hist"),
  /** `values` source: the bar heights. */
  values: z.array(z.number().min(0)).max(40).optional(),
  labels: z.array(z.string().max(8)).max(40).optional(),
  /** The line probability predicts. */
  expected: z.boolean().default(true),
  /** Show bars as shares (0…1) instead of counts. */
  share: z.boolean().default(true),
  yMax: z.number().positive().optional(),
  /** "n = 1000" in the corner. */
  count: z.boolean().default(true),
  color: color.default("a1"),
});

export const EquationParams = z.strictObject({
  tex: z.string().min(1).max(400),
  /** Parts shown so far, in order (animate with `set`); default all. */
  show: z.number().min(0).optional(),
  /** Term classes (`\class{t-mass}{m}` → `"t-mass"`) to light up. */
  highlight: z.array(z.string().min(1)).max(8).default([]),
  /** Term classes crossed out (cancelled). */
  strike: z.array(z.string().min(1)).max(8).default([]),
  color: color.default("ink"),
  highlightColor: color.default("highlight"),
});

export const ImageParams = z.strictObject({
  /** Id in `images.json`. */
  image: z.string().min(1),
  fit: z.enum(["cover", "contain"]).default("cover"),
  /** Slow pan and zoom over the time the image is up: centre (fractions) and zoom. */
  from: z
    .strictObject({
      x: z.number().min(0).max(1).default(0.5),
      y: z.number().min(0).max(1).default(0.5),
      zoom: z.number().min(1).max(4).default(1),
    })
    .default({ x: 0.5, y: 0.5, zoom: 1 }),
  to: z
    .strictObject({
      x: z.number().min(0).max(1).default(0.5),
      y: z.number().min(0).max(1).default(0.5),
      zoom: z.number().min(1).max(4).default(1.12),
    })
    .default({ x: 0.5, y: 0.5, zoom: 1.12 }),
  /** Drawn frame: a plain border, a telescope eyepiece (circle), or a monitor bezel. */
  frame: z.enum(["border", "eyepiece", "monitor", "none"]).default("border"),
});

