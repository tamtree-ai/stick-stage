/**
 * Data-story figure params (explainers): `line`, `bars`, `counter`, `map`. Numbers come as
 * `[key, value]` pairs, written inline or bound from a dataset (`"@id.column"`, `director/data.ts`).
 */
import { z } from "zod";
import { color, range, text } from "./paramsBase";

/** `[key, value]` rows: key is a year, a date, a country code or a category. */
export const pairs = z.array(z.tuple([z.union([z.string(), z.number()]), z.number()])).min(1).max(2000);
const key = z.union([z.string(), z.number()]);

/** How numbers print: `{ "prefix": "$", "suffix": "bn", "decimals": 1 }`. */
export const UnitSchema = z
  .strictObject({ prefix: z.string().max(4).default(""), suffix: z.string().max(8).default(""), decimals: z.number().int().min(0).max(4).default(0) })
  .default({ prefix: "", suffix: "", decimals: 0 });
export type Unit = z.infer<typeof UnitSchema>;

/** Two looks per kind, so one kind can look different between videos. */
const variant = z.enum(["clean", "bold"]).default("clean");

export const LineParams = z.strictObject({
  series: z
    .array(z.strictObject({ data: pairs, color: color.optional(), label: text.optional(), dashed: z.boolean().default(false) }))
    .min(1)
    .max(5),
  /** Fraction drawn, left to right (animate it to draw the line on). */
  draw: z.number().min(0).max(1).default(1),
  /** Value axis; default fits the data (from 0 when `zero`). */
  y: range.optional(),
  zero: z.boolean().default(true),
  unit: UnitSchema,
  /** Shade a key range (`["2008", "2010"]`). */
  span: z.strictObject({ from: key, to: key, label: text.optional(), color: color.default("highlight") }).optional(),
  /** Dots with value labels on these keys (series 0 unless `series`). */
  points: z.array(z.strictObject({ at: key, series: z.number().int().min(0).default(0), label: text.optional() })).max(6).default([]),
  /** Vertical markers on keys: "iPhone launch". */
  events: z.array(z.strictObject({ at: key, label: text })).max(6).default([]),
  variant,
});

export const BarsParams = z.strictObject({
  series: z
    .array(z.strictObject({ data: pairs, color: color.optional(), label: text.optional() }))
    .min(1)
    .max(3),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
  sort: z.enum(["none", "asc", "desc"]).default("none"),
  /** Keys drawn in `highlight`; the rest go muted. */
  highlight: z.array(key).max(12).default([]),
  /** Bar growth 0…1 (animate it, or let the reveal grow them). */
  grow: z.number().min(0).max(1).default(1),
  /** Fixed scale top, so a `set` cue that changes values doesn't rescale. Default: the data's max. */
  max: z.number().positive().optional(),
  values: z.boolean().default(true),
  unit: UnitSchema,
  /** At most this many bars (after sorting). */
  limit: z.number().int().min(1).max(40).default(12),
  variant,
});

export const CounterParams = z.strictObject({
  /** Tween it with a `set` cue and the number ticks. */
  value: z.number(),
  /** Where the reveal starts ticking from. */
  from: z.number().default(0),
  unit: UnitSchema,
  /** Small line under the number. */
  caption: text.optional(),
  /** A change chip: ▲ green / ▼ red (`good: "down"` flips the colours). */
  delta: z.strictObject({ value: z.number(), unit: UnitSchema, good: z.enum(["up", "down"]).default("up") }).optional(),
  color: color.default("ink"),
  variant,
});

export const MapParams = z.strictObject({
  /** Choropleth values by ISO 3166 alpha-3 code (`[["USA", 3.2], …]`, or `"@dataset.column"`). */
  data: pairs.optional(),
  /** Codes drawn in `highlight`. */
  highlight: z.array(z.string().regex(/^[A-Z]{3}$/, "an ISO alpha-3 code: USA, FRA, JPN")).max(40).default([]),
  /** Dots (cities, stores) with optional labels. */
  points: z
    .array(z.strictObject({ lon: z.number().min(-180).max(180), lat: z.number().min(-90).max(90), label: text.optional(), size: z.number().min(0.2).max(4).default(1) }))
    .max(40)
    .default([]),
  /** Arcs from one place to another (trade, shipping). `draw` animates them on. */
  routes: z.array(z.strictObject({ from: z.tuple([z.number(), z.number()]), to: z.tuple([z.number(), z.number()]) })).max(12).default([]),
  draw: z.number().min(0).max(1).default(1),
  /**
   * What the map frames: `"world"`, a code (`"FRA"`), several (`["FRA", "DEU"]`), or a lon/lat box
   * `[lon0, lat0, lon1, lat1]`. Change it with a `set` cue to fly between places.
   */
  zoom: z.union([z.literal("world"), z.string().regex(/^[A-Z]{3}$/), z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(12), z.tuple([z.number(), z.number(), z.number(), z.number()])]).default("world"),
  /** Resolved by the compiler from `zoom`: the map-units box (not written by hand). */
  view: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  unit: UnitSchema,
  /** A min–max colour key in the corner (choropleths). */
  legend: z.boolean().default(true),
  variant,
});

export type LineP = z.infer<typeof LineParams>;
export type BarsP = z.infer<typeof BarsParams>;
export type CounterP = z.infer<typeof CounterParams>;
export type MapP = z.infer<typeof MapParams>;

/** "$4.2bn": a number in a figure's unit. */
export const formatValue = (v: number, u: Unit): string => {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals });
  return `${v < 0 ? "−" : ""}${u.prefix}${s}${u.suffix}`;
};
