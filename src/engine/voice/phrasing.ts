/**
 * How a line is performed, for a TTS that reads text flat (Kokoro has no SSML and barely pauses
 * at punctuation): split the line into phrases at punctuation, give each break a pause, and pick a
 * speed from the beat's expression, its `delivery` hint and whether the narrator says it. Pure, so
 * the dev voice script and the Tamtree harness can use the same rules (docs/voice-contract.md).
 */

export type Delivery = {
  /** TTS speaking speed (1 = the voice's normal pace). */
  speed: number;
  /** Multiplier on every pause between phrases. */
  pauseScale: number;
};

export type Phrase = {
  text: string;
  /** Silence after this phrase, ms. The last phrase has none: the director spaces the lines. */
  pauseMs: number;
};

/** The pause after a phrase by the punctuation that ends it, ms, before `pauseScale`. */
const PAUSE_MS: readonly [RegExp, number][] = [
  [/(\.\.\.|…)$/, 650],
  [/\?[!?]*$/, 460],
  [/\.$/, 420],
  [/![!?]*$/, 380],
  [/[—–]$/, 320],
  [/[;:]$/, 300],
  [/,$/, 220],
];

const NARRATOR: Delivery = { speed: 0.94, pauseScale: 1.25 };

/** Expression or delivery word → how it's said. First match wins. */
const MOODS: readonly [RegExp, Delivery][] = [
  [/dramatic|suspense|slow/, { speed: 0.88, pauseScale: 1.6 }],
  [/whisper|secret|hushed/, { speed: 0.9, pauseScale: 1.2 }],
  [/sad|crying|teary|hurt|disappoint|tired|sleepy/, { speed: 0.88, pauseScale: 1.35 }],
  [/shock|surprise|gasp|scared|panic/, { speed: 1.04, pauseScale: 1.1 }],
  [/excit|happy|joy|proud|laugh|smug|delight/, { speed: 1.06, pauseScale: 0.9 }],
  [/angry|annoyed|furious|shout/, { speed: 1.05, pauseScale: 0.85 }],
];

export const deliveryFor = (line: { narrator?: boolean; expression?: string; delivery?: string }): Delivery => {
  const cue = `${line.delivery ?? ""} ${line.expression ?? ""}`.toLowerCase();
  const mood = MOODS.find(([re]) => re.test(cue))?.[1];
  if (line.narrator) return mood ? { speed: Math.min(NARRATOR.speed, mood.speed), pauseScale: Math.max(NARRATOR.pauseScale, mood.pauseScale) } : NARRATOR;
  return mood ?? { speed: 1, pauseScale: 1 };
};

/**
 * Phrases of a line: breaks after , ; : — … . ! ? (a run like "?!" or "..." stays together).
 * Breaks need a space after the punctuation, so decimals ("3.5") stay whole.
 */
export const phrasesOf = (text: string, d: Delivery = { speed: 1, pauseScale: 1 }): Phrase[] => {
  const parts = text
    .trim()
    // "Well — that" → "Well— that", so the dash ends the phrase before it.
    .replace(/\s+([—–])\s*/g, "$1 ")
    .split(/(?<=(?:\.\.\.|…|[,;:.!?—–]+))\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((p, i) => {
    const pause = i === parts.length - 1 ? 0 : (PAUSE_MS.find(([re]) => re.test(p))?.[1] ?? 0);
    return { text: p, pauseMs: Math.round(pause * d.pauseScale) };
  });
};
