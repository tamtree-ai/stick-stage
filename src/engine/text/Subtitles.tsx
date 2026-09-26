import React from "react";
import { easeOutBack } from "../lib/easing";
import { clamp } from "../lib/math";
import { pageAt, type CaptionPage } from "./captions";
import { SUBTITLE } from "./layout";
import { safeRect, type SafeArea } from "./safeArea";

export type TextStyle = {
  fontFamily: string;
  /** Fill for normal words. */
  color?: string;
  /** Fill for the word being spoken. */
  highlight?: string;
  outline?: string;
};

export type SubtitlesProps = {
  pages: readonly CaptionPage[];
  frame: number;
  fps: number;
  width: number;
  height: number;
  safeArea: SafeArea;
  style: TextStyle;
  /** Vertical center of the caption block, fraction of frame height (clamped to the safe area). */
  y?: number;
  fontSize?: number;
  /** Hide (e.g. while slam text shows the same word). */
  hidden?: boolean;
};

/** Frames for a new page to pop in. */
const POP_FRAMES = 3;

/**
 * Bold outlined word-timed subtitles. The spoken word gets a second cue besides color: it
 * lifts and grows slightly, so it still reads without color (and in grayscale previews).
 * Spaces are separate text nodes so the grown word never eats its neighbours' gaps.
 */
export const Subtitles: React.FC<SubtitlesProps> = ({ pages, frame, fps, width, height, safeArea, style, y = SUBTITLE.y, fontSize = SUBTITLE.fontSize, hidden }) => {
  if (hidden) return null;
  const ms = (frame / fps) * 1000;
  const page = pageAt(pages, ms);
  if (!page) return null;
  const safe = safeRect(safeArea, width, height);
  const cy = clamp(y * height, safe.y + fontSize * 1.3, safe.y + safe.h - fontSize * 1.3);
  const pageFrame = frame - (page.startMs / 1000) * fps;
  const pop = 0.86 + 0.14 * easeOutBack(pageFrame / POP_FRAMES, 2);
  const outline = style.outline ?? SUBTITLE.outline;
  return (
    <div
      style={{
        position: "absolute",
        left: safe.x,
        width: safe.w,
        top: cy,
        transform: `translateY(-50%) scale(${pop.toFixed(3)})`,
        textAlign: "center",
        fontFamily: style.fontFamily,
        fontWeight: 800,
        fontSize,
        lineHeight: SUBTITLE.lineHeight,
        color: style.color ?? SUBTITLE.fill,
        WebkitTextStroke: `${Math.round(fontSize * 0.2)}px ${outline}`,
        paintOrder: "stroke fill",
        whiteSpace: "pre-wrap",
        textShadow: `0 ${Math.round(fontSize * 0.08)}px 0 ${outline}`,
      }}
    >
      {page.tokens.map((t, i) => {
        const active = ms >= t.fromMs && ms < t.toMs;
        const word = t.text.trimStart();
        return (
          <React.Fragment key={i}>
            {i > 0 ? " " : null}
            <span
              style={{
                display: "inline-block",
                color: active ? (style.highlight ?? SUBTITLE.highlight) : undefined,
                transform: active ? `translateY(${(-fontSize * 0.1).toFixed(1)}px) scale(1.05)` : undefined,
              }}
            >
              {word}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
