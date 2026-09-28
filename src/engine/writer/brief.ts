import { z } from "zod";
import { CharacterSchema } from "../rig/schema";
import type { Diagnostic } from "../director/diagnostics";
import { SkitError, fromZodIssues, pathString, unknownId } from "../director/diagnostics";
import { TEMPLATES, type TemplateId } from "../templates/premise";
import { TEMPLATE_CAST, TEMPLATE_CAST_MAX } from "../templates/stage";
import type { WriterWorld } from "./world";

const BriefCastSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9_-]+$/, "lowercase letters, digits, - and _"),
  character: z.string().min(1),
  label: z.string().min(1).max(24).optional(),
});

/** Tamshoot's `StickBrief`. `scenes` is 2–4; omitting it means one scene. */
export const BriefSchema = z
  .strictObject({
    topic: z.string().min(1),
    description: z.string().max(2000).optional(),
    tone: z.string().optional(),
    template: z.enum(TEMPLATES).optional(),
    cast: z.array(BriefCastSchema).min(1).max(3),
    set: z.string().min(1).optional(),
    scenes: z.number().int().min(2).max(4).optional(),
    sets: z.array(z.string().min(1)).min(1).max(4).optional(),
    allowed_sets: z.array(z.string().min(1)).optional(),
    /** Workspace characters. Their one-line `personality` is a cast note. They are not the house cast. */
    characters: z.array(CharacterSchema).max(4).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.scenes && d.set) ctx.addIssue({ code: "custom", path: ["set"], message: "pick one set, or a set per scene, not both" });
    if (d.sets && !d.scenes) ctx.addIssue({ code: "custom", path: ["sets"], message: "pick how many scenes before picking their sets" });
    if (d.sets && d.scenes && d.sets.length > d.scenes) ctx.addIssue({ code: "custom", path: ["sets"], message: `at most ${d.scenes} sets, one per scene` });
    if (d.sets && new Set(d.sets).size !== d.sets.length) ctx.addIssue({ code: "custom", path: ["sets"], message: "give each scene its own set" });
  });
export type Brief = z.infer<typeof BriefSchema>;

/** How many scenes, and which sets the brief already chose (`null`: the model may pick). */
export type ScenePlan = { count: number; sets: (string | null)[]; template: TemplateId | null };

export const scenePlan = (brief: Brief): ScenePlan => {
  const count = brief.scenes ?? 1;
  return {
    count,
    sets: Array.from({ length: count }, (_, i) => (brief.set ? brief.set : brief.sets && i < brief.sets.length ? brief.sets[i]! : null)),
    template: brief.template ?? null,
  };
};

/** The brief against this registry. Throws `SkitError` — a bad brief is the client's, not the model's. */
export const parseBrief = (json: unknown, world: WriterWorld): Brief => {
  const r = BriefSchema.safeParse(json);
  if (!r.success) throw new SkitError(fromZodIssues(r.error.issues));
  const brief = r.data;
  const d: Diagnostic[] = [];
  const known = new Set(world.sets);
  const allowed = brief.allowed_sets?.filter((id) => known.has(id));
  const castIds = [...world.characters, ...(brief.characters?.map((c) => c.id) ?? [])];
  brief.cast.forEach((c, i) => {
    if (!castIds.includes(c.character)) d.push(unknownId("character", c.character, castIds, ["cast", i, "character"]));
  });
  if (brief.template) {
    const need = TEMPLATE_CAST[brief.template];
    const most = TEMPLATE_CAST_MAX[brief.template];
    if (brief.cast.length < need || brief.cast.length > most)
      d.push({ level: "error", code: "template-cast", path: "template", message: need === most ? `template "${brief.template}" needs ${need} cast members` : `template "${brief.template}" needs ${need} to ${most} cast members` });
  }
  if (brief.template === "me-vs-me" && brief.cast.some((c) => !c.label))
    d.push({ level: "error", code: "template-labels", path: "cast", message: `me-vs-me needs a "label" on each cast member` });
  const setOk = (id: string, path: (string | number)[]) => {
    if (!known.has(id)) d.push(unknownId("set", id, world.sets, path));
    else if (allowed && !allowed.includes(id)) d.push({ level: "error", code: "set-not-allowed", path: pathString(path), message: `"${id}" is not one of the allowed sets`, expected: allowed.join(", ") });
  };
  if (brief.set) setOk(brief.set, ["set"]);
  brief.sets?.forEach((id, i) => setOk(id, ["sets", i]));
  if (brief.allowed_sets && allowed && allowed.length === 0) d.push({ level: "error", code: "allowed-sets", path: "allowed_sets", message: "none of the allowed sets are in this catalog", expected: `one of ${world.sets.join(", ")}` });
  if (d.length) throw new SkitError(d);
  return allowed ? { ...brief, allowed_sets: allowed } : brief;
};
