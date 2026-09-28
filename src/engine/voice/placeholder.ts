import type { PreparedVoice } from "./schema";
import { estimateMouthCues, estimateWords } from "./words";

/** Placeholder speaking rate for timings before the real voices exist (~160 wpm). */
export const PLACEHOLDER_MS_PER_WORD = 375;

/**
 * A prepared voice with estimated timings and mouths, for compiling, checking or previewing a
 * skit before any TTS exists. Its `audio` paths point nowhere: preview with `audio={false}`.
 */
export const placeholderVoice = (lines: readonly { id: string; speaker: string; text: string }[], locale = "en"): PreparedVoice => ({
  schemaVersion: 1,
  lines: lines.map((l) => {
    const units = locale.startsWith("ja") || locale.startsWith("zh") ? [...l.text].length : l.text.split(/\s+/).filter(Boolean).length;
    const durationMs = Math.max(700, units * PLACEHOLDER_MS_PER_WORD);
    const words = estimateWords(l.text, durationMs, locale);
    return { id: l.id, speaker: l.speaker, text: l.text, audio: `placeholder/${l.id}.wav`, durationMs, words, mouthCues: estimateMouthCues(words), source: { words: "estimated", mouth: "estimated" } };
  }),
});
