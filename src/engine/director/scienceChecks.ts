/**
 * Accuracy checks for teaching skits (warnings at compile) and the sources text that goes up with
 * the video (description or pinned comment).
 */
import type { Diagnostic } from "./diagnostics";
import { docBeats, type SkitDoc } from "./schema";
import { approvalStatus, statesNumber } from "./science";
import type { ImageDef } from "../viz/images";

/** A science skit: it has claims, or was staged as a myth-flip. Comedy skits are left alone. */
export const isScienceSkit = (doc: Pick<SkitDoc, "claims" | "template">): boolean => doc.claims !== undefined || doc.template === "myth-flip";

/** Warnings: numbers with no claim, claims pointing at nothing, a myth-flip that never says why the myth felt true. */
export const scienceChecks = (doc: SkitDoc, raw: unknown): Diagnostic[] => {
  if (!isScienceSkit(doc)) return [];
  const out: Diagnostic[] = [];
  const beats = docBeats(doc);
  const ids = new Set(beats.map((b) => b.id));
  const covered = new Set((doc.claims ?? []).flatMap((c) => c.beats));
  (doc.claims ?? []).forEach((c, i) =>
    c.beats.forEach((b, j) => {
      if (!ids.has(b)) out.push({ level: "warning", code: "claim-beat", path: `claims[${i}].beats[${j}]`, message: `claim points at beat "${b}", which isn't in the skit`, expected: [...ids].join(", ") });
    }),
  );
  beats.forEach((b) => {
    const said = b.spoken ?? b.line;
    if (said && statesNumber(said) && !covered.has(b.id))
      out.push({ level: "warning", code: "claim-missing", path: `beats[id=${b.id}].line`, message: `"${b.line}" states a number with no claim behind it`, expected: `a claim with a source whose "beats" lists "${b.id}"`, example: `{ "text": "…", "source": "…", "checkedBy": null, "beats": ["${b.id}"] }` });
  });
  if (doc.template === "myth-flip" && !beats.some((b) => b.role === "why-it-felt-true"))
    out.push({ level: "warning", code: "why-it-felt-true", path: "beats", message: "a myth-flip with no line saying why the myth felt true; without it the skeptic just looks wrong", expected: `one beat with "role": "why-it-felt-true"` });
  const status = approvalStatus(raw);
  if (!status.ok) out.push({ level: "warning", code: `approval-${status.reason}`, path: "approval", message: status.message });
  return out;
};

/** `sources.txt`: claims with their sources, the simplifications, and image credits. */
export const sourcesText = (doc: SkitDoc, images: readonly ImageDef[] = []): string => {
  const parts: string[] = [];
  if (doc.claims?.length) parts.push(["Sources", ...doc.claims.map((c) => `• ${c.text}\n  ${c.source}`)].join("\n"));
  if (doc.simplifications?.length) parts.push(["Simplifications", ...doc.simplifications.map((s) => `• ${s}`)].join("\n"));
  if (images.length) parts.push(["Images", ...images.map((i) => `• ${i.impression ? "Artist's impression. " : ""}${i.credit} (${i.licence}) ${i.source}`)].join("\n"));
  return parts.length ? `${parts.join("\n\n")}\n` : "";
};

/** Image ids a skit's figures show (scene figures and states). */
export const imagesOfSkit = (doc: Pick<SkitDoc, "figures" | "scenes">): string[] => {
  const figs = [...(doc.figures ?? []), ...(doc.scenes ?? []).flatMap((s) => s.figures ?? [])];
  return [...new Set(figs.filter((f) => f.kind === "image").flatMap((f) => [f.params.image, ...Object.values(f.states ?? {}).map((s) => s.image)]).filter((x): x is string => typeof x === "string"))];
};
