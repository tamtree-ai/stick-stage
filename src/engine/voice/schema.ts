import { z } from "zod";

/**
 * Voice input contract. Audio is produced outside StickStage (the tamtree harness TTS nodes,
 * or `scripts/voice-say.ts` for local dev) and handed over as one `voice.json` per skit.
 */
export const WordInputSchema = z.object({
  text: z.string().min(1),
  startMs: z.number().min(0),
  /** Optional: defaults to the next word's start (or the line's end). */
  endMs: z.number().min(0).optional(),
});

export const VoiceLineSchema = z.object({
  /** Matches the beat / line id in the script. */
  id: z.string().min(1),
  speaker: z.string().optional(),
  /** Exactly the script text. Subtitles show this, never the TTS transcript. */
  text: z.string().min(1),
  /** Path relative to the skit folder (`public/skits/<id>/`). WAV, MP3 or OGG. */
  audio: z.string().min(1),
  /** Measured audio duration. Optional: prepare measures it when missing. */
  durationMs: z.number().positive().optional(),
  /** Word timings from the TTS provider, if it has them (e.g. one SSML <mark> per word). */
  words: z.array(WordInputSchema).optional(),
});
export type VoiceLine = z.infer<typeof VoiceLineSchema>;

export const VoiceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  lines: z.array(VoiceLineSchema).min(1),
});
export type VoiceManifest = z.infer<typeof VoiceManifestSchema>;

/** Rhubarb mouth shapes: A–F basic, G/H/X extended. */
export const MOUTH_SHAPES = ["A", "B", "C", "D", "E", "F", "G", "H", "X"] as const;
export type MouthShape = (typeof MOUTH_SHAPES)[number];

export const MouthCueSchema = z.object({
  startMs: z.number().min(0),
  endMs: z.number().min(0),
  shape: z.enum(MOUTH_SHAPES),
});
export type MouthCue = z.infer<typeof MouthCueSchema>;

export const WordTimingSchema = z.object({
  /** Display token, punctuation attached ("fine."). */
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});
export type WordTiming = z.infer<typeof WordTimingSchema>;

/** One line after `pnpm prepare`: script-aligned words and mouth cues, all line-relative ms. */
export const PreparedLineSchema = z.object({
  id: z.string(),
  speaker: z.string().optional(),
  text: z.string(),
  /** Path relative to `public/` (ready for `staticFile`). */
  audio: z.string(),
  durationMs: z.number().positive(),
  words: z.array(WordTimingSchema),
  mouthCues: z.array(MouthCueSchema),
  source: z.object({
    /** tts: provider timings; manual: given in skit.json; whisper: transcribed; estimated: from silences. */
    words: z.enum(["tts", "manual", "whisper", "estimated"]),
    mouth: z.enum(["rhubarb", "estimated"]),
  }),
});
export type PreparedLine = z.infer<typeof PreparedLineSchema>;

export const PreparedVoiceSchema = z.object({
  schemaVersion: z.literal(1),
  lines: z.array(PreparedLineSchema),
});
export type PreparedVoice = z.infer<typeof PreparedVoiceSchema>;
