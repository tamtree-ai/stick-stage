import { clamp } from "../lib/math";
import { safeRect, type Rect, type SafeArea } from "./safeArea";

/**
 * Text overlay geometry shared by the components and the visual QA checks, so the checks
 * measure what is drawn. Widths are estimates for the bold sans text font (Montserrat 700–900).
 */
export const SUBTITLE = { y: 0.62, fontSize: 74, lineHeight: 1.15, fill: "#ffffff", highlight: "#ffd84a", outline: "#111114" } as const;
export const POV = { fontSize: 52, lineHeight: 1.18, fill: "#16161a", card: "#ffffff" } as const;
export const SLAM = { y: 0.64, fontSize: 190, lineHeight: 1, fill: "#ffffff", outline: "#111114" } as const;

/** Advance width of one character in em (bold geometric sans). */
const charEm = (ch: string): number => {
  if (ch === " ") return 0.28;
  if (/[.,:;!'|]/.test(ch)) return 0.3;
  if (/[MW]/.test(ch)) return 0.95;
  if (/[A-Z0-9?]/.test(ch)) return 0.72;
  if (/[mw]/.test(ch)) return 0.88;
  if (/[ijlft]/.test(ch)) return 0.34;
  return 0.6;
};

export const textWidth = (text: string, fontSize: number): number => [...text].reduce((w, ch) => w + charEm(ch) * fontSize, 0);

/** Greedy word wrap at `maxWidth` px. */
export const wrapLines = (text: string, fontSize: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, fontSize) > maxWidth) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
};

const around = (cx: number, cy: number, w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h });

/** Subtitle block for a page of text (the component centers it on `y`, clamped into the safe area). */
export const subtitleRect = (text: string, width: number, height: number, sa: SafeArea, y: number = SUBTITLE.y, fontSize: number = SUBTITLE.fontSize) => {
  const safe = safeRect(sa, width, height);
  const cy = clamp(y * height, safe.y + fontSize * 1.3, safe.y + safe.h - fontSize * 1.3);
  const lines = wrapLines(text, fontSize, safe.w);
  const w = Math.max(...lines.map((l) => textWidth(l, fontSize)));
  // Outline + drop shadow add ~0.2 em around the glyphs.
  return { rect: around(width / 2, cy, w + fontSize * 0.2, lines.length * fontSize * SUBTITLE.lineHeight + fontSize * 0.2), lines: lines.length };
};

/** POV card (top of the safe area). */
export const povRect = (text: string, width: number, height: number, sa: SafeArea, fontSize: number = POV.fontSize) => {
  const safe = safeRect(sa, width, height);
  const padX = fontSize * 0.55;
  const border = Math.round(fontSize * 0.1);
  const inner = safe.w * 0.94 - 2 * padX - 2 * border;
  const lines = wrapLines(text, fontSize, inner);
  const w = Math.min(safe.w * 0.94, Math.max(...lines.map((l) => textWidth(l, fontSize))) + 2 * padX + 2 * border);
  const h = lines.length * fontSize * POV.lineHeight + 2 * fontSize * 0.34 + 2 * border + fontSize * 0.12;
  return { rect: { x: width / 2 - w / 2, y: safe.y + 16, w, h }, lines: lines.length };
};

/** Slam text at rest (after the drop-in). */
export const slamRect = (text: string, width: number, height: number, sa: SafeArea, y: number = SLAM.y, fontSize: number = SLAM.fontSize) => {
  const safe = safeRect(sa, width, height);
  const lines = wrapLines(text, fontSize, safe.w);
  const w = Math.max(...lines.map((l) => textWidth(l, fontSize)));
  return { rect: around(width / 2, y * height, w + fontSize * 0.26, lines.length * fontSize * SLAM.lineHeight + fontSize * 0.2), lines: lines.length };
};

export const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** `inner` inside `outer`, allowing `tol` px of overhang. */
export const inside = (inner: Rect, outer: Rect, tol = 0): boolean =>
  inner.x >= outer.x - tol && inner.y >= outer.y - tol && inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;
