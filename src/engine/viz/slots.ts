/**
 * Named figure slots: a layout grid per frame, so a writer (or a model) picks `"slot": "left"`
 * instead of coordinates. 16:9 keeps the bottom band for captions; 9:16 keeps the old band above
 * the heads. A slot is a `FigureRect` (centre and size as fractions of the frame).
 */
import type { FigureRect } from "./schema";

export const SLOTS = ["full", "left", "right", "center", "top", "lower-third", "inset"] as const;
export type Slot = (typeof SLOTS)[number];

const r = (x: number, y: number, w: number, h: number): FigureRect => ({ x, y, w, h });

const WIDE: Record<Slot, FigureRect> = {
  full: r(0.5, 0.45, 0.84, 0.6),
  left: r(0.27, 0.45, 0.4, 0.6),
  right: r(0.73, 0.45, 0.4, 0.6),
  center: r(0.5, 0.45, 0.46, 0.5),
  top: r(0.5, 0.13, 0.84, 0.12),
  "lower-third": r(0.29, 0.79, 0.48, 0.08),
  inset: r(0.83, 0.24, 0.24, 0.26),
};

const TALL: Record<Slot, FigureRect> = {
  full: r(0.5, 0.33, 0.86, 0.3),
  left: r(0.27, 0.33, 0.42, 0.24),
  right: r(0.73, 0.33, 0.42, 0.24),
  center: r(0.5, 0.33, 0.6, 0.22),
  top: r(0.5, 0.17, 0.86, 0.06),
  "lower-third": r(0.5, 0.56, 0.8, 0.05),
  inset: r(0.78, 0.22, 0.34, 0.14),
};

export const slotRect = (slot: Slot, width: number, height: number): FigureRect => (width > height ? WIDE : TALL)[slot];
