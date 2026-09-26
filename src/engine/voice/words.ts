import type { MouthCue, WordTiming } from "./schema";

export type Token = { text: string; norm: string };

/** Lowercase, straight apostrophes, letters/digits/apostrophes only. Used for matching. */
export const normWord = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, "")
    .replace(/^'+|'+$/g, "");

/**
 * Script text → display tokens. Splits on whitespace; a token with no letters or digits
 * ("—", "...") joins the previous token, so `tokens.map(t => t.text).join(" ")` gives back
 * the script with whitespace normalized.
 */
export const tokenize = (text: string): Token[] => {
  const out: Token[] = [];
  for (const raw of text.trim().split(/\s+/)) {
    if (!raw) continue;
    const norm = normWord(raw);
    const prev = out[out.length - 1];
    if (!norm && prev) prev.text += " " + raw;
    else out.push({ text: raw, norm });
  }
  return out;
};

const syllables = (norm: string): number =>
  Math.max(1, (norm.match(/[aeiouy]+/g) ?? []).length + (norm.match(/\p{N}/gu) ?? []).length);

/** Pause after a token, in syllable units, from its trailing punctuation. */
const pauseAfter = (text: string): number => {
  if (/[.!?]["')\]]*$/.test(text)) return 2;
  if (/(—|--|\.\.\.|…)$/.test(text)) return 1.5;
  if (/[,;:]["')\]]*$/.test(text)) return 1.2;
  return 0.25;
};

/** Spread tokens across [fromMs, toMs] in proportion to syllables, with punctuation pauses. */
const spread = (tokens: readonly Token[], fromMs: number, toMs: number): WordTiming[] => {
  const units = tokens.map((t, i) => ({ speak: syllables(t.norm), gap: i < tokens.length - 1 ? pauseAfter(t.text) : 0 }));
  const total = units.reduce((s, u) => s + u.speak + u.gap, 0) || 1;
  const per = Math.max(0, toMs - fromMs) / total;
  let at = fromMs;
  return tokens.map((t, i) => {
    const startMs = at;
    const endMs = at + units[i]!.speak * per;
    at = endMs + units[i]!.gap * per;
    return { text: t.text, startMs: Math.round(startMs), endMs: Math.round(endMs) };
  });
};

/** TTS audio usually has a little silence at each end. */
const LEAD_MS = 60;
const TAIL_MS = 120;

/** Estimated word timings when the voice source gives none. */
export const estimateWords = (text: string, durationMs: number): WordTiming[] => {
  const pad = durationMs > 600;
  return spread(tokenize(text), pad ? LEAD_MS : 0, durationMs - (pad ? TAIL_MS : 0));
};

export type TimedWord = { text: string; startMs: number; endMs?: number };

/**
 * Map provider word timings onto the script tokens. Words are matched in order by normalized
 * text (with a small lookahead, so a provider that splits "don't" or reads "3" as "three"
 * doesn't derail the rest); script tokens without a match are spread across the gap between
 * their matched neighbors.
 */
export const alignWords = (text: string, durationMs: number, timed?: readonly TimedWord[]): WordTiming[] => {
  if (!timed || timed.length === 0) return estimateWords(text, durationMs);
  const tokens = tokenize(text);
  const src = timed.map((w, i) => ({
    norm: normWord(w.text),
    startMs: w.startMs,
    endMs: w.endMs ?? timed[i + 1]?.startMs ?? durationMs,
    explicitEnd: w.endMs !== undefined,
  }));
  const hit: (typeof src)[number][] = [];
  let j = 0;
  for (let i = 0; i < tokens.length && j < src.length; i++) {
    const look = src.slice(j, j + 4).findIndex((w) => w.norm === tokens[i]!.norm);
    if (look < 0) continue;
    hit[i] = src[j + look]!;
    j += look + 1;
  }
  const out: WordTiming[] = [];
  let i = 0;
  while (i < tokens.length) {
    const h = hit[i];
    let k = i + 1;
    while (k < tokens.length && !hit[k]) k++;
    const nextStart = hit[k]?.startMs ?? durationMs;
    if (h && (h.explicitEnd || k === i + 1)) {
      // A matched word with a real end: keep it, then spread any unmatched run after it.
      out.push({ text: tokens[i]!.text, startMs: h.startMs, endMs: Math.max(h.startMs, h.endMs) });
      if (k > i + 1) out.push(...spread(tokens.slice(i + 1, k), out[out.length - 1]!.endMs, Math.max(out[out.length - 1]!.endMs, nextStart)));
    } else {
      // Only a start is known (e.g. one mark per phrase): the run shares the span up to the next hit.
      const from = h ? h.startMs : out.length ? out[out.length - 1]!.endMs : 0;
      out.push(...spread(tokens.slice(i, k), from, Math.max(from, nextStart)));
    }
    i = k;
  }
  // Words never overlap the next word.
  for (let n = 0; n < out.length - 1; n++) out[n]!.endMs = Math.min(out[n]!.endMs, out[n + 1]!.startMs);
  return out;
};

const CYCLE = ["C", "B", "D", "B", "E", "C"] as const;

/**
 * Fallback mouth cues from word timings (no audio analysis): one open shape per syllable,
 * rest between words. Only used when Rhubarb is unavailable; prepare reports it.
 */
export const estimateMouthCues = (words: readonly WordTiming[]): MouthCue[] => {
  const cues: MouthCue[] = [];
  let at = 0;
  let n = 0;
  for (const w of words) {
    if (w.startMs > at) cues.push({ startMs: at, endMs: w.startMs, shape: "X" });
    const syl = syllables(normWord(w.text));
    const step = (w.endMs - w.startMs) / syl;
    for (let s = 0; s < syl; s++) {
      cues.push({ startMs: Math.round(w.startMs + s * step), endMs: Math.round(w.startMs + (s + 1) * step), shape: CYCLE[n++ % CYCLE.length]! });
    }
    at = w.endMs;
  }
  cues.push({ startMs: at, endMs: at + 1, shape: "X" });
  return cues;
};

export type Span = { startMs: number; endMs: number };

/**
 * Pick which punctuation breaks the audio's pauses fall on: choose `k` increasing break
 * positions whose cumulative syllable share best matches each pause's cumulative talk share
 * (least squares, small DP). Returns token indices that end each group but the last.
 */
const matchBreaks = (candidates: readonly number[], cumShare: readonly number[], pauseShare: readonly number[]): number[] => {
  const k = pauseShare.length;
  const m = candidates.length;
  const cost = (j: number, c: number) => (cumShare[candidates[c]!]! - pauseShare[j]!) ** 2;
  const dp: number[][] = Array.from({ length: k }, () => new Array<number>(m).fill(Infinity));
  const from: number[][] = Array.from({ length: k }, () => new Array<number>(m).fill(-1));
  for (let c = 0; c < m; c++) dp[0]![c] = cost(0, c);
  for (let j = 1; j < k; j++)
    for (let c = j; c < m; c++)
      for (let p = j - 1; p < c; p++) {
        const v = dp[j - 1]![p]! + cost(j, c);
        if (v < dp[j]![c]!) {
          dp[j]![c] = v;
          from[j]![c] = p;
        }
      }
  let c = dp[k - 1]!.indexOf(Math.min(...dp[k - 1]!));
  const out: number[] = [];
  for (let j = k - 1; j >= 0; j--) {
    out.unshift(candidates[c]!);
    c = from[j]![c]!;
  }
  return out;
};

/**
 * Estimated word timings that respect the audio's pauses (from silence detection). When the
 * pauses can be matched to punctuation (the usual case), each phrase is spread over its own
 * spoken span. Otherwise words are spread over the spoken time with pauses removed, and a
 * word that would straddle a pause moves to the side it mostly falls on.
 */
export const estimateWordsInSpans = (text: string, spans: readonly Span[], durationMs: number): WordTiming[] => {
  const talk = spans.reduce((s, x) => s + x.endMs - x.startMs, 0);
  if (spans.length === 0 || talk <= 0) return estimateWords(text, durationMs);
  const tokens = tokenize(text);
  const weights = tokens.map((t) => syllables(t.norm));
  const total = weights.reduce((a, b) => a + b, 0);

  const candidates = tokens.flatMap((t, i) => (i < tokens.length - 1 && pauseAfter(t.text) >= 1.2 ? [i] : []));
  if (spans.length > 1 && candidates.length >= spans.length - 1) {
    const cumShare: number[] = [];
    weights.reduce((acc, w, i) => (cumShare[i] = (acc + w) / total, acc + w), 0);
    const pauseShare: number[] = [];
    spans.slice(0, -1).reduce((acc, sp, j) => (pauseShare[j] = (acc + sp.endMs - sp.startMs) / talk, acc + sp.endMs - sp.startMs), 0);
    const ends = [...matchBreaks(candidates, cumShare, pauseShare), tokens.length - 1];
    let first = 0;
    return ends.flatMap((last, j) => {
      const group = spread(tokens.slice(first, last + 1), spans[j]!.startMs, spans[j]!.endMs);
      first = last + 1;
      return group;
    });
  }

  // Virtual "talk time" (pauses removed) → real time.
  const toReal = (v: number): { ms: number; span: number } => {
    let acc = 0;
    for (let i = 0; i < spans.length; i++) {
      const len = spans[i]!.endMs - spans[i]!.startMs;
      if (v <= acc + len || i === spans.length - 1) return { ms: spans[i]!.startMs + Math.min(len, v - acc), span: i };
      acc += len;
    }
    return { ms: durationMs, span: spans.length - 1 };
  };
  let v = 0;
  return tokens.map((t, i) => {
    const v0 = v;
    v += (weights[i]! / total) * talk;
    const a = toReal(v0 + 0.001);
    const b = toReal(v - 0.001);
    if (a.span === b.span) return { text: t.text, startMs: Math.round(a.ms), endMs: Math.round(b.ms) };
    const first = spans[a.span]!;
    const last = spans[b.span]!;
    return first.endMs - a.ms >= b.ms - last.startMs
      ? { text: t.text, startMs: Math.round(a.ms), endMs: first.endMs }
      : { text: t.text, startMs: last.startMs, endMs: Math.round(b.ms) };
  });
};

/**
 * Word timings from whisper.cpp JSON output (`-oj`, run with `-ml 1 -sow` so each segment is
 * one word). Offsets are in ms. Empty and bracketed segments ("[MUSIC]") are dropped.
 */
export const parseWhisperJson = (json: unknown): TimedWord[] => {
  const segs = (json as { transcription?: { offsets?: { from: number; to: number }; text?: string }[] }).transcription ?? [];
  return segs.flatMap((s) => {
    const text = (s.text ?? "").trim();
    if (!text || /^[[(].*[\])]$/.test(text) || !s.offsets) return [];
    return [{ text, startMs: s.offsets.from, endMs: s.offsets.to }];
  });
};
