import type { CatalogSource } from "./catalog";
import { compileSkit, parseSkit, skitLines, type CompileResult } from "./director/compile";
import { docBeats, type SkitDoc } from "./director/schema";
import { SkitError, type Diagnostic } from "./director/diagnostics";
import { checkSkit, type CheckReport } from "./qa";
import { placeholderVoice } from "./voice/placeholder";

/** Beats a TTS-only pipeline can't voice: file clips reference audio that only exists in a checkout. */
export const unsupportedBeats = (doc: SkitDoc): Diagnostic[] =>
  docBeats(doc).flatMap((b, i) =>
    b.audio.source === "file"
      ? [{ level: "error" as const, code: "clip-unsupported", path: `beats[${i}].audio`, message: `beat "${b.id}" plays a file clip; the render service only takes TTS lines`, expected: `"audio": { "source": "tts" } (the default)` }]
      : [],
  );

export type DraftCheck = {
  ok: boolean;
  /** Exactly what to voice: one audio file per entry. */
  lines: ReturnType<typeof skitLines>;
  /** Duration with placeholder timings; the real one depends on the voices. */
  estimatedDurationSec: number;
  warnings: Diagnostic[];
  check: CheckReport;
  /** The compiled program on placeholder timings (a silent preview plays this). */
  result: CompileResult;
};

/**
 * What `POST /validate` does to a skit before any TTS: parse, refuse file clips, compile on
 * placeholder timings, self-check. Pure, so a client holding the same registry (`stickstage/data`)
 * gets the same verdict locally, without a round trip. Throws `SkitError` with diagnostics when the skit is invalid.
 */
export const checkDraft = (skit: unknown, src: CatalogSource): DraftCheck => {
  const doc = parseSkit(skit);
  const unsupported = unsupportedBeats(doc);
  if (unsupported.length) throw new SkitError(unsupported);
  const lines = skitLines(doc);
  const result = compileSkit({ skit, voice: placeholderVoice(lines), lib: src.lib, sets: src.sets, sfx: src.sfx, reactions: src.reactions, safeArea: src.safeArea });
  const check = checkSkit({ result, lib: src.lib, sets: src.sets, safeArea: src.safeArea });
  return { ok: check.ok, lines, estimatedDurationSec: +(result.program.durationInFrames / result.program.fps).toFixed(2), warnings: result.warnings, check, result };
};
