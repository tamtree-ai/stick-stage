/**
 * Prepare step for equations: TeX → MathJax SVG (no fonts, no network) → the parts the engine
 * reveals one by one. A `\class{t-name}{…}` group stays one part (a term a beat can light up);
 * everything else splits at the top level of the formula. Cached by a hash of the TeX.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import type { LiteElement, LiteNode } from "mathjax-full/js/adaptors/lite/Element.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { TypesetSchema, type Typeset, type TypesetPart } from "../engine/core";

/** Bump when the output for the same TeX changes. */
export const TYPESET_VERSION = 1;

type M = [number, number, number, number, number, number];
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** SVG `transform` → matrix (translate, scale, matrix: what MathJax writes). */
export const parseTransform = (t: string | undefined): M => {
  let m = I;
  for (const [, fn, args] of (t ?? "").matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = args!.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = mul(m, [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0]);
    else if (fn === "scale") m = mul(m, [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0]);
    else if (fn === "matrix" && n.length === 6) m = mul(m, n as M);
  }
  return m;
};

/** Every coordinate a path visits (control points included: a slightly generous box). */
export const pathPoints = (d: string): [number, number][] => {
  const toks = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const out: [number, number][] = [];
  let cx = 0;
  let cy = 0;
  let cmd = "M";
  let i = 0;
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i]!)) cmd = toks[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") continue;
    if (C === "H") cx = (rel ? cx : 0) + num();
    else if (C === "V") cy = (rel ? cy : 0) + num();
    else if (C === "A") {
      i += 5;
      const x = num();
      const y = num();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
    } else {
      const pairs = C === "C" ? 3 : C === "Q" || C === "S" ? (C === "S" ? 2 : 2) : 1;
      let nx = cx;
      let ny = cy;
      for (let k = 0; k < pairs; k++) {
        const x = num();
        const y = num();
        nx = rel ? cx + x : x;
        ny = rel ? cy + y : y;
        out.push([nx, ny]);
      }
      cx = nx;
      cy = ny;
      if (C === "M") cmd = rel ? "l" : "L";
    }
    out.push([cx, cy]);
  }
  return out;
};

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", { InputJax: new TeX({ packages: AllPackages }), OutputJax: new SVG({ fontCache: "none" }) });

const isEl = (n: LiteNode): n is LiteElement => adaptor.kind(n) !== "#text" && adaptor.kind(n) !== "#comment";
const attr = (n: LiteElement, k: string) => adaptor.getAttribute(n, k) as string | undefined;
const termClass = (n: LiteElement) => (attr(n, "class") ?? "").split(/\s+/).find((c) => c.startsWith("t-"));
const STRUCTURAL = new Set(["math", "mrow", "TeXAtom", "mstyle", "semantics", "inferredMrow"]);

const hasTerm = (n: LiteElement): boolean => !!termClass(n) || adaptor.childNodes(n).some((c) => isEl(c) && hasTerm(c));

/** Bounding box of an element's drawing under matrix `m` (y down after MathJax's flip). */
const boxOf = (n: LiteElement, m: M, acc: { x0: number; y0: number; x1: number; y1: number }) => {
  const mm = mul(m, parseTransform(attr(n, "transform")));
  const tag = adaptor.kind(n);
  const add = (x: number, y: number) => {
    const [px, py] = apply(mm, x, y);
    acc.x0 = Math.min(acc.x0, px);
    acc.y0 = Math.min(acc.y0, py);
    acc.x1 = Math.max(acc.x1, px);
    acc.y1 = Math.max(acc.y1, py);
  };
  if (tag === "path") for (const [x, y] of pathPoints(attr(n, "d") ?? "")) add(x, y);
  if (tag === "rect") {
    const [x, y, w, h] = ["x", "y", "width", "height"].map((k) => Number(attr(n, k) ?? 0)) as [number, number, number, number];
    add(x, y);
    add(x + w, y + h);
  }
  for (const c of adaptor.childNodes(n)) if (isEl(c)) boxOf(c, mm, acc);
};

const matrixAttr = (m: M) => `matrix(${m.map((v) => +v.toFixed(4)).join(" ")})`;

/** TeX → typeset parts. Throws on TeX MathJax can't read. */
export const typeset = (tex: string): Typeset => {
  const node = doc.convert(tex, { display: true }) as LiteElement;
  const svg = adaptor.childNodes(node).find((c) => isEl(c) && adaptor.kind(c) === "svg") as LiteElement | undefined;
  if (!svg) throw new Error(`MathJax produced no SVG for ${tex}`);
  const err = adaptor.outerHTML(svg).match(/data-mjx-error="([^"]*)"/);
  if (err) throw new Error(`TeX error in "${tex}": ${err[1]}`);
  const vb = (attr(svg, "viewBox") ?? "0 0 1 1").split(/\s+/).map(Number) as [number, number, number, number];
  const parts: TypesetPart[] = [];
  const emit = (n: LiteElement, parent: M) => {
    const cls = termClass(n);
    const mml = attr(n, "data-mml-node");
    const own = mul(parent, parseTransform(attr(n, "transform")));
    if (!cls && ((mml && STRUCTURAL.has(mml)) || (!mml && adaptor.kind(n) === "g") || hasTerm(n))) {
      const kids = adaptor.childNodes(n).filter(isEl);
      if (kids.length) {
        for (const c of kids) emit(c, own);
        return;
      }
    }
    const acc = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    boxOf(n, parent, acc);
    if (!Number.isFinite(acc.x0)) return;
    parts.push({
      ...(cls ? { cls } : {}),
      markup: `<g transform="${matrixAttr(parent)}">${adaptor.outerHTML(n)}</g>`,
      box: [acc.x0, acc.y0, acc.x1 - acc.x0, acc.y1 - acc.y0].map((v) => +v.toFixed(1)) as [number, number, number, number],
    });
  };
  for (const c of adaptor.childNodes(svg)) if (isEl(c)) emit(c, I);
  parts.sort((a, b) => a.box[0] - b.box[0]);
  return TypesetSchema.parse({ tex, viewBox: vb, parts });
};

const hashOf = (tex: string) => crypto.createHash("sha256").update(`${TYPESET_VERSION}:${tex}`).digest("hex").slice(0, 20);

/** Typeset each TeX once per cache directory. */
export const typesetCached = (texs: readonly string[], cacheDir: string): { equations: Record<string, Typeset>; hits: number } => {
  fs.mkdirSync(cacheDir, { recursive: true });
  const equations: Record<string, Typeset> = {};
  let hits = 0;
  for (const tex of texs) {
    const file = path.join(cacheDir, `eq-${hashOf(tex)}.json`);
    if (fs.existsSync(file)) {
      equations[tex] = TypesetSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
      hits++;
      continue;
    }
    const t = typeset(tex);
    fs.writeFileSync(file, JSON.stringify(t));
    equations[tex] = t;
  }
  return { equations, hits };
};
