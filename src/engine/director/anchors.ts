import { normWord } from "../voice/words";
import type { WordTiming } from "../voice/schema";
import type { Anchor } from "./schema";

/** What an anchor resolves against: a spoken line's words, or a silent beat's length. */
export type AnchorContext = {
  /** Line-relative word timings (script tokens); empty for silent beats. */
  words: readonly WordTiming[];
  /** Line (spoken) or beat (silent) length in ms. */
  durationMs: number;
  /** How far before 0 an `ms` anchor may reach (the beat's pause before the line). */
  minMs: number;
  /** How far after `durationMs` an `ms` anchor may reach (the hold after the line). */
  maxMs: number;
};

export type AnchorResult = { ok: true; ms: number } | { ok: false; message: string; expected?: string };

/**
 * Anchor → ms relative to the line start (spoken beats) or beat start (silent beats).
 * A word anchor matches an exact token first ("Forty!"), then the normalized word ("forty");
 * `occurrence` counts matches of whichever rule found the word.
 */
export const resolveAnchor = (anchor: Anchor | undefined, ctx: AnchorContext): AnchorResult => {
  if (!anchor) return { ok: true, ms: 0 };
  if ("ms" in anchor) {
    if (anchor.ms < ctx.minMs || anchor.ms > ctx.maxMs)
      return { ok: false, message: `ms ${anchor.ms} is outside the beat`, expected: `${Math.round(ctx.minMs)} … ${Math.round(ctx.maxMs)}` };
    return { ok: true, ms: anchor.ms };
  }
  if ("fraction" in anchor) return { ok: true, ms: anchor.fraction * ctx.durationMs };
  if (ctx.words.length === 0)
    return { ok: false, message: `word anchor "${anchor.word}" in a beat with no line`, expected: `{ "ms": … } or { "fraction": … }` };
  const exact = ctx.words.filter((w) => w.text === anchor.word);
  const norm = normWord(anchor.word);
  const loose = ctx.words.filter((w) => normWord(w.text) === norm);
  const matches = exact.length >= anchor.occurrence ? exact : loose;
  const hit = matches[anchor.occurrence - 1];
  if (!hit) {
    const words = ctx.words.map((w) => normWord(w.text));
    const found = loose.length;
    return {
      ok: false,
      message:
        found > 0
          ? `"${anchor.word}" occurs ${found} time${found === 1 ? "" : "s"} in the line, not ${anchor.occurrence}`
          : `word "${anchor.word}" is not in the line`,
      expected: found > 0 ? `occurrence 1…${found}` : `one of the line's words: ${[...new Set(words)].join(", ")}`,
    };
  }
  return { ok: true, ms: hit.startMs };
};
