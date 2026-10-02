/**
 * Per-kind figure parameters. A figure's `params`, each of its `states`, and every `set` cue are
 * merged and then checked against the schema for its kind, so a typo fails at compile with a path.
 */
import { z } from "zod";
import { exprError } from "./expr";
import { color, numOrExpr, pt, range, text } from "./paramsBase";
export { COLOR_SLOTS, type ColorRef } from "./paramsBase";

const SeriesSchema = z.strictObject({
  /** y as a function of `x` and the plot's `vars`, e.g. `"0.5*g*x^2"`. */
  fn: z.string().min(1).optional(),
  /** Or data points. */
  points: z.array(pt).min(2).max(400).optional(),
  color: color.optional(),
  width: z.number().min(0.5).max(4).default(1),
  dashed: z.boolean().default(false),
  label: text.optional(),
  /** Fraction of the curve drawn, left to right (animate it to draw a graph on). */
  draw: z.number().min(0).max(1).default(1),
  /** Shade between the curve and y = 0. */
  fill: z.boolean().default(false),
  /** Where along x the label sits (fraction of the drawn part). */
  labelAt: z.number().min(0).max(1).default(0.9),
});

const MarkerSchema = z.strictObject({
  /** Number, or an expression in the plot's `vars` (a moving point: `"t"`). */
  x: numOrExpr,
  /** Number or expression; default the series' value at x. */
  y: numOrExpr.optional(),
  series: z.number().int().min(0).default(0),
  color: color.optional(),
  label: text.optional(),
  /** Drop lines to both axes. */
  guides: z.boolean().default(false),
});

const plotShape = {
  x: range.default([0, 10]),
  y: range.default([0, 10]),
  xLabel: text.optional(),
  yLabel: text.optional(),
  grid: z.boolean().default(false),
  ticks: z.boolean().default(true),
  /** Free variables the expressions read, animated by `set` cues (`{ "t": 3 }`). */
  vars: z.record(z.string().regex(/^[A-Za-z_]\w*$/), z.number()).default({}),
};

export const PlotParams = z
  .strictObject({
    ...plotShape,
    series: z.array(SeriesSchema).max(6).default([]),
    markers: z.array(MarkerSchema).max(6).default([]),
  })
  .superRefine((p, ctx) => {
    const vars = ["x", ...Object.keys(p.vars)];
    p.series.forEach((s, i) => {
      if (!s.fn === !s.points)
        ctx.addIssue({
          code: "custom",
          path: ["series", i],
          message: `a series needs "fn" or "points" (one of them)`,
        });
      const e = s.fn ? exprError(s.fn, vars) : undefined;
      if (e)
        ctx.addIssue({
          code: "custom",
          path: ["series", i, "fn"],
          message: `bad expression "${s.fn}": ${e}`,
        });
    });
    p.markers.forEach((m, i) => {
      for (const k of ["x", "y"] as const) {
        const v = m[k];
        const e = typeof v === "string" ? exprError(v, Object.keys(p.vars)) : undefined;
        if (e)
          ctx.addIssue({
            code: "custom",
            path: ["markers", i, k],
            message: `bad expression "${v}": ${e}`,
          });
      }
    });
  });

export const AxesParams = z.strictObject(plotShape);

const VecSchema = z.strictObject({
  from: pt.default([0, 0]),
  /** Components (dx, dy). */
  v: pt,
  color: color.optional(),
  label: text.optional(),
  dashed: z.boolean().default(false),
  /** Show the x and y components as dashed legs. */
  components: z.boolean().default(false),
});
export const VectorParams = z.strictObject({
  x: range.default([-5, 5]),
  y: range.default([-5, 5]),
  grid: z.boolean().default(true),
  axes: z.boolean().default(true),
  vectors: z.array(VecSchema).min(1).max(6),
  /** Draw the resultant of all vectors, tip to tail. */
  sum: z
    .strictObject({
      color: color.optional(),
      label: text.optional(),
      tipToTail: z.boolean().default(true),
    })
    .optional(),
});

const WaveComp = z.strictObject({
  amp: z.number().min(0).max(5).default(1),
  wavelength: z.number().positive().default(2),
  /** Seconds per cycle. */
  period: z.number().positive().default(1),
  phase: z.number().default(0),
  color: color.optional(),
});
export const WaveParams = z.strictObject({
  /** `travelling`: each component moves; `sum`: superposition; `standing`: 2A sin kx cos ωt; `packet`: a Gaussian packet. */
  mode: z.enum(["travelling", "sum", "standing", "packet"]).default("travelling"),
  x: range.default([0, 6]),
  /** Half-height of the box in amplitude units. */
  yMax: z.number().positive().default(2.4),
  components: z
    .array(WaveComp)
    .min(1)
    .max(4)
    .default([{ amp: 1, wavelength: 2, period: 1, phase: 0 }]),
  /** In `sum` mode, draw the parts faintly under the total. */
  showComponents: z.boolean().default(true),
  /** Time multiplier (0 freezes the wave). */
  speed: z.number().min(0).max(4).default(1),
  packetWidth: z.number().positive().default(0.8),
  axis: z.boolean().default(true),
  label: text.optional(),
});

export const OrbitParams = z.strictObject({
  e: z.number().min(0).max(0.95).default(0.5),
  /** Seconds per orbit on screen. */
  period: z.number().positive().default(6),
  trail: z.boolean().default(true),
  path: z.boolean().default(true),
  /** Equal-time sectors (Kepler's second law): this many, shaded alternately. */
  sweep: z.number().int().min(0).max(12).default(0),
  highlight: z.enum(["none", "perihelion", "aphelion"]).default("none"),
  /** The velocity arrow on the planet (vis-viva length). */
  velocity: z.boolean().default(false),
  planetColor: color.default("a2"),
  starColor: color.default("highlight"),
  /** Planet radius, fraction of the box height. */
  planetR: z.number().min(0.005).max(0.1).default(0.03),
  starR: z.number().min(0.01).max(0.2).default(0.06),
  /** Start phase (fraction of the period after periapsis). */
  phase: z.number().default(0),
});

export const ParticlesParams = z.strictObject({
  count: z.number().int().min(1).max(400).default(40),
  seed: z.string().default("particles"),
  /** Box heights per second. */
  speed: z.number().min(0).max(4).default(0.3),
  mode: z.enum(["gas", "drift", "still", "fall"]).default("gas"),
  /** Dot radius, fraction of the box height. */
  radius: z.number().min(0.002).max(0.08).default(0.014),
  /** Trail length in seconds (0: none). */
  trail: z.number().min(0).max(1).default(0),
  charged: z.boolean().default(false),
  colors: z.array(color).min(1).max(5).default(["a1"]),
  box: z.boolean().default(true),
  /** Draw this particle bigger, in `highlight`. */
  highlight: z.number().int().min(0).optional(),
  /** Twinkle (stars). */
  twinkle: z.boolean().default(false),
});

export const LabelParams = z.strictObject({
  text: z.string().min(1).max(80),
  color: color.default("ink"),
  /** Text height, fraction of the box height. */
  size: z.number().min(0.05).max(1).default(0.6),
  align: z.enum(["start", "middle", "end"]).default("middle"),
  weight: z.number().int().min(300).max(900).default(800),
  italic: z.boolean().default(false),
  /** A rounded backing card. */
  pill: z.boolean().default(false),
});

export const CalloutParams = z.strictObject({
  text: z.string().min(1).max(60),
  color: color.default("highlight"),
  size: z.number().min(0.05).max(1).default(0.5),
  /** What it points at: `[fx, fy]` in frame fractions, or `"figureId.anchor"` (resolved by the compiler). */
  target: z.union([
    pt,
    z.string().regex(/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/, `"figureId" or "figureId.anchor"`),
  ]),
});

import { EquationParams, HistogramParams, ImageParams, NumberLineParams } from "./paramsMore";

export const FIGURE_PARAMS = {
  plot: PlotParams,
  axes: AxesParams,
  vector: VectorParams,
  wave: WaveParams,
  orbit: OrbitParams,
  particles: ParticlesParams,
  label: LabelParams,
  callout: CalloutParams,
  numberline: NumberLineParams,
  scale: NumberLineParams,
  histogram: HistogramParams,
  equation: EquationParams,
  image: ImageParams,
} as const;
export type FigureKind = keyof typeof FIGURE_PARAMS;
export const FIGURE_KINDS = Object.keys(FIGURE_PARAMS) as FigureKind[];

export type PlotP = z.infer<typeof PlotParams>;
export type AxesP = z.infer<typeof AxesParams>;
export type VectorP = z.infer<typeof VectorParams>;
export type WaveP = z.infer<typeof WaveParams>;
export type OrbitP = z.infer<typeof OrbitParams>;
export type ParticlesP = z.infer<typeof ParticlesParams>;
export type LabelP = z.infer<typeof LabelParams>;
export type CalloutP = z.infer<typeof CalloutParams>;
export type NumberLineP = z.infer<typeof NumberLineParams>;
export type HistogramP = z.infer<typeof HistogramParams>;
export type EquationP = z.infer<typeof EquationParams>;
export type ImageP = z.infer<typeof ImageParams>;
