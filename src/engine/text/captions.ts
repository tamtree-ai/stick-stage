import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import type { WordTiming } from "../voice/schema";

export type CaptionLine = {
  /** Absolute start of the line's audio in the video (ms). */
  startMs: number;
  /** Line-relative word timings (script tokens, from prepare). */
  words: readonly WordTiming[];
};

export type CaptionOptions = {
  /** A page holds at most this much speech… */
  maxPageMs?: number;
  /** …and at most this many characters (fits two lines of bold text at 1080 w). */
  maxPageChars?: number;
  /** A page disappears this long after its last word unless the next page replaces it. */
  lingerMs?: number;
};

export type CaptionPage = TikTokPage & { endMs: number };

/**
 * Word-timed subtitle pages built from **script tokens** (so subtitles show the script
 * exactly), paged with `@remotion/captions`. Pages never span two lines of dialog.
 */
export const buildCaptionPages = (lines: readonly CaptionLine[], opts: CaptionOptions = {}): CaptionPage[] => {
  const maxMs = opts.maxPageMs ?? 1200;
  const maxChars = opts.maxPageChars ?? 26;
  const linger = opts.lingerMs ?? 350;
  const captions: Caption[] = [];
  for (const line of lines) {
    let pageStart = 0;
    let chars = 0;
    line.words.forEach((w, i) => {
      const startMs = line.startMs + w.startMs;
      const endMs = line.startMs + w.endMs;
      if (i === 0) pageStart = startMs;
      const next = line.words[i + 1];
      const nextChars = chars + (chars ? 1 : 0) + w.text.length;
      const nextFits =
        next !== undefined &&
        line.startMs + next.endMs - pageStart <= maxMs &&
        nextChars + 1 + next.text.length <= maxChars;
      captions.push({ text: " " + w.text, startMs, endMs, timestampMs: startMs, confidence: 1, pageBreakAfter: !nextFits });
      chars = nextFits ? nextChars : 0;
      if (!nextFits && next) pageStart = line.startMs + next.startMs;
    });
  }
  // Breaks are all explicit (pageBreakAfter), so the time rule never fires on its own.
  const { pages } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: Number.MAX_SAFE_INTEGER });
  return pages.map((p, i) => {
    const lastWord = p.tokens[p.tokens.length - 1]?.toMs ?? p.startMs;
    const nextStart = pages[i + 1]?.startMs ?? Infinity;
    return { ...p, endMs: Math.min(nextStart, lastWord + linger) };
  });
};

export const pageAt = (pages: readonly CaptionPage[], ms: number): CaptionPage | undefined =>
  pages.find((p) => ms >= p.startMs && ms < p.endMs);
