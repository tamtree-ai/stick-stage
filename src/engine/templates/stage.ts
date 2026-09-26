import { SkitError, unknownId, type Diagnostic } from "../director/diagnostics";
import type { SkitInput } from "../director/schema";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import { normWord, tokenize } from "../voice/words";
import { PremiseSchema, type Premise, type PremiseLine, type TemplateId } from "./premise";
import { fromZodIssues } from "../director/diagnostics";

type Beat = NonNullable<SkitInput["beats"]>[number];
type Action = NonNullable<Beat["actions"]>[number];
type Role = NonNullable<PremiseLine["role"]>;

/** Per-template staging defaults. The director adds listener reactions, shots and the reaction beat. */
const DEFAULT_SET: Record<TemplateId, string> = {
  exchange: "living-1",
  interview: "street-1",
  "me-vs-me": "living-1",
  "pov-monologue": "plain-1",
  "text-slam": "plain-1",
};
const ROLE_EXPRESSION: Record<Role, string> = { setup: "neutral", escalation: "annoyed", punchline: "deadpan" };
/** Escalation gestures, one per escalation line, in turn. */
const GESTURES = ["point", "hands-on-hips", "shrug", "arms-crossed"];
/** Dead air before the punchline: the comedic beat. */
const PUNCH_PAUSE_MS = 450;
const PUNCH_HOLD_MS = 300;

const roleOf = (p: Premise, i: number): Role => p.lines[i]!.role ?? (i === p.lines.length - 1 && p.lines.length > 1 ? "punchline" : i === 0 ? "setup" : "escalation");

/** Anchor on the last word of a line (by normalized word and occurrence, so punctuation never breaks it). */
export const lastWordAnchor = (text: string) => {
  const toks = tokenize(text);
  const last = toks[toks.length - 1]!;
  return { word: last.norm || normWord(last.text) || last.text, occurrence: toks.filter((t) => t.norm === last.norm).length };
};

const check = (p: Premise, lib: Library, sets: Readonly<Record<string, SetDef>>): Diagnostic[] => {
  const d: Diagnostic[] = [];
  const ids = p.cast.map((c) => c.id);
  p.cast.forEach((c, i) => {
    if (!lib.characters[c.character]) d.push(unknownId("character", c.character, Object.keys(lib.characters), ["cast", i, "character"]));
    if (c.holding && !lib.props[c.holding]) d.push(unknownId("prop", c.holding, Object.keys(lib.props), ["cast", i, "holding"]));
  });
  if (p.set && !sets[p.set]) d.push(unknownId("set", p.set, Object.keys(sets), ["set"]));
  const need = { exchange: 2, interview: 2, "me-vs-me": 2, "pov-monologue": 1, "text-slam": 1 }[p.template];
  if (p.cast.length < need) d.push({ level: "error", path: "cast", message: `template "${p.template}" needs ${need} cast members`, example: `"cast": [{ "id": "milo", "character": "milo" }, { "id": "june", "character": "june" }]` });
  if (p.template === "me-vs-me" && p.cast.some((c) => !c.label))
    d.push({ level: "error", path: "cast", message: `me-vs-me: give both a "label" so viewers can tell them apart`, example: `{ "id": "me", "character": "milo", "label": "me" }, { "id": "brain", "character": "milo", "label": "my brain" }` });
  p.lines.forEach((l, i) => {
    if (l.who !== undefined && !ids.includes(l.who)) d.push(unknownId("cast member", l.who, ids, ["lines", i, "who"]));
    if (l.who === undefined && p.template !== "text-slam" && p.cast.length > 1) d.push({ level: "error", path: `lines[${i}].who`, message: "who says this line?", expected: `one of ${ids.join(", ")}` });
    if (l.expression && !lib.expressions[l.expression]) d.push(unknownId("expression", l.expression, Object.keys(lib.expressions), ["lines", i, "expression"]));
    if (p.template === "text-slam" && l.text.length > 40) d.push({ level: "error", path: `lines[${i}].text`, message: "slam text is at most 40 characters", expected: "a word or a short phrase" });
  });
  return d;
};

const spokenBeat = (p: Premise, i: number, n: { gesture: number }): Beat => {
  const l = p.lines[i]!;
  const role = roleOf(p, i);
  const who = l.who ?? p.cast[0]!.id;
  const actions: Action[] = [];
  const beat: Beat = { id: `l${i + 1}`, speaker: who, line: l.text, expression: l.expression ?? ROLE_EXPRESSION[role], actions };
  if (l.delivery) beat.delivery = l.delivery;
  if (role === "escalation") actions.push({ who, do: "pose", pose: GESTURES[n.gesture++ % GESTURES.length]!, at: { fraction: 0.15 } });
  if (role === "punchline") Object.assign(beat, { punchline: true, pauseBeforeMs: PUNCH_PAUSE_MS, holdAfterMs: PUNCH_HOLD_MS });
  if (l.slam) beat.text = [{ type: "slam", value: l.slam, at: lastWordAnchor(l.text) }];
  return beat;
};

/** Template-specific touches on the spoken beats. */
const dress = (p: Premise, beats: Beat[]): Beat[] => {
  if (p.template === "interview") {
    // The interviewer (first cast member) holds the mic to their own mouth, then out to the guest.
    const host = p.cast[0]!.id;
    // The first beat has no pause before it to move in.
    return beats.map((b, i) => ({ ...b, actions: [...(b.actions ?? []), { who: host, do: "pose", pose: b.speaker === host ? "hold-chest" : "hold-out", at: { ms: i === 0 ? 0 : -150 } }] }));
  }
  if (p.template === "pov-monologue") return beats.map((b) => ({ ...b, actions: [{ who: b.speaker!, do: "look", to: "camera" }, ...(b.actions ?? [])] }));
  return beats;
};

const slamBeats = (p: Premise): Beat[] =>
  p.lines.map((l, i) => {
    const who = l.who ?? p.cast[0]!.id;
    const last = roleOf(p, i) === "punchline";
    const beat: Beat = {
      id: `s${i + 1}`,
      silent: true,
      durationMs: Math.min(2200, Math.max(1200, 900 + 45 * l.text.length)),
      actions: [{ who, do: "expression", expression: l.expression ?? (last ? "shocked" : "deadpan"), at: { ms: 0 } }],
      text: [{ type: "slam", value: l.slam ?? l.text, at: { ms: 120 }, durationMs: Math.min(2000, Math.max(1000, 800 + 45 * l.text.length)) }],
      sfx: [{ id: last ? "boom" : "pop", at: { ms: 120 } }],
    };
    if (last) Object.assign(beat, { punchline: true, reaction: false, pauseBeforeMs: PUNCH_PAUSE_MS });
    return beat;
  });

/** Premise → draft skit.json. Throws `SkitError` (path + expected + example) on a bad premise. */
export const fromPremise = (json: unknown, lib: Library, sets: Readonly<Record<string, SetDef>>): SkitInput => {
  const r = PremiseSchema.safeParse(json);
  if (!r.success) throw new SkitError(fromZodIssues(r.error.issues));
  const p = r.data;
  const diags = check(p, lib, sets);
  if (diags.length) throw new SkitError(diags);
  const solo = p.cast.length === 1;
  const marks = solo ? ["center"] : ["left", "right"];
  const n = { gesture: 0 };
  const beats = p.template === "text-slam" ? slamBeats(p) : dress(p, p.lines.map((_, i) => spokenBeat(p, i, n)));
  return {
    schemaVersion: 1,
    meta: { title: p.title, ...(p.description ? { description: p.description } : {}), hashtags: p.hashtags },
    set: p.set ?? DEFAULT_SET[p.template],
    cast: p.cast.map((c, i) => ({
      id: c.id,
      character: c.character,
      mark: marks[i]!,
      ...(c.label ? { label: c.label } : {}),
      ...(c.holding ? { holding: { prop: c.holding, hand: "R" as const } } : p.template === "interview" && i === 0 ? { holding: { prop: "mic", hand: "R" as const } } : {}),
      ...(p.template === "interview" && i === 0 ? { pose: "hold-chest" } : {}),
    })),
    overlay: { ...(p.pov ? { pov: p.pov } : {}), subtitles: p.template !== "text-slam" },
    beats,
  };
};
