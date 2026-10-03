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


/** One part of a whole on a `progress` bar. `dim` and `ask` are 0…1 so `set` cues tween them. */
const SegmentSchema = z.strictObject({
  label: text,
  /** In units of the bar's `total`. Animate it from 0 to grow the segment. */
  value: z.number().min(0).max(1e6),
  color: color.optional(),
  /** Fade the segment back (0 = full colour, 1 = faint). */
  dim: z.number().min(0).max(1).default(0),
  /** A big "?" over the segment (0 = none, 1 = full size). */
  ask: z.number().min(0).max(1).default(0),
});

/**
 * Part of a whole as one bar (a progress bar): segments fill from the left, the rest of the
 * track stays empty. For shares that add up to a total (5 / 27 / 68 %).
 */
export const ProgressParams = z.strictObject({
  segments: z.array(SegmentSchema).min(1).max(6),
  total: z.number().positive().default(100),
  /** After each value label ("%"). */
  unit: z.string().max(4).default("%"),
  /** Big line above the bar; `{0}`, `{1}` … are segment values (rounded): "{0}% read". */
  readout: text.optional(),
  /** A "?" on the empty rest of the track (0…1). */
  restAsk: z.number().min(0).max(1).default(0),
  /** A chip under one segment, pointing up at it: "you are here". `show` 0…1 pops it in. */
  here: z
    .strictObject({ segment: z.number().int().min(0).max(5), text: text.default("you are here"), show: z.number().min(0).max(1).default(1) })
    .optional(),
});

/** A spiral galaxy that turns; `speedLines` (0…1) adds motion arcs ("spins too fast"). */
export const GalaxyParams = z.strictObject({
  /** Degrees per second. */
  spin: z.number().min(-720).max(720).default(40),
  speedLines: z.number().min(0).max(1).default(0),
  /** Tilt of the disc, degrees. */
  tilt: z.number().min(-90).max(90).default(-18),
  caption: text.optional(),
});

/** A supernova pop: a star and rays that burst when shown, then fade to a glow. */
export const BurstParams = z.strictObject({
  color: color.default("highlight"),
  /** Seconds after the show until it fades to the glow. */
  hold: z.number().min(0.1).max(10).default(0.9),
});

/** A wall of tiny contract text (the "fine print"), drawn on line by line. */
export const FinePrintParams = z.strictObject({
  /** Repeated to fill the box. */
  text: z.string().min(1).max(400).default("subject to change · not visible · not identified · see gravity · see supernovae · terms apply · "),
  /** Text height, px at 1080 wide. */
  size: z.number().min(6).max(40).default(13),
  color: color.default("muted"),
  /** Fraction of the lines shown (animate it to fill the wall). */
  fill: z.number().min(0).max(1).default(1),
});
