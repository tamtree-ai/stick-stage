import type { SkitDoc } from "../director/schema";
import { docBeats } from "../director/schema";
import type { Brief, ScenePlan } from "./brief";
import { scenePlan } from "./brief";
import type { WriterWorld } from "./world";

/** A ~30s skit, however many scenes it is split into. */
const LINE_MIN = 11;
const LINE_MAX = 13;

const castBlock = (brief: Brief, notes: WriterWorld["notes"]): string =>
  brief.cast
    .map((m) => {
      const label = m.label ? ` (shown as "${m.label}")` : "";
      const note = notes[m.character] ?? "no notes; play it straight.";
      return `- ${m.id}${label}, played by ${m.character}: ${note}`;
    })
    .join("\n");

const fittingTemplates = (brief: Brief, world: WriterWorld) =>
  world.templates.filter((t) => {
    if (brief.cast.length < t.cast || brief.cast.length > t.castMax) return false;
    if (t.id === "me-vs-me" && !brief.cast.every((c) => c.label)) return false;
    if (t.id === "fable" && (brief.cast[0]?.character !== "dash" || brief.cast[1]?.character !== "moss")) return false;
    if (t.id === "family" && !brief.cast.some((c) => c.character === "lila" || c.character === "theo")) return false;
    return true;
  });

/** Sets the model is allowed to name. */
const openSets = (brief: Brief, world: WriterWorld): string[] => {
  const allowed = brief.allowed_sets;
  return allowed?.length ? world.sets.filter((id) => allowed.includes(id)) : [...world.sets];
};

/** One example scene per planned scene. A fixed set is left out, so the model does not write it. */
const exampleScenes = (plan: ScenePlan, speaker: string, closer: string): string =>
  Array.from({ length: plan.count }, (_, i) => {
    const last = i === plan.count - 1 && plan.count > 1;
    const line = last
      ? `{"who": "${closer}", "text": "...", "expression": "smug", "slam": "WORD"}`
      : `{"who": "${speaker}", "text": "...", "expression": "neutral"}`;
    const set = plan.sets[i] === null ? `"set": "<set id>", ` : "";
    const pov = i === 0 ? `"pov": "POV: ...", ` : "";
    return `{ ${set}${pov}"lines": [${line}] }`;
  }).join(", ");

/**
 * The draft prompt. The model writes words, a title and (when the brief left them open) a
 * template and set ids. Scene count, cast, roles and fixed sets are not in the reply.
 */
export const draftPrompt = (brief: Brief, world: WriterWorld): { system: string; prompt: string } => {
  const plan = scenePlan(brief);
  const speaker = brief.cast[0]!.id;
  const closer = brief.cast[brief.cast.length - 1]!.id;
  const templates = fittingTemplates(brief, world);
  const templateRule = plan.template
    ? `template is "${plan.template}". Do not write a template key.`
    : `template: pick one:\n${templates.map((t) => `  - "${t.id}": ${t.description}`).join("\n")}`;
  const fixed = plan.sets.map((id, i) => (id ? `scene ${i + 1} is "${id}"` : null)).filter((s): s is string => !!s);
  const opens = plan.sets.some((id) => id === null);
  const setRule = [
    fixed.length ? `Fixed sets (do not write a set key for these): ${fixed.join("; ")}.` : "",
    opens ? `Where a scene has no fixed set, "set" is one of: ${openSets(brief, world).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const templateKey = plan.template ? "" : `\n  "template": "<template id>",`;
  const system = `You write a ~30 second comedy skit. Reply with ONE JSON object only.

CAST:
${castBlock(brief, world.notes)}

SHAPE (decide silently; output only the JSON): setup, then escalation, punchline LAST. Line 1 is the hook, with no greeting. ${LINE_MIN} to ${LINE_MAX} lines in all, at most 12 words each. Original and safe to post: no real people, brands, lyrics or quoted memes; nothing cruel, sexual, political, or about a protected group.

Write exactly this shape:
{
  "title": "Short title",${templateKey}
  "description": "One line for the post; do not spoil the punchline.",
  "hashtags": ["stickfigure", "relatable"],
  "scenes": [ ${exampleScenes(plan, speaker, closer)} ]
}

${templateRule}
Exactly ${plan.count} scene${plan.count === 1 ? "" : "s"}.
${setRule}
who: ${brief.cast.map((c) => c.id).join(" or ")}.
expression: ${world.expressions.join(", ")}. No other word.
pov: optional, at most 80 characters, starts with "POV: ".
slam: optional, one or two words, only on the last line.
delivery: optional ("flat", "whispered").
Do not write schemaVersion, cast, role, or anything about shots, actions or timing.`;

  const parts = [`Topic: ${brief.topic}`];
  if (brief.description) parts.push(`What the client wants: ${brief.description}`);
  if (brief.tone) parts.push(`Tone: ${brief.tone}`);
  return { system, prompt: parts.join("\n") };
};

export type WriterLine = { id: string; who: string; text: string; expression?: string };

/** The lines a change request shows the model: id, who, words, mood. Staging stays here. */
export const skitWriterLines = (doc: SkitDoc): WriterLine[] =>
  docBeats(doc).flatMap((b) => {
    if (b.speaker && b.line && !b.silent) return [{ id: b.id, who: b.speaker, text: b.line, ...(b.expression ? { expression: b.expression } : {}) }];
    const slam = b.text.find((t) => t.type === "slam");
    if (b.silent && b.speaker && slam) {
      const mood = b.actions.find((a) => a.do === "expression");
      return [{ id: b.id, who: b.speaker, text: slam.value, ...(mood && mood.do === "expression" ? { expression: mood.expression } : {}) }];
    }
    return [];
  });

/** A change request: the model returns the lines, and nothing else. */
export const revisePrompt = (doc: SkitDoc, note: string, world: WriterWorld): { system: string; prompt: string } => {
  const lines = skitWriterLines(doc);
  const who = [...new Set(lines.map((l) => l.who))];
  const sample = who[0] ?? "milo";
  const system = `You edit the lines of a stick-figure comedy skit. Reply with ONE JSON object only.

Change only what the note asks. Return every line you keep, in play order. Leave a line out to drop it. A new line needs a new id no other line uses.

{"lines":[{"id":"l1","who":"${sample}","text":"...","expression":"neutral"}]}

who: ${who.join(" or ") || "a cast id"}.
expression: ${world.expressions.join(", ")}.
The last line is the punchline. slam (one or two words) is optional, and only on that line.`;
  return { system, prompt: `Note: ${note}\n\nLines:\n${JSON.stringify(lines)}` };
};
