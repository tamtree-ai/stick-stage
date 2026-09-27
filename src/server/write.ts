/**
 * `POST /write/prompt`: the words the model is asked to write. StickStage owns the prompt.
 * The model profile, the call and the cost stay in Tamtree.
 */
import { buildCatalog, draftPrompt, parseBrief, parseSkit, revisePrompt, SkitError, WRITER, writerWorld } from "../engine/core";
import type { Project } from "../node";
import { HttpError } from "./http";
import { projectCatalogVersion } from "./validate";

export type WritePrompt = { system: string; prompt: string; writer: typeof WRITER; catalogVersion: string };

export const writePrompt = (p: Project, body: unknown, notes: Readonly<Record<string, string>>): WritePrompt => {
  const input = (body ?? {}) as { mode?: unknown; brief?: unknown; skit?: unknown; note?: unknown; catalog_version?: unknown };
  const version = projectCatalogVersion(p);
  if (input.catalog_version !== undefined && input.catalog_version !== version)
    throw new HttpError(409, "catalog-mismatch", `the skit was written against catalog ${String(input.catalog_version)}; this service has ${version}`, { expected: version, got: input.catalog_version });
  const world = writerWorld(buildCatalog(p), notes);
  const out = (built: { system: string; prompt: string }): WritePrompt => ({ ...built, writer: WRITER, catalogVersion: version });
  if (input.mode === "draft") {
    try {
      return out(draftPrompt(parseBrief(input.brief, world), world));
    } catch (e) {
      if (e instanceof SkitError) throw new HttpError(400, "bad-request", "the brief has errors", { diagnostics: e.diagnostics });
      throw e;
    }
  }
  if (input.mode === "revise") {
    const note = typeof input.note === "string" ? input.note.trim() : "";
    if (!note) throw new HttpError(400, "bad-request", "a revise request needs a note");
    try {
      return out(revisePrompt(parseSkit(input.skit), note, world));
    } catch (e) {
      if (e instanceof SkitError) throw new HttpError(422, "invalid-skit", "the skit has errors", { diagnostics: e.diagnostics });
      throw e;
    }
  }
  throw new HttpError(400, "bad-request", 'send "mode": "draft" or "revise"');
};
