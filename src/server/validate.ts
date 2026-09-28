/**
 * `POST /validate`: a premise (staged by its template) or a skit → the skit, the lines to voice
 * with each character's voice hints, and the director's verdict on placeholder timings. Runs
 * before any TTS is spent, so a bad premise fails here and not after the voices exist.
 */
import { buildCatalog, catalogVersion, checkDraft, fromPremise, parseBrief, parseSkit, premiseFromReply, repairPrompt, ReplyError, skitFromReply, SkitError, writerWorld, type CheckReport, type Diagnostic, type skitLines } from "../engine/core";
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
  /** Camera events on placeholder timings, for the review strip. */
  cuts: { frame: number; kind: "cut" | "punch-in"; framing: string; on?: string; reason: string; scene: string }[];
  /** The premise a draft reply was turned into, for the record. */
  premise?: unknown;
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

const pin = (version: string, got: unknown) => {
  if (got !== undefined && got !== version) throw new HttpError(409, "catalog-mismatch", `the skit was written against catalog ${String(got)}; this service has ${version}`, { expected: version, got });
};

/** `{ premise }` or `{ skit }` as before, or `{ reply, brief }` / `{ reply, skit }` for a model's words. */
export const validate = (p: Project, body: unknown, notes: Readonly<Record<string, string>> = {}): ValidateResult => {
  const input = (body ?? {}) as { premise?: unknown; skit?: unknown; reply?: unknown; brief?: unknown; catalog_version?: unknown };
  const hasReply = typeof input.reply === "string";
  const hasBrief = input.brief !== undefined;
  const hasPremise = input.premise !== undefined;
  const hasSkit = input.skit !== undefined;
  if (hasReply) {
    if (hasPremise || hasBrief === hasSkit) throw new HttpError(400, "bad-request", 'send "reply" with exactly one of "brief" or "skit"');
  } else if (hasPremise === hasSkit) throw new HttpError(400, "bad-request", 'send exactly one of "premise" or "skit", or a "reply" with a brief or a skit');
  const version = projectCatalogVersion(p);
  // A pinned client checked its draft against another registry: stop before any TTS is bought.
  pin(version, input.catalog_version);
  const world = writerWorld(buildCatalog(p), notes);
  const reply = hasReply ? (input.reply as string) : "";
  try {
    let skit: unknown = input.skit;
    let premise: unknown;
    let corrected: Diagnostic[] = [];
    if (hasReply && hasBrief) {
      let brief;
      try {
        brief = parseBrief(input.brief, world);
      } catch (e) {
        if (e instanceof SkitError) throw new HttpError(400, "bad-request", "the brief has errors", { diagnostics: e.diagnostics });
        throw e;
      }
      const turned = premiseFromReply(reply, brief, world);
      premise = turned.premise;
      corrected = turned.warnings;
      const lib = brief.characters?.length ? { ...p.lib, characters: { ...p.lib.characters, ...Object.fromEntries(brief.characters.map((c) => [c.id, c])) } } : p.lib;
      const staged = fromPremise(premise, lib, p.sets);
      skit = brief.characters?.length ? { ...staged, characters: brief.characters } : staged;
    } else if (hasReply) {
      let doc;
      try {
        doc = parseSkit(input.skit);
      } catch (e) {
        if (e instanceof SkitError) throw new HttpError(422, "invalid-skit", "the skit has errors", { diagnostics: e.diagnostics });
        throw e;
      }
      const turned = skitFromReply(reply, doc, world);
      skit = turned.skit;
      corrected = turned.warnings;
    } else if (hasPremise) skit = fromPremise(input.premise, p.lib, p.sets);
    const d = checkDraft(skit, p);
    return {
      ok: d.ok,
      catalogVersion: version,
      skit,
      ...(premise !== undefined ? { premise } : {}),
      // Voice-over lines take the skit's narrator voice; the rest their character's.
      lines: d.lines.map((l) => ({ ...l, voice: l.narrator ? hint(d.result.doc.narrator?.voice) : voiceHint(p, l.character) })),
      estimatedDurationSec: d.estimatedDurationSec,
      warnings: [...corrected, ...d.warnings],
      check: d.check,
      cuts: d.cuts,
    };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof ReplyError) throw new HttpError(422, "invalid-reply", "the reply could not be used", { repair: { prompt: e.prompt }, diagnostics: e.diagnostics });
    if (e instanceof SkitError && hasReply) throw new HttpError(422, "invalid-reply", "the reply could not be used", { repair: { prompt: repairPrompt(e.diagnostics, reply) }, diagnostics: e.diagnostics });
    if (e instanceof SkitError) throw new HttpError(422, "invalid-skit", "the skit or premise has errors", { diagnostics: e.diagnostics });
    throw e;
  }
};
