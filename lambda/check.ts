/**
 * Tamtree 2.7.0's two calls that do no rendering: `check_only` (C2) and `describe` (C3).
 *
 * A check has no audio. TTS comes after it, and that is the point: a bad skit should fail before
 * the voices are bought. So it runs the request's own rules (skit compile errors, unsupported
 * beats, approval, voice lines missing or stale) with the audio checks left out. Then it runs the
 * director's self-check on placeholder timings, as `POST /validate` does. Request errors block.
 * Self-check errors are reported as warnings, because frame timing only exists once the real
 * voices do, and the render checks again then.
 */
import type { Project } from "../src/node";
import { HttpError } from "../src/server/http";
import { parseSubmission } from "../src/server/submit";
import { validate } from "../src/server/validate";
import { toFindings, type EnvelopeFinding } from "./findings";

export type CheckReply = { checked: true; items: []; logs: string[]; findings: EnvelopeFinding[] };

/** Diagnostics about uploaded audio: a check is sent before any exists. */
const NEEDS_AUDIO = new Set(["audio-missing", "audio-format"]);

const checked = (findings: EnvelopeFinding[]): CheckReply => ({ checked: true, items: [], logs: [], findings });

const diagnosticsOf = (e: HttpError): unknown[] => (Array.isArray(e.details?.diagnostics) ? (e.details.diagnostics as unknown[]) : []);

/** A refusal as findings: its diagnostics when it has any, otherwise its one sentence. */
const refusal = (e: HttpError, keep: (d: unknown) => boolean = () => true): EnvelopeFinding[] => {
  const all = diagnosticsOf(e);
  if (!all.length) return [{ level: "error", message: e.message, check: e.code }];
  return toFindings(all.filter(keep));
};

export const checkOnly = async (project: Project, input: { skit?: unknown; voice?: unknown; options?: unknown }): Promise<CheckReply> => {
  if (!input.skit || !input.voice) return checked([{ level: "error", message: "item 0 needs skit, voice and audio", check: "bad-request", path: "items[0].json" }]);
  const form = new FormData();
  form.set("skit", JSON.stringify(input.skit));
  form.set("voice", JSON.stringify(input.voice));
  form.set("options", JSON.stringify(input.options ?? {}));
  try {
    await parseSubmission(form);
  } catch (e) {
    if (!(e instanceof HttpError)) throw e;
    const blocking = refusal(e, (d) => !NEEDS_AUDIO.has((d as { code?: string })?.code ?? ""));
    // Only audio was missing, which is expected here. Anything else stops the check: the draft
    // check below needs a request that parses.
    if (blocking.length) return checked(blocking);
  }
  let draft;
  try {
    draft = validate(project, { skit: input.skit });
  } catch (e) {
    if (e instanceof HttpError) return checked(refusal(e));
    throw e;
  }
  const warnings = toFindings(draft.warnings.map((d) => ({ ...d, path: d.path ? `skit.${d.path}` : undefined })));
  const selfCheck = toFindings(draft.check.findings).map((f) =>
    f.level === "error" ? { ...f, level: "warning" as const, message: `${f.message} (on estimated timings; the render checks again with the real voices)` } : f,
  );
  return checked([...warnings, ...selfCheck]);
};

/** The `describe` answer. Stick-stage reads item 0's json, not `inputs`, so it declares no
 *  `input_schema`. `output_schema` is the json of the one item a render returns. */
export const DESCRIPTION = {
  output_schema: {
    type: "object",
    properties: {
      jobId: { type: "string" },
      title: { type: "string" },
      durationSec: { type: "number" },
      check: { type: "object" },
      warnings: { type: "array", items: { type: "string" } },
      outputs: { type: "object" },
    },
    required: ["jobId", "durationSec", "outputs"],
  },
} as const;
