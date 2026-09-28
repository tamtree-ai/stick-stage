import { clamp } from "../lib/math";
import { safeRect, type Rect, type SafeArea } from "./safeArea";

/**
 * Text overlay geometry shared by the components and the visual QA checks, so the checks
 * measure what is drawn. Widths are estimates for the bold sans text font (Montserrat 700–900).
 */
export const SUBTITLE = { y: 0.62, fontSize: 74, lineHeight: 1.15, fill: "#ffffff", highlight: "#ffd84a", outline: "#111114", box: "#16161aee" } as const;
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
  if (ch.charCodeAt(0) > 0x2ff) return 1;
  return 0.6;
};

export const textWidth = (text: string, fontSize: number): number => [...text].reduce((w, ch) => w + charEm(ch) * fontSize, 0);

/** Greedy word wrap at `maxWidth` px. */
export const wrapLines = (text: string, fontSize: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  let cur = "";
  const push = (word: string, spaced: boolean) => {
    const next = cur ? (spaced ? `${cur} ${word}` : cur + word) : word;
    if (cur && textWidth(next, fontSize) > maxWidth) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  };
  for (const word of text.trim().split(/\s+/)) {
    const breakChars = /[\u3000-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(word) && textWidth(word, fontSize) > maxWidth;
    if (!breakChars) push(word, true);
    else for (const ch of word) push(ch, false);
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
  return { rect: around(safe.x + safe.w / 2, cy, w + fontSize * 0.2, lines.length * fontSize * SUBTITLE.lineHeight + fontSize * 0.2), lines: lines.length };
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
  return { rect: { x: safe.x + safe.w / 2 - w / 2, y: safe.y + 16, w, h }, lines: lines.length };
};

/** Smallest slam size we'll shrink to before accepting overflow. */
export const SLAM_MIN_FONT = 96;
/** A one-line slam is preferred down to this size, then it may take two lines. */
const SLAM_ONE_LINE_MIN = 130;

export type SlamLayout = { fontSize: number; lines: number; cy: number; rect: Rect };

/**
 * Slam text layout: the biggest size (≤ `max`) that fits the safe width on one line (down to
 * 130 px), else on two lines; the block's center is `y`, pulled up so it stays in the safe area.
 */
export const slamLayout = (text: string, width: number, height: number, sa: SafeArea, y: number = SLAM.y, max: number = SLAM.fontSize): SlamLayout => {
  const safe = safeRect(sa, width, height);
  const w = safe.w * 0.94;
  const fits = (fs: number, n: number) => {
    const lines = wrapLines(text, fs, w);
    return lines.length <= n && lines.every((l) => textWidth(l, fs) <= w) ? lines : undefined;
  };
  let fontSize = SLAM_MIN_FONT;
  let lines = wrapLines(text, SLAM_MIN_FONT, w);
  search: for (const [n, floor] of [[1, SLAM_ONE_LINE_MIN], [2, SLAM_MIN_FONT]] as const)
    for (let fs = max; fs >= floor; fs -= 6) {
      const got = fits(fs, n);
      if (got) {
        [fontSize, lines] = [fs, got];
        break search;
      }
    }
  const bw = Math.max(...lines.map((l) => textWidth(l, fontSize))) + fontSize * 0.26;
  const bh = lines.length * fontSize * SLAM.lineHeight + fontSize * 0.2;
  const cy = Math.max(safe.y + bh / 2, Math.min(y * height, safe.y + safe.h - bh / 2));
  return { fontSize, lines: lines.length, cy, rect: around(safe.x + safe.w / 2, cy, bw, bh) };
};

/** Slam text at rest (after the drop-in). */
export const slamRect = (text: string, width: number, height: number, sa: SafeArea, y: number = SLAM.y, max: number = SLAM.fontSize) => slamLayout(text, width, height, sa, y, max);

export const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** `inner` inside `outer`, allowing `tol` px of overhang. */
export const inside = (inner: Rect, outer: Rect, tol = 0): boolean =>
  inner.x >= outer.x - tol && inner.y >= outer.y - tol && inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;

/**
 * Explainer text (cards, lists) lives in the upper-middle band: from the top safe edge down to
 * just above the subtitles, which keep their place under it.
 */
export const textBand = (width: number, height: number, sa: SafeArea): Rect => {
  const safe = safeRect(sa, width, height);
  const bottom = SUBTITLE.y * height - SUBTITLE.fontSize * 1.5;
  return { x: safe.x, y: safe.y, w: safe.w, h: Math.max(0, bottom - safe.y) };
};

export const CARD = { fontSize: 190, minFontSize: 96, lineHeight: 1, kickerSize: 56, maxLines: 3, fill: "#ffffff", outline: "#111114", scrim: "rgba(17,17,20,0.62)" } as const;

export type CardLayout = {
  fontSize: number;
  lines: string[];
  /** Center of each title line (px). */
  lineY: number[];
  kicker?: { fontSize: number; lines: string[]; rect: Rect };
  /** The title block. */
  rect: Rect;
  /** Fits the band at `minFontSize` or larger, in at most `maxLines` lines. */
  fits: boolean;
};

/**
 * Title card: the biggest title size (190 → 96 px) whose stacked lines fit the band under the
 * kicker. `\n` in the title forces the line breaks; otherwise words wrap.
 */
export const cardLayout = (title: string, kicker: string | undefined, width: number, height: number, sa: SafeArea): CardLayout => {
  const band = textBand(width, height, sa);
  const w = band.w * 0.94;
  const forced = title.includes("\n") ? title.split("\n").map((l) => l.trim()).filter(Boolean) : undefined;
  const kLines = kicker ? wrapLines(kicker, CARD.kickerSize, w) : [];
  const kH = kLines.length ? kLines.length * CARD.kickerSize * 1.2 + CARD.kickerSize * 0.6 : 0;
  const titleH = (n: number, fs: number) => n * fs * CARD.lineHeight + fs * 0.2;
  const tryAt = (fs: number) => {
    const lines = forced ?? wrapLines(title, fs, w);
    const ok = lines.length <= CARD.maxLines && lines.every((l) => textWidth(l, fs) <= w) && kH + titleH(lines.length, fs) <= band.h;
    return { lines, ok };
  };
  let fontSize: number = CARD.minFontSize;
  let { lines, ok: fits } = tryAt(fontSize);
  for (let fs = CARD.fontSize; fs >= CARD.minFontSize; fs -= 6) {
    const got = tryAt(fs);
    if (got.ok) {
      [fontSize, lines, fits] = [fs, got.lines, true];
      break;
    }
  }
  const tH = titleH(lines.length, fontSize);
  // The block (kicker + title) sits centered in the band.
  const top = band.y + Math.max(0, (band.h - kH - tH) / 2);
  const cx = band.x + band.w / 2;
  const tw = Math.max(...lines.map((l) => textWidth(l, fontSize))) + fontSize * 0.26;
  const rect = { x: cx - tw / 2, y: top + kH, w: tw, h: tH };
  const lineY = lines.map((_, i) => top + kH + fontSize * 0.1 + (i + 0.5) * fontSize * CARD.lineHeight);
  const kw = kLines.length ? Math.max(...kLines.map((l) => textWidth(l, CARD.kickerSize))) + CARD.kickerSize : 0;
  return {
    fontSize,
    lines,
    lineY,
    kicker: kLines.length ? { fontSize: CARD.kickerSize, lines: kLines, rect: { x: cx - kw / 2, y: top, w: kw, h: kH - CARD.kickerSize * 0.4 } } : undefined,
    rect,
    fits,
  };
};

export const LIST = { fontSize: 104, minFontSize: 60, lineHeight: 1.3, fill: "#ffffff", outline: "#111114" } as const;

export type ListLayout = { fontSize: number; itemY: number[]; rects: Rect[]; fits: boolean };

/** List reveal: one line per item, the biggest size (104 → 60 px) that fits them all, from the top of the band (faces go under it). */
export const listLayout = (items: readonly string[], width: number, height: number, sa: SafeArea): ListLayout => {
  const band = textBand(width, height, sa);
  const w = band.w * 0.94;
  const blockH = (fs: number) => items.length * fs * LIST.lineHeight;
  const fitsAt = (fs: number) => items.every((t) => textWidth(t, fs) <= w) && blockH(fs) + fs * 0.2 <= band.h;
  let fontSize: number = LIST.minFontSize;
  for (let fs = LIST.fontSize; fs >= LIST.minFontSize; fs -= 4)
    if (fitsAt(fs)) {
      fontSize = fs;
      break;
    }
  const top = band.y + fontSize * 0.2;
  const cx = band.x + band.w / 2;
  const itemY = items.map((_, i) => top + (i + 0.5) * fontSize * LIST.lineHeight);
  const rects = items.map((t, i) => {
    const tw = textWidth(t, fontSize) + fontSize * 0.3;
    return around(cx, itemY[i]!, tw, fontSize * 1.1);
  });
  return { fontSize, itemY, rects, fits: fitsAt(fontSize) };
};
