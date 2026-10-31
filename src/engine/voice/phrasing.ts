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
  /** How strongly the mood is played, 0 (flat) … 1 (big), for an expressive TTS's emotion dial. */
  intensity: number;
  /** An acting direction for a TTS that takes a style prompt (Gemini TTS): "Say this excitedly, …". */
  direction: string;
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

const NEUTRAL: Delivery = { speed: 1, pauseScale: 1, intensity: 0.45, direction: "Say this naturally and warmly, like a children's cartoon character, with a short pause between sentences" };
const NARRATOR: Delivery = { speed: 0.94, pauseScale: 1.25, intensity: 0.4, direction: "Narrate this like a warm children's storyteller, unhurried, with a gentle pause at each comma and full stop" };

/** Expression or delivery word → how it's said. First match wins. */
const MOODS: readonly [RegExp, Delivery][] = [
  [/dramatic|suspense|slow/, { speed: 0.88, pauseScale: 1.6, intensity: 0.75, direction: "Say this dramatically, slowly, holding a long pause before the last words" }],
  [/whisper|secret|hushed/, { speed: 0.9, pauseScale: 1.2, intensity: 0.35, direction: "Whisper this, close and secretive" }],
  [/sad|crying|teary|hurt|disappoint|tired|sleepy/, { speed: 0.88, pauseScale: 1.35, intensity: 0.6, direction: "Say this sadly and softly, a little slower, with a small catch in the voice and pauses between phrases" }],
  [/shock|surprise|gasp|scared|panic/, { speed: 1.04, pauseScale: 1.1, intensity: 0.8, direction: "Say this in wide-eyed surprise, with a gasp at the start" }],
  [/excit|happy|joy|proud|laugh|smug|delight/, { speed: 1.06, pauseScale: 0.9, intensity: 0.8, direction: "Say this excitedly, bright and bouncy, with a quick beat after each exclamation" }],
  [/angry|annoyed|furious|shout/, { speed: 1.05, pauseScale: 0.85, intensity: 0.75, direction: "Say this crossly, clipped and firm" }],
];

/**
 * `pace: "fast"` (the `argument` style): a shorts pace, ~180 wpm. Speed up, cut the pauses to under
 * half, and play the mood a little bigger. The storybook pace above suits a narrated story, not a fight.
 */
export const FAST_PACE = { speedBy: 1.14, maxSpeed: 1.28, pauseBy: 0.45, intensityBy: 1.1, direction: "Keep it quick and punchy, like a real argument: no gaps, talk over the end of the other line" } as const;

const fast = (d: Delivery): Delivery => ({
  speed: +Math.min(FAST_PACE.maxSpeed, d.speed * FAST_PACE.speedBy).toFixed(3),
  pauseScale: +(d.pauseScale * FAST_PACE.pauseBy).toFixed(3),
  intensity: +Math.min(1, d.intensity * FAST_PACE.intensityBy).toFixed(3),
  direction: `${d.direction}. ${FAST_PACE.direction}`,
});

export const deliveryFor = (line: { narrator?: boolean; expression?: string; delivery?: string; pace?: "normal" | "fast" }): Delivery => {
  const cue = `${line.delivery ?? ""} ${line.expression ?? ""}`.toLowerCase();
  const mood = MOODS.find(([re]) => re.test(cue))?.[1];
  const base = line.narrator
    ? mood
      ? { speed: Math.min(NARRATOR.speed, mood.speed), pauseScale: Math.max(NARRATOR.pauseScale, mood.pauseScale), intensity: Math.min(mood.intensity, 0.65), direction: `${NARRATOR.direction}; ${mood.direction.replace(/^Say this /, "")}` }
      : NARRATOR
    : (mood ?? NEUTRAL);
  return line.pace === "fast" ? fast(base) : base;
};

/**
 * The text to send a style-prompted TTS (Gemini TTS: "Say cheerfully: Have a wonderful day!"):
 * the acting direction, then the words to say. The line's caption `text` stays as it is.
 */
export const performedText = (line: { text: string; spoken?: string; narrator?: boolean; expression?: string; delivery?: string; pace?: "normal" | "fast" }): string => `${deliveryFor(line).direction}: ${line.spoken ?? line.text}`;

/**
 * Phrases of a line: breaks after , ; : — … . ! ? (a run like "?!" or "..." stays together).
 * Breaks need a space after the punctuation, so decimals ("3.5") stay whole.
 */
export const phrasesOf = (text: string, d: Pick<Delivery, "pauseScale"> = NEUTRAL): Phrase[] => {
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
