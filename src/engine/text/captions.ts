import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import type { WordTiming } from "../voice/schema";

export type CaptionLine = {
  /** Absolute start of the line's audio in the video (ms). */
  startMs: number;
  /** Line-relative word timings (script tokens, from prepare). */
  words: readonly WordTiming[];
  /** A voice-over line: its pages are styled apart from dialog. */
  narrator?: boolean;
};

export type CaptionOptions = {
  /** A page holds at most this much speech… */
  maxPageMs?: number;
  /** …and at most this many characters (fits two lines of bold text at 1080 w). */
  maxPageChars?: number;
  /** A page disappears this long after its last word unless the next page replaces it. */
  lingerMs?: number;
};

export type CaptionPage = TikTokPage & {
  endMs: number;
  /** The page belongs to a voice-over line. */
  narrator?: boolean;
  /** The first page of its line (the `.srt` names the narrator there). */
  lineStart?: boolean;
};

/**
 * Word-timed subtitle pages built from **script tokens** (so subtitles show the script
 * exactly), paged with `@remotion/captions`. Pages never span two lines of dialog.
 */
export const buildCaptionPages = (lines: readonly CaptionLine[], opts: CaptionOptions = {}): CaptionPage[] => {
  const maxMs = opts.maxPageMs ?? 1200;
  const maxChars = opts.maxPageChars ?? 26;
  const linger = opts.lingerMs ?? 350;
  const captions: Caption[] = [];
  /** Per caption: its line's index. */
  const lineOf: number[] = [];
  for (const [n, line] of lines.entries()) {
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
      lineOf.push(n);
      chars = nextFits ? nextChars : 0;
      if (!nextFits && next) pageStart = line.startMs + next.startMs;
    });
  }
  // Breaks are all explicit (pageBreakAfter), so the time rule never fires on its own.
  const { pages } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: Number.MAX_SAFE_INTEGER });
  // Pages never span two lines, so each page's first token maps back to its line.
  let token = 0;
  let prevLine = -1;
  return pages.map((p, i) => {
    const lastWord = p.tokens[p.tokens.length - 1]?.toMs ?? p.startMs;
    const nextStart = pages[i + 1]?.startMs ?? Infinity;
    const n = lineOf[token] ?? -1;
    token += p.tokens.length;
    const page: CaptionPage = { ...p, endMs: Math.min(nextStart, lastWord + linger) };
    if (lines[n]?.narrator) page.narrator = true;
    if (n !== prevLine) page.lineStart = true;
    prevLine = n;
    return page;
  });
};

export const pageAt = (pages: readonly CaptionPage[], ms: number): CaptionPage | undefined =>
  pages.find((p) => ms >= p.startMs && ms < p.endMs);
