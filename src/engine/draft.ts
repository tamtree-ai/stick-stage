import type { CatalogSource } from "./catalog";
import type { FigureLib } from "./viz/compile";
import { compileSkit, parseSkit, skitLines, type CompileResult, type SeriesStyle } from "./director/compile";
import { applyLanguage } from "./i18n/apply";
import { docBeats, type SkitDoc } from "./director/schema";
import { SkitError, type Diagnostic } from "./director/diagnostics";
import { checkSkit, type CheckReport } from "./qa";
import { placeholderVoice } from "./voice/placeholder";
import type { PreparedVoice } from "./voice/schema";

/** Beats a TTS-only pipeline can't voice: file clips reference audio that only exists in a checkout. */
export const unsupportedBeats = (doc: SkitDoc): Diagnostic[] =>
  docBeats(doc).flatMap((b, i) =>
    b.audio.source === "file"
      ? [{ level: "error" as const, code: "clip-unsupported", path: `beats[${i}].audio`, message: `beat "${b.id}" plays a file clip; the render service only takes TTS lines`, expected: `"audio": { "source": "tts" } (the default)` }]
      : [],
  );

export type DraftCut = {
  frame: number;
  kind: "cut" | "punch-in";
  framing: string;
  on?: string;
  reason: string;
  scene: string;
};

export type DraftCheck = {
  ok: boolean;
  /** Exactly what to voice: one audio file per entry. */
  lines: ReturnType<typeof skitLines>;
  /** Duration with placeholder timings; the real one depends on the voices. */
  estimatedDurationSec: number;
  warnings: Diagnostic[];
  check: CheckReport;
  /** Camera events, in program frames, for the review strip. */
  cuts: DraftCut[];
  /** The compiled program on placeholder timings (a silent preview plays this). */
  result: CompileResult;
};

/**
 * What `POST /validate` does to a skit before any TTS: parse, refuse file clips, compile on
 * placeholder timings, self-check. Pure, so a client holding the same registry (`stickstage/data`)
 * gets the same verdict locally, without a round trip. Throws `SkitError` with diagnostics when the skit is invalid.
 */
export const checkDraft = (skit: unknown, src: CatalogSource, opts?: { lang?: string; series?: Readonly<Record<string, SeriesStyle>>; voice?: PreparedVoice; figures?: FigureLib }): DraftCheck => {
  const doc = parseSkit(skit);
  const unsupported = unsupportedBeats(doc);
  if (unsupported.length) throw new SkitError(unsupported);
  const dubbed = opts?.lang ? applyLanguage(doc, opts.lang) : doc;
  const lines = skitLines(dubbed);
  const voice = opts?.voice ?? placeholderVoice(lines, dubbed.meta.language ?? "en");
  const result = compileSkit({ skit, voice, lib: src.lib, sets: src.sets, sfx: src.sfx, reactions: src.reactions, safeArea: src.safeArea, lang: opts?.lang, series: opts?.series, figures: opts?.figures });
  const check = checkSkit({ result, lib: src.lib, sets: src.sets, safeArea: src.safeArea });
  const cuts: DraftCut[] = result.program.scenes.flatMap((sc) => [
    ...sc.timeline.shots.map((s) => ({ frame: s.frame + sc.from, kind: "cut" as const, framing: s.framing, ...(s.on ? { on: s.on } : {}), reason: s.reason, scene: sc.id })),
    ...sc.timeline.punchIns.map((p) => ({ frame: p.frame + sc.from, kind: "punch-in" as const, framing: "punch-in", on: p.on, reason: "punch-in", scene: sc.id })),
  ]);
  return { ok: check.ok, lines, estimatedDurationSec: +(result.program.durationInFrames / result.program.fps).toFixed(2), warnings: result.warnings, check, cuts, result };
};
