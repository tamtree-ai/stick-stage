import type { Beat } from "../director/schema";
import type { BeatSpan, Program } from "../director/timeline";
import type { Finding } from "./types";

/**
 * Shorts pacing (`pace: "fast"` styles such as `argument`): no dead air between lines, a talking
 * speed people don't swipe away from, the first word inside the first beat, and the length cap.
 * And for every skit, the phrases that make a script read like a model wrote it.
 */

export const PACE_CHECKS = ["dead-air", "speech-rate", "first-word", "max-length", "ai-wording", "line-length", "stiff-wording"];

/** Silence between two spoken lines above this is where viewers swipe (a silent beat is a choice, not dead air). */
export const DEAD_AIR_MS = 400;
/** Words per minute while talking; under this a fight sounds like a lecture. */
export const MIN_WPM = 165;
export const FIRST_WORD_MS = 400;
/** A shorts line is a breath: longer than this and it's a speech. */
export const MAX_LINE_WORDS = 14;

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export const paceChecks = (p: Program, beats: readonly Beat[]): Finding[] => {
  const tl0 = p.scenes[0]!.timeline;
  if (tl0.directing?.pace !== "fast") return [];
  const out: Finding[] = [];
  const fps = p.fps;
  const ms = (f: number) => Math.round((f / fps) * 1000);
  const spoken: (BeatSpan & { at: number })[] = p.scenes.flatMap((sc) => sc.timeline.beats.filter((b) => b.kind !== "reaction").map((b) => ({ ...b, at: sc.from })));
  spoken.forEach((b, i) => {
    const next = spoken[i + 1];
    if (!next || b.kind !== "line" || next.kind !== "line" || b.audioTo === undefined || next.audioFrom === undefined) return;
    const gap = ms(next.at + next.audioFrom - (b.at + b.audioTo));
    if (gap > DEAD_AIR_MS)
      out.push({ check: "dead-air", level: "warning", frame: b.at + b.audioTo, message: `${(gap / 1000).toFixed(2)} s of silence between "${b.id}" and "${next.id}" (max ${DEAD_AIR_MS} ms); cut the pause or make it a silent beat with a reaction` });
  });
  const lines = spoken.filter((b) => b.kind === "line" && b.audioFrom !== undefined && b.audioTo !== undefined);
  const talkMs = lines.reduce((t, b) => t + ms(b.audioTo! - b.audioFrom!), 0);
  const count = beats.reduce((n, b) => n + (b.silent || !b.line ? 0 : words(b.spoken ?? b.line)), 0);
  const wpm = talkMs > 0 ? Math.round(count / (talkMs / 60000)) : 0;
  if (talkMs > 0 && wpm < MIN_WPM) out.push({ check: "speech-rate", level: "warning", message: `${wpm} words a minute while talking (min ${MIN_WPM}); speed the voices up or cut words` });
  const first = lines[0];
  if (first && ms(first.at + first.audioFrom!) > FIRST_WORD_MS)
    out.push({ check: "first-word", level: "warning", frame: first.audioFrom, message: `the first word is at ${(ms(first.audioFrom!) / 1000).toFixed(2)} s (max ${FIRST_WORD_MS} ms): something has to be happening on frame one` });
  const hi = tl0.directing.length[1];
  const len = p.durationInFrames / fps;
  if (len > hi) out.push({ check: "max-length", level: "warning", message: `${len.toFixed(1)} s long (max ${hi} s): cut lines before the twist, not the twist` });
  return out;
};

/** Phrases that mark a script as written by a model, not said by a person. Matched whole-word, any case. */
export const AI_PHRASES = [
  "fun fact",
  "did you know",
  "imagine",
  "here's the thing",
  "turns out",
  "it turns out",
  "fascinating",
  "mind-blowing",
  "mind blowing",
  "let's dive",
  "dive into",
  "delve",
  "in fact",
  "essentially",
  "it's important to",
  "at the end of the day",
  "the real question is",
  "and that's why",
  "a testament to",
  "game changer",
  "game-changer",
  "plot twist",
] as const;

/** Uncontracted forms people rarely say out loud. */
const STIFF: readonly [RegExp, string][] = [
  [/\bdo not\b/i, "don't"],
  [/\bdoes not\b/i, "doesn't"],
  [/\bdid not\b/i, "didn't"],
  [/\bis not\b/i, "isn't"],
  [/\bare not\b/i, "aren't"],
  [/\bcannot\b/i, "can't"],
  [/\bwill not\b/i, "won't"],
  [/\bI am\b/, "I'm"],
  [/\byou are\b/i, "you're"],
  [/\bwe are\b/i, "we're"],
  [/\bthey are\b/i, "they're"],
  [/\bit is\b/i, "it's"],
  [/\bthat is\b/i, "that's"],
  [/\bI will\b/, "I'll"],
  [/\bI have\b/, "I've"],
];

const phraseRe = (p: string) => new RegExp(`(^|[^\\p{L}])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "iu");
const AI_RES = AI_PHRASES.map((p) => [p, phraseRe(p)] as const);

/**
 * Wording: model phrases (warning, every skit), uncontracted speech (info), and on fast-paced
 * skits lines too long to say in one breath (warning).
 */
export const wordingChecks = (beats: readonly Beat[], fast: boolean): Finding[] => {
  const out: Finding[] = [];
  for (const b of beats) {
    if (b.silent || !b.line) continue;
    const said = b.spoken ?? b.line;
    const hits = AI_RES.filter(([, re]) => re.test(said)).map(([p]) => p);
    if (hits.length) out.push({ check: "ai-wording", level: "warning", message: `"${b.id}" says ${hits.map((h) => `"${h}"`).join(", ")}: it reads like a model wrote it; say it the way a person would` });
    const stiff = STIFF.filter(([re]) => re.test(said)).map(([, short]) => short);
    if (stiff.length) out.push({ check: "stiff-wording", level: "info", message: `"${b.id}": people say ${stiff.map((s) => `"${s}"`).join(", ")}` });
    const n = words(said);
    if (fast && n > MAX_LINE_WORDS) out.push({ check: "line-length", level: "warning", message: `"${b.id}" is ${n} words (max ${MAX_LINE_WORDS}): split it, or let the other one cut in` });
  }
  return out;
};
