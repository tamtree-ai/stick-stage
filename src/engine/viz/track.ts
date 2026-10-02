/**
 * Compiled figures (timeline data) and their evaluation at a frame: which params hold, how far
 * the reveal is, and the struck-out ghost of a `strike` state change.
 */
import { clamp } from "../lib/math";
import { easeInOutSine } from "../lib/easing";
import type { Reveal } from "./schema";
import type { Typeset } from "./typeset";

export type Params = Record<string, unknown>;

/** Stage rectangle in px (x, y = top-left). */
export type PxRect = { x: number; y: number; w: number; h: number };

export type FigureKey = {
  frame: number;
  durationFrames: number;
  /** Full params after this key (already merged and checked). */
  params: Params;
  style: "morph" | "strike" | "cut";
  label?: string;
};

export type FigureTrack = {
  id: string;
  kind: string;
  rect: PxRect;
  layer: "back" | "front";
  /** Params before any key. */
  base: Params;
  label?: string;
  panel: boolean;
  tag?: string;
  /** When it is on screen, in order: each span shows it (with a reveal) and may hide it. None = never shown. */
  spans: FigureSpan[];
  keys: FigureKey[];
  /** Equation figures: the typeset SVG. */
  typeset?: Typeset;
  /** Image figures: the served file and its credit. */
  image?: { src: string; credit: string; width: number; height: number; impression: boolean };
};

export type FigureSpan = {
  show: { frame: number; durationFrames: number; style: Reveal };
  hide?: { frame: number; durationFrames: number };
};

/** The span a frame falls in (the last one shown by then), if any. */
export const activeSpan = (f: Pick<FigureTrack, "spans">, frame: number): FigureSpan | undefined =>
  [...f.spans].reverse().find((s) => s.show.frame <= frame);

export type FigureState = {
  visible: boolean;
  /** Reveal progress 0…1 (1 once fully shown), and the fade-out on hide. */
  reveal: number;
  style: Reveal;
  opacity: number;
  params: Params;
  label?: string;
  /** Seconds since the figure appeared (drives waves, orbits, particles). */
  t: number;
  /** The struck-out previous state and how far the strike line has drawn (0…1). */
  ghost?: { params: Params; label?: string; strike: number };
};

/** Tween two param trees: numbers interpolate, arrays and objects recurse, anything else switches halfway. */
export const tweenParams = (a: unknown, b: unknown, u: number): unknown => {
  if (u <= 0) return a;
  if (u >= 1) return b;
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length)
    return a.map((x, i) => tweenParams(x, b[i], u));
  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const out: Record<string, unknown> = {};
    const ka = a as Record<string, unknown>;
    const kb = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ka), ...Object.keys(kb)]))
      out[k] = k in ka && k in kb ? tweenParams(ka[k], kb[k], u) : u < 0.5 ? ka[k] : kb[k];
    return out;
  }
  return u < 0.5 ? a : b;
};

/** Deep merge for params: objects merge, arrays and scalars replace. */
export const mergeParams = (a: Params, b: Params): Params => {
  const out: Params = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    out[k] =
      v &&
      prev &&
      typeof v === "object" &&
      typeof prev === "object" &&
      !Array.isArray(v) &&
      !Array.isArray(prev)
        ? mergeParams(prev as Params, v as Params)
        : v;
  }
  return out;
};

export const STRIKE_FRAMES = 8;

export const evalFigure = (f: FigureTrack, frame: number, fps: number): FigureState => {
  const span = activeSpan(f, frame);
  const hidden: FigureState = {
    visible: false,
    reveal: 0,
    style: "none",
    opacity: 0,
    params: f.base,
    label: f.label,
    t: 0,
  };
  if (!span) return hidden;
  const { show, hide } = span;
  const hideU = hide
    ? clamp((frame - hide.frame) / Math.max(1, hide.durationFrames), 0, 1)
    : 0;
  if (hideU >= 1) return hidden;
  let params = f.base;
  let label = f.label;
  let ghost: FigureState["ghost"];
  for (const k of f.keys) {
    if (frame < k.frame) break;
    const u =
      k.style === "cut" ? 1 : easeInOutSine((frame - k.frame) / Math.max(1, k.durationFrames));
    if (k.style === "strike") {
      ghost = { params, label, strike: clamp((frame - k.frame) / STRIKE_FRAMES, 0, 1) };
      // The new state draws on after the strike line.
      params = k.params;
      label = k.label ?? label;
      continue;
    }
    params = u >= 1 ? k.params : (tweenParams(params, k.params, u) as Params);
    label = u >= 0.5 ? (k.label ?? label) : label;
  }
  const revealFrames = Math.max(1, show.durationFrames);
  const reveal = show.style === "none" ? 1 : clamp((frame - show.frame) / revealFrames, 0, 1);
  return {
    visible: true,
    reveal: easeInOutSine(reveal),
    style: show.style,
    opacity: 1 - hideU,
    params,
    label,
    t: (frame - show.frame) / fps,
    ghost,
  };
};

/** How far the redraw after a strike has got (0…1), for drawers that draw on. */
export const strikeRedraw = (f: FigureTrack, frame: number): number => {
  const k = [...f.keys].reverse().find((x) => x.style === "strike" && x.frame <= frame);
  if (!k) return 1;
  return easeInOutSine(
    clamp((frame - k.frame - STRIKE_FRAMES) / Math.max(1, k.durationFrames), 0, 1),
  );
};
