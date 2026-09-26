/**
 * `POST /validate`: a premise (staged by its template) or a skit → the skit, the lines to voice
 * with each character's voice hints, and the director's verdict on placeholder timings. Runs
 * before any TTS is spent, so a bad premise fails here and not after the voices exist.
 */
import { checkSkit, compileSkit, docBeats, estimateMouthCues, estimateWords, fromPremise, parseSkit, skitLines, SkitError, type CheckReport, type Diagnostic, type PreparedVoice, type SkitDoc } from "../engine/core";
import type { Project } from "../node";
import { HttpError } from "./http";

/** Placeholder speaking rate for timings before the real voices exist (~160 wpm). */
const MS_PER_WORD = 375;

export type VoiceHint = { provider?: string; voiceId?: string; settings?: Record<string, unknown> };
export type LineToVoice = ReturnType<typeof skitLines>[number] & { voice?: VoiceHint };

export type ValidateResult = {
  ok: boolean;
  skit: unknown;
  lines: LineToVoice[];
  /** Duration with placeholder timings; the real one depends on the voices. */
  estimatedDurationSec: number;
  warnings: Diagnostic[];
  check: CheckReport;
};

export const placeholderVoice = (lines: readonly { id: string; speaker: string; text: string }[]): PreparedVoice => ({
  schemaVersion: 1,
  lines: lines.map((l) => {
    const durationMs = Math.max(700, l.text.split(/\s+/).filter(Boolean).length * MS_PER_WORD);
    const words = estimateWords(l.text, durationMs);
    return { id: l.id, speaker: l.speaker, text: l.text, audio: `placeholder/${l.id}.wav`, durationMs, words, mouthCues: estimateMouthCues(words), source: { words: "estimated", mouth: "estimated" } };
  }),
});

/** Beats the service can't voice: file clips reference audio that only exists in a checkout. */
export const unsupportedBeats = (doc: SkitDoc): Diagnostic[] =>
  docBeats(doc).flatMap((b, i) =>
    b.audio.source === "file"
      ? [{ level: "error" as const, code: "clip-unsupported", path: `beats[${i}].audio`, message: `beat "${b.id}" plays a file clip; the render service only takes TTS lines`, expected: `"audio": { "source": "tts" } (the default)` }]
      : [],
  );

const voiceHint = (p: Project, character: string): VoiceHint | undefined => {
  const v = p.lib.characters[character]?.voice;
  return v && { provider: v.provider, voiceId: v.voiceId, settings: v.settings };
};

export const validate = (p: Project, body: unknown): ValidateResult => {
  const input = (body ?? {}) as { premise?: unknown; skit?: unknown };
  if ((input.premise === undefined) === (input.skit === undefined)) throw new HttpError(400, "bad-request", 'send exactly one of "premise" or "skit"');
  try {
    const skit = input.premise !== undefined ? fromPremise(input.premise, p.lib, p.sets) : input.skit;
    const doc = parseSkit(skit);
    const unsupported = unsupportedBeats(doc);
    if (unsupported.length) throw new SkitError(unsupported);
    const lines = skitLines(doc);
    const result = compileSkit({ skit, voice: placeholderVoice(lines), lib: p.lib, sets: p.sets, sfx: p.sfx, reactions: p.reactions, safeArea: p.safeArea });
    const check = checkSkit({ result, lib: p.lib, sets: p.sets, safeArea: p.safeArea });
    return {
      ok: check.ok,
      skit,
      lines: lines.map((l) => ({ ...l, voice: voiceHint(p, l.character) })),
      estimatedDurationSec: +(result.program.durationInFrames / result.program.fps).toFixed(2),
      warnings: result.warnings,
      check,
    };
  } catch (e) {
    if (e instanceof SkitError) throw new HttpError(422, "invalid-skit", "the skit or premise has errors", { diagnostics: e.diagnostics });
    throw e;
  }
};
