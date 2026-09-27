import type { Diagnostic } from "../director/diagnostics";
import type { PremiseInput } from "../templates/premise";
import type { TemplateId } from "../templates/premise";
import { TEMPLATE_DEFAULT_SET } from "../templates/stage";
import type { Brief, ScenePlan } from "./brief";
import { scenePlan } from "./brief";
import { parseLoose } from "./parse";
import { repairPrompt } from "./repair";
import type { WriterWorld } from "./world";

/** A reply that cannot be staged. `prompt` is what to send the model once more. */
export class ReplyError extends Error {
  constructor(
    readonly diagnostics: Diagnostic[],
    readonly prompt: string,
  ) {
    super(diagnostics.map((d) => d.message).join("; ") || "the reply could not be used");
    this.name = "ReplyError";
  }
}

const LINE_MIN = 11;
const LINE_MAX = 13;
const HASHTAG = /^#?[\p{L}\p{N}_]+$/u;

type RawLine = { who?: string; text: string; expression?: string; slam?: string; delivery?: string };
type RawGroup = { set?: string; pov?: string; lines: RawLine[] };

const asString = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

const asLine = (raw: unknown): RawLine | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return { who: asString(o.who), text: typeof o.text === "string" ? o.text.trim() : "", expression: asString(o.expression), slam: asString(o.slam), delivery: asString(o.delivery) };
};

const asGroup = (raw: unknown): RawGroup => {
  if (!raw || typeof raw !== "object") return { lines: [] };
  const o = raw as Record<string, unknown>;
  const lines = Array.isArray(o.lines) ? o.lines.flatMap((l) => { const line = asLine(l); return line ? [line] : []; }) : [];
  return { set: asString(o.set), pov: asString(o.pov), lines };
};

const groupsFrom = (data: Record<string, unknown>): RawGroup[] => {
  if (Array.isArray(data.scenes) && data.scenes.length) return data.scenes.map(asGroup);
  if (Array.isArray(data.lines)) return [{ set: asString(data.set), pov: asString(data.pov) ?? asString(data.pov), lines: data.lines.flatMap((l) => { const line = asLine(l); return line ? [line] : []; }) }];
  return [];
};

const even = (n: number, k: number): number[] => {
  const base = Math.floor(n / k);
  const rem = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
};

const linePath = (count: number, scene: number, line: number, key: string) => (count === 1 ? `lines[${line}].${key}` : `scenes[${scene}].lines[${line}].${key}`);

const fail = (diagnostics: Diagnostic[], reply: string): never => {
  throw new ReplyError(diagnostics, repairPrompt(diagnostics, reply));
};

/**
 * A draft reply → a premise. Scene count, cast, roles and fixed sets come from the brief.
 * A mood outside the list becomes `neutral`. A reply that cannot be staged throws `ReplyError`.
 */
export const premiseFromReply = (reply: string, brief: Brief, world: WriterWorld): { premise: PremiseInput; warnings: Diagnostic[] } => {
  const warnings: Diagnostic[] = [];
  const errors: Diagnostic[] = [];
  let parsed: unknown;
  try {
    parsed = parseLoose(reply);
  } catch {
    fail([{ level: "error", code: "reply-json", path: "(root)", message: "the reply is not JSON", expected: "one JSON object" }], reply);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    fail([{ level: "error", code: "reply-json", path: "(root)", message: "the reply is not a JSON object", expected: "one JSON object" }], reply);
  const data = parsed as Record<string, unknown>;
  const plan = scenePlan(brief);
  const template = templateOf(asString(data.template), brief, world, warnings);
  let groups = groupsFrom(data).filter((g) => g.lines.length > 0);
  const flatCount = groups.reduce((n, g) => n + g.lines.length, 0);
  if (!groups.length || flatCount === 0)
    errors.push({ level: "error", code: "reply-lines", path: "scenes", message: "the reply has no lines", expected: `${LINE_MIN} to ${LINE_MAX} lines` });
  else if (flatCount < plan.count)
    errors.push({ level: "error", code: "reply-scenes", path: "scenes", message: `the brief needs ${plan.count} scene${plan.count === 1 ? "" : "s"} and the reply has ${flatCount} line${flatCount === 1 ? "" : "s"}`, expected: `at least ${plan.count} lines` });
  else if (groups.length !== plan.count) {
    warnings.push({ level: "warning", code: "scene-count", path: "scenes", message: `the reply had ${groups.length} scene${groups.length === 1 ? "" : "s"}; the brief asked for ${plan.count}, so the lines were split across ${plan.count}` });
    const flat = groups.flatMap((g) => g.lines);
    const sizes = even(flat.length, plan.count);
    let at = 0;
    groups = sizes.map((n, i) => {
      const slice = flat.slice(at, at + n);
      at += n;
      return { set: groups[i]?.set, pov: groups[i]?.pov ?? (i === 0 ? asString(data.pov) : undefined), lines: slice };
    });
  }
  if (errors.length) fail(errors, reply);

  const ids = brief.cast.map((c) => c.id);
  const total = groups.reduce((n, g) => n + g.lines.length, 0);
  if (total < LINE_MIN || total > LINE_MAX)
    warnings.push({ level: "warning", code: "line-count", path: "scenes", message: `the reply has ${total} lines; a ~30s skit wants ${LINE_MIN} to ${LINE_MAX}` });

  let global = 0;
  const scenes = groups.map((g, s) => {
    const set = setFor(s, g, plan, template, brief, world, warnings);
    const pov = povFor(g.pov ?? (s === 0 ? asString(data.pov) : undefined), s, plan.count, warnings);
    const lines = g.lines.map((l, i) => {
      const path = linePath(plan.count, s, i, "text");
      if (!l.text) errors.push({ level: "error", code: "reply-line", path, message: "a line needs words" });
      let who = l.who;
      if (!who) {
        if (brief.cast.length === 1) who = brief.cast[0]!.id;
        else errors.push({ level: "error", code: "line-speaker", path: linePath(plan.count, s, i, "who"), message: "who says this line?", expected: ids.join(" or ") });
      } else if (!ids.includes(who)) errors.push({ level: "error", code: "unknown-cast-member", path: linePath(plan.count, s, i, "who"), message: `unknown cast member "${who}"`, expected: ids.join(" or ") });
      const expression = moodOf(l.expression, linePath(plan.count, s, i, "expression"), world, warnings);
      const last = global === total - 1 && total > 1;
      let slam = l.slam;
      if (slam && !last) {
        warnings.push({ level: "warning", code: "slam", path: linePath(plan.count, s, i, "slam"), message: "a slam belongs on the last line; this one was dropped" });
        slam = undefined;
      }
      if (slam && slam.length > 40) {
        warnings.push({ level: "warning", code: "slam-length", path: linePath(plan.count, s, i, "slam"), message: "a slam is at most 40 characters; this one was dropped" });
        slam = undefined;
      }
      global++;
      const role = global - 1 === 0 ? "setup" : last ? "punchline" : "escalation";
      return { ...(who ? { who } : {}), text: l.text || "…", ...(expression ? { expression } : {}), role: role as "setup" | "escalation" | "punchline", ...(slam ? { slam } : {}), ...(l.delivery ? { delivery: l.delivery } : {}) };
    });
    return { set, ...(pov ? { pov } : {}), lines };
  });
  if (errors.length) fail(errors, reply);

  const title = asString(data.title) ?? brief.topic.slice(0, 80);
  if (!asString(data.title)) warnings.push({ level: "warning", code: "title", path: "title", message: `no title in the reply; using the topic` });
  let description = asString(data.description);
  if (description && description.length > 2000) {
    description = description.slice(0, 2000);
    warnings.push({ level: "warning", code: "description", path: "description", message: "the description was cut to 2000 characters" });
  }
  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags.flatMap((h) => (typeof h === "string" && HASHTAG.test(h.trim()) ? [h.trim().replace(/^#/, "")] : []))
    : [];

  const cast = brief.cast.map((c) => ({ id: c.id, character: c.character, ...(c.label ? { label: c.label } : {}) }));
  const premise: PremiseInput =
    plan.count === 1
      ? { schemaVersion: 1, template, title, ...(description ? { description } : {}), hashtags, ...(scenes[0]!.pov ? { pov: scenes[0]!.pov } : {}), set: scenes[0]!.set, cast, lines: scenes[0]!.lines }
      : { schemaVersion: 1, template, title, ...(description ? { description } : {}), hashtags, cast, scenes: scenes.map((s) => ({ set: s.set, ...(s.pov ? { pov: s.pov } : {}), lines: s.lines })) };
  return { premise, warnings };
};

const templateOf = (got: string | undefined, brief: Brief, world: WriterWorld, warnings: Diagnostic[]): TemplateId => {
  if (brief.template) {
    if (got && got !== brief.template) warnings.push({ level: "warning", code: "template-fixed", path: "template", message: `the brief fixed the template as "${brief.template}"; ignored "${got}"` });
    return brief.template;
  }
  const fitting = world.templates.filter((t) => t.cast === brief.cast.length);
  if (got && fitting.some((t) => t.id === got)) return got as TemplateId;
  const fallback: TemplateId = brief.cast.length === 2 ? "exchange" : "pov-monologue";
  warnings.push({ level: "warning", code: "template-fallback", path: "template", message: got ? `ignored template "${got}"; using "${fallback}"` : `no template in the reply; using "${fallback}"` });
  return fallback;
};

const setFor = (i: number, group: RawGroup, plan: ScenePlan, template: TemplateId, brief: Brief, world: WriterWorld, warnings: Diagnostic[]): string => {
  const fixed = plan.sets[i] ?? null;
  const where = plan.count === 1 ? "set" : `scenes[${i}].set`;
  const allowed = brief.allowed_sets?.length ? new Set(brief.allowed_sets) : null;
  const known = new Set(world.sets);
  if (fixed) {
    if (group.set && group.set !== fixed) warnings.push({ level: "warning", code: "set-fixed", path: where, message: `the brief fixed this set as "${fixed}"; ignored "${group.set}"` });
    return fixed;
  }
  if (group.set && known.has(group.set) && (!allowed || allowed.has(group.set))) return group.set;
  const preferred = TEMPLATE_DEFAULT_SET[template];
  const usable = known.has(preferred) && (!allowed || allowed.has(preferred)) ? preferred : (world.sets.find((id) => !allowed || allowed.has(id)) ?? preferred);
  warnings.push({ level: "warning", code: "set-fallback", path: where, message: group.set ? `set "${group.set}" is not one the brief allows; using "${usable}"` : `no set in the reply; using "${usable}"` });
  return usable;
};

const povFor = (pov: string | undefined, scene: number, count: number, warnings: Diagnostic[]): string | undefined => {
  if (!pov) return undefined;
  if (pov.length <= 80) return pov;
  warnings.push({ level: "warning", code: "pov-length", path: count === 1 ? "pov" : `scenes[${scene}].pov`, message: "the POV caption was cut to 80 characters" });
  return pov.slice(0, 80);
};

const moodOf = (mood: string | undefined, path: string, world: WriterWorld, warnings: Diagnostic[]): string | undefined => {
  if (!mood) return undefined;
  if ((world.expressions as readonly string[]).includes(mood)) return mood;
  warnings.push({ level: "warning", code: "mood", path, message: `mood "${mood}" is not one StickStage has; played as "neutral"` });
  return "neutral";
};
