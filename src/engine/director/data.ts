/**
 * Data binding for explainers: facts come from code (Tamtree's data nodes), not the model.
 * A skit's `datasets` hold the tables; figure params reference them with `"@id.column"` (the
 * whole column as `[key, value]` pairs) or `"@id.column[key]"` (one number). Beats tag the
 * numbers they speak (`numbers`), and the compiler checks each against its dataset.
 */
import { z } from "zod";
import type { Diagnostic } from "./diagnostics";

const cell = z.union([z.string(), z.number(), z.null()]);

export const DatasetSchema = z
  .strictObject({
    /** Column names. The first column is the key (a year, a country, a category). */
    columns: z.array(z.string().regex(/^[A-Za-z0-9_-]+$/, "letters, digits, - and _ only")).min(2).max(24),
    rows: z.array(z.array(cell)).min(1).max(2000),
    /** Where the numbers come from: it goes in the description and on screen while a figure shows it. */
    source: z.strictObject({ name: z.string().min(2).max(120), url: z.string().url().optional(), retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional() }),
    /** Made-up numbers (a look sample): the on-screen source says so. */
    illustrative: z.boolean().default(false),
  })
  .superRefine((d, ctx) =>
    d.rows.forEach((r, i) => r.length !== d.columns.length && ctx.addIssue({ code: "custom", path: ["rows", i], message: `${r.length} cells for ${d.columns.length} columns` })),
  );
export type Dataset = z.infer<typeof DatasetSchema>;
export type Datasets = Readonly<Record<string, Dataset>>;

/** A number a line says, and the dataset cell it must match. */
export const SpokenNumberSchema = z.strictObject({
  /** As written in the line: "12%", "$4.2 billion", "1,200". */
  text: z.string().min(1).max(40),
  data: z.string().regex(/^@[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\[[^\]]+\]$/, `"@dataset.column[key]"`),
});
export type SpokenNumber = z.infer<typeof SpokenNumberSchema>;

const REF = /^@([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)(?:\[([^\]]+)\])?$/;

export type Pair = [string | number, number];

/** Resolve one reference: a column → pairs, a cell → a number. A string error when it doesn't resolve. */
export const resolveRef = (ref: string, data: Datasets | undefined): { value: Pair[] | number; dataset: string } | string => {
  const m = REF.exec(ref);
  if (!m) return `"${ref}" is not "@dataset.column" or "@dataset.column[key]"`;
  const [, id, col, key] = m;
  const ds = data?.[id!];
  if (!ds) return `no dataset "${id}"${data && Object.keys(data).length ? ` (have ${Object.keys(data).join(", ")})` : ""}`;
  const c = ds.columns.indexOf(col!);
  if (c < 1) return `dataset "${id}" has no value column "${col}" (have ${ds.columns.slice(1).join(", ")})`;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  if (key === undefined) {
    const pairs = ds.rows.flatMap((r): Pair[] => (num(r[c]) === undefined || r[0] === null ? [] : [[r[0]!, r[c] as number]]));
    return pairs.length ? { value: pairs, dataset: id! } : `"${ref}" has no numbers`;
  }
  const row = ds.rows.find((r) => String(r[0]) === key);
  if (!row) return `dataset "${id}" has no row "${key}"`;
  const v = num(row[c]);
  return v === undefined ? `"${ref}" is empty` : { value: v, dataset: id! };
};

/** Replace every `"@…"` string in a param tree. Records the datasets used; bad refs become diagnostics. */
export const bindData = (params: Record<string, unknown>, data: Datasets | undefined, at: string, diags: Diagnostic[], used: Set<string>): Record<string, unknown> => {
  const walk = (v: unknown, path: string): unknown => {
    if (typeof v === "string" && v.startsWith("@")) {
      const r = resolveRef(v, data);
      if (typeof r === "string") {
        diags.push({ level: "error", code: "data-ref", path, message: r, expected: `"@<dataset>.<column>" or "@<dataset>.<column>[<key>]"` });
        return v;
      }
      used.add(r.dataset);
      return r.value;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, `${path}.${k}`)]));
    return v;
  };
  return walk(params, at) as Record<string, unknown>;
};

const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, t: 1e12, tn: 1e12, trillion: 1e12 };

/** "$4.2 billion" → 4.2 with scale 1e9 and one decimal. `undefined` when there is no number. */
export const parseSpoken = (text: string): { n: number; scale: number; decimals: number } | undefined => {
  const m = /(-?\d[\d,]*(?:\.(\d+))?)\s*(k|m|mn|b|bn|t|tn|thousand|million|billion|trillion)?\b/i.exec(text);
  if (!m) return undefined;
  return { n: Number(m[1]!.replace(/,/g, "")), scale: m[3] ? SCALE[m[3].toLowerCase()]! : 1, decimals: m[2]?.length ?? 0 };
};

/** Does the spoken number round to the data? A column may hold billions, or units: either matches. */
export const spokenMatches = (text: string, value: number): boolean => {
  const p = parseSpoken(text);
  if (!p) return false;
  const half = 0.5 * 10 ** -p.decimals;
  return [value, value / p.scale].some((v) => Math.abs(Math.abs(v) - Math.abs(p.n)) <= half + 1e-9);
};

/** Check the numbers a beat says: each is in the line, and rounds to its dataset cell. */
export const checkSpokenNumbers = (
  beat: { line?: string; spoken?: string; numbers?: readonly SpokenNumber[] },
  data: Datasets | undefined,
  at: string,
  diags: Diagnostic[],
): void =>
  (beat.numbers ?? []).forEach((n, i) => {
    const path = `${at}.numbers[${i}]`;
    const said = `${beat.line ?? ""} ${beat.spoken ?? ""}`;
    if (!said.includes(n.text)) diags.push({ level: "error", code: "number-not-said", path: `${path}.text`, message: `"${n.text}" is not in the line`, expected: "the number exactly as the line writes it" });
    const r = resolveRef(n.data, data);
    if (typeof r === "string") return diags.push({ level: "error", code: "data-ref", path: `${path}.data`, message: r });
    if (typeof r.value !== "number") return;
    if (!spokenMatches(n.text, r.value))
      diags.push({ level: "error", code: "number-mismatch", path, message: `the line says "${n.text}" but ${n.data} is ${r.value}`, expected: `a number that rounds to ${r.value}` });
  });

/** One line per dataset for the description: "Costco annual reports (url), retrieved 2026-10-01". */
export const sourceLines = (data: Datasets | undefined): string[] =>
  Object.values(data ?? {}).map((d) => `${d.source.name}${d.source.url ? ` (${d.source.url})` : ""}${d.source.retrieved ? `, retrieved ${d.source.retrieved}` : ""}${d.illustrative ? " [illustrative numbers]" : ""}`);

/** The on-screen credit while a figure built from this dataset is up. */
export const creditOf = (d: Dataset): string => (d.illustrative ? "Illustrative numbers, not real data" : `Source: ${d.source.name}`);
