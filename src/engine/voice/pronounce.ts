/**
 * Pronunciation hints for science words (Schrödinger, muon, Planck…). StickStage never calls a
 * TTS: it lists the hints next to each line (`skitLines`), and the harness passes them to its
 * provider (an SSML `<sub>` / `<phoneme>`, or a provider lexicon).
 */
import { z } from "zod";
import { normWord } from "./words";

export const PronunciationSchema = z.strictObject({
  /** As written, any case ("Schrödinger"). */
  word: z.string().min(1),
  /** A plain-letters respelling a TTS can read ("SHROH-ding-er"). */
  say: z.string().min(1),
  /** IPA, for providers that take phonemes. */
  ipa: z.string().min(1).optional(),
});
export type Pronunciation = z.infer<typeof PronunciationSchema>;

export const PronunciationsSchema = z.strictObject({ schemaVersion: z.literal(1), words: z.array(PronunciationSchema) });

/** The lexicon entries whose word appears in `text` (whole words, case- and accent-insensitive). */
export const pronunciationsFor = (text: string, lexicon: readonly Pronunciation[]): Pronunciation[] => {
  const fold = (s: string) => normWord(s).normalize("NFD").replace(/\p{M}/gu, "");
  const words = new Set(text.split(/\s+/).map((w) => fold(w.replace(/'s$/i, ""))));
  return lexicon.filter((p) => words.has(fold(p.word)));
};
