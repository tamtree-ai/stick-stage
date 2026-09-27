/**
 * `POST /validate`: a premise (staged by its template) or a skit → the skit, the lines to voice
 * with each character's voice hints, and the director's verdict on placeholder timings. Runs
 * before any TTS is spent, so a bad premise fails here and not after the voices exist.
 */
import { catalogVersion, checkDraft, fromPremise, SkitError, type CheckReport, type Diagnostic, type skitLines } from "../engine/core";
import type { Project } from "../node";
import { HttpError } from "./http";

export { placeholderVoice, unsupportedBeats } from "../engine/core";

export type VoiceHint = { provider?: string; voiceId?: string; settings?: Record<string, unknown> };
export type LineToVoice = ReturnType<typeof skitLines>[number] & { voice?: VoiceHint };

export type ValidateResult = {
  ok: boolean;
  /** The registry this was checked against (`GET /catalog`'s `version`). */
  catalogVersion: string;
  skit: unknown;
  lines: LineToVoice[];
  /** Duration with placeholder timings; the real one depends on the voices. */
  estimatedDurationSec: number;
  warnings: Diagnostic[];
  check: CheckReport;
};

type Hints = { provider?: string; voiceId?: string; settings?: Record<string, unknown> } | undefined;
const hint = (v: Hints): VoiceHint | undefined => v && { provider: v.provider, voiceId: v.voiceId, settings: v.settings };
const voiceHint = (p: Project, character: string): VoiceHint | undefined => hint(p.lib.characters[character]?.voice);

const versions = new WeakMap<Project, string>();
/** The project's registry is fixed for the life of the service, so hash it once. */
export const projectCatalogVersion = (p: Project): string => {
  let v = versions.get(p);
  if (!v) versions.set(p, (v = catalogVersion(p)));
  return v;
};

export const validate = (p: Project, body: unknown): ValidateResult => {
  const input = (body ?? {}) as { premise?: unknown; skit?: unknown; catalog_version?: unknown };
  if ((input.premise === undefined) === (input.skit === undefined)) throw new HttpError(400, "bad-request", 'send exactly one of "premise" or "skit"');
  const version = projectCatalogVersion(p);
  // A pinned client checked its draft against another registry: stop before any TTS is bought.
  if (input.catalog_version !== undefined && input.catalog_version !== version)
    throw new HttpError(409, "catalog-mismatch", `the skit was written against catalog ${String(input.catalog_version)}; this service has ${version}`, { expected: version, got: input.catalog_version });
  try {
    const skit = input.premise !== undefined ? fromPremise(input.premise, p.lib, p.sets) : input.skit;
    const d = checkDraft(skit, p);
    return {
      ok: d.ok,
      catalogVersion: version,
      skit,
      // Voice-over lines take the skit's narrator voice; the rest their character's.
      lines: d.lines.map((l) => ({ ...l, voice: l.narrator ? hint(d.result.doc.narrator?.voice) : voiceHint(p, l.character) })),
      estimatedDurationSec: d.estimatedDurationSec,
      warnings: d.warnings,
      check: d.check,
    };
  } catch (e) {
    if (e instanceof SkitError) throw new HttpError(422, "invalid-skit", "the skit or premise has errors", { diagnostics: e.diagnostics });
    throw e;
  }
};
