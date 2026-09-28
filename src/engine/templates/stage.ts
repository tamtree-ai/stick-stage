import { SkitError, unknownId, type Diagnostic } from "../director/diagnostics";
import type { SkitInput } from "../director/schema";
import type { Aspect } from "../format/aspect";
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import { seatHeightAt } from "../set/seating";
import { normWord, tokenize } from "../voice/words";
import { PremiseSchema, type Premise, type PremiseLine, type TemplateId } from "./premise";
import { fromZodIssues } from "../director/diagnostics";
import { migrate } from "../migrate";

type Beat = NonNullable<SkitInput["beats"]>[number];
type Action = NonNullable<Beat["actions"]>[number];
type Role = NonNullable<PremiseLine["role"]>;

/** Per-template staging defaults for a 9:16 short. The director adds listener reactions, shots and the reaction beat. */
export const TEMPLATE_DEFAULT_SET: Record<TemplateId, string> = {
  exchange: "living-1",
  interview: "street-1",
  "me-vs-me": "living-1",
  "pov-monologue": "plain-1",
  "text-slam": "plain-1",
  explainer: "living-1",
  family: "classroom-1",
  fable: "park-1",
  trio: "living-1",
};
/** The same templates, on rooms laid out for 16:9. */
export const WIDE_TEMPLATE_SET: Record<TemplateId, string> = {
  exchange: "wide-living",
  interview: "wide-street",
  "me-vs-me": "wide-living",
  "pov-monologue": "wide-plain",
  "text-slam": "wide-plain",
  explainer: "wide-living",
  family: "wide-classroom",
  fable: "wide-park",
  trio: "wide-living",
};

/** The room a template opens on for this frame. */
export const defaultSet = (template: TemplateId, aspect: Aspect = "9:16"): string =>
  (aspect === "16:9" ? WIDE_TEMPLATE_SET : TEMPLATE_DEFAULT_SET)[template];
/** Fewest cast members each template stages. `family` may add a second kid. */
export const TEMPLATE_CAST: Record<TemplateId, 1 | 2 | 3> = {
  exchange: 2, interview: 2, "me-vs-me": 2, "pov-monologue": 1, "text-slam": 1, explainer: 2, family: 2, fable: 2, trio: 3,
};
export const TEMPLATE_CAST_MAX: Record<TemplateId, 1 | 2 | 3> = { ...TEMPLATE_CAST, family: 3 };
const ROLE_EXPRESSION: Record<Role, string> = { setup: "neutral", escalation: "annoyed", punchline: "deadpan" };
/** Escalation gestures, one per escalation line, in turn. */
const GESTURES = ["point", "hands-on-hips", "shrug", "arms-crossed"];
/** Dead air before the punchline: the comedic beat. */
const PUNCH_PAUSE_MS = 450;
const PUNCH_HOLD_MS = 300;

type Group = { set?: string; pov?: string; card?: string; lines: PremiseLine[] };

/** `lines` is one scene. `scenes` is 1–4, and the first scene's POV falls back to the premise `pov`. */
const groupsOf = (p: Premise): Group[] =>
  p.scenes
    ? p.scenes.map((s, i) => ({ set: s.set ?? p.set, pov: s.pov ?? (i === 0 ? p.pov : undefined), card: s.card, lines: s.lines }))
    : [{ set: p.set, pov: p.pov, lines: p.lines ?? [] }];

const marksFor = (n: number): string[] => (n <= 1 ? ["center"] : n === 2 ? ["left", "right"] : ["left", "center", "right"]);

/** Roles run over the whole skit: first line setup, last line of the last scene punchline, unless a line names its own. */
const roleOf = (flat: readonly PremiseLine[], i: number): Role =>
  flat[i]!.role ?? (i === flat.length - 1 && flat.length > 1 ? "punchline" : i === 0 ? "setup" : "escalation");

/** Anchor on the last word of a line (by normalized word and occurrence, so punctuation never breaks it). */
export const lastWordAnchor = (text: string) => {
  const toks = tokenize(text);
  const last = toks[toks.length - 1]!;
  return { word: last.norm || normWord(last.text) || last.text, occurrence: toks.filter((t) => t.norm === last.norm).length };
};

const check = (p: Premise, lib: Library, sets: Readonly<Record<string, SetDef>>): Diagnostic[] => {
  const d: Diagnostic[] = [];
  const ids = p.cast.map((c) => c.id);
  const groups = groupsOf(p);
  const flat = groups.flatMap((g) => g.lines);
  p.cast.forEach((c, i) => {
    if (!lib.characters[c.character]) d.push(unknownId("character", c.character, Object.keys(lib.characters), ["cast", i, "character"]));
    else if (lib.characters[c.character]!.aspect && lib.characters[c.character]!.aspect !== p.aspect)
      d.push({ level: "error", code: "aspect-character", path: `cast[${i}].character`, message: `"${c.character}" is a ${lib.characters[c.character]!.aspect} character; this premise is ${p.aspect}`, expected: `a ${p.aspect} character` });
    if (c.holding && !lib.props[c.holding]) d.push(unknownId("prop", c.holding, Object.keys(lib.props), ["cast", i, "holding"]));
  });
  groups.forEach((g, i) => {
    const id = g.set;
    if (id && sets[id] && sets[id]!.aspect !== p.aspect)
      d.push({ level: "error", code: "aspect-set", path: p.scenes ? `scenes[${i}].set` : "set", message: `"${id}" is a ${sets[id]!.aspect} background; this premise is ${p.aspect}`, expected: `a ${p.aspect} set` });
  });
  const need = TEMPLATE_CAST[p.template];
  const most = TEMPLATE_CAST_MAX[p.template];
  if (p.cast.length < need || p.cast.length > most)
    d.push({ level: "error", code: "template-cast", path: "cast", message: need === most ? `template "${p.template}" needs ${need} cast members` : `template "${p.template}" needs ${need} to ${most} cast members`, example: `"cast": [{ "id": "milo", "character": "milo" }, { "id": "june", "character": "june" }]` });
  if (p.template === "family" && !p.cast.some((c) => c.character === "lila" || c.character === "theo"))
    d.push({ level: "error", code: "template-family", path: "cast", message: `family needs a kid (lila or theo)`, expected: `one adult and one or two kids` });
  if (p.template === "fable" && (p.cast[0]?.character !== "dash" || p.cast[1]?.character !== "moss"))
    d.push({ level: "error", code: "template-fable", path: "cast", message: `fable is Dash, then Moss`, example: `[{ "id": "dash", "character": "dash" }, { "id": "moss", "character": "moss" }]` });
  if (p.template === "explainer" && !flat.some((l) => l.who === "narrator"))
    d.push({ level: "error", code: "template-narrator", path: "lines", message: `an explainer needs a narrator line`, example: `{ "who": "narrator", "text": "The concept, in one sentence." }` });
  if (p.template === "explainer" && !flat.some((l) => l.who && l.who !== "narrator"))
    d.push({ level: "error", code: "template-dialog", path: "lines", message: `an explainer needs the cast to say the hook and the twist` });
  if (p.template === "me-vs-me" && p.cast.some((c) => !c.label))
    d.push({ level: "error", code: "template-labels", path: "cast", message: `me-vs-me: give both a "label" so viewers can tell them apart`, example: `{ "id": "me", "character": "milo", "label": "me" }, { "id": "brain", "character": "milo", "label": "my brain" }` });
  groups.forEach((g, s) => {
    const set = g.set ?? defaultSet(p.template, p.aspect);
    const where = p.scenes ? `scenes[${s}].set` : "set";
    if (!sets[set]) d.push(unknownId("set", set, Object.keys(sets), where.split(".")));
  });
  flat.forEach((l, i) => {
    const path = p.scenes ? sceneLinePath(groups, i, "who") : `lines[${i}].who`;
    const narratorLine = l.who === "narrator" && p.template === "explainer";
    if (l.who !== undefined && !ids.includes(l.who) && !narratorLine) d.push(unknownId("cast member", l.who, ids, path.split(".")));
    if (l.who === "narrator" && p.template !== "explainer") d.push({ level: "error", code: "line-speaker", path, message: `only an explainer has a narrator`, expected: `one of ${ids.join(", ")}` });
    if (l.who === undefined && p.template !== "text-slam" && p.cast.length > 1) d.push({ level: "error", code: "line-speaker", path, message: "who says this line?", expected: `one of ${ids.join(", ")}` });
    if (l.expression && !lib.expressions[l.expression]) d.push(unknownId("expression", l.expression, Object.keys(lib.expressions), path.replace(/who$/, "expression").split(".")));
    if (p.template === "text-slam" && l.text.length > 40) d.push({ level: "error", code: "slam-length", path: path.replace(/who$/, "text"), message: "slam text is at most 40 characters", expected: "a word or a short phrase" });
  });
  return d;
};

/** `lines[2]` or `scenes[1].lines[0]` for flat index `i`. */
const sceneLinePath = (groups: readonly Group[], i: number, key: string): string => {
  let at = i;
  for (let s = 0; s < groups.length; s++) {
    const n = groups[s]!.lines.length;
    if (at < n) return `scenes[${s}].lines[${at}].${key}`;
    at -= n;
  }
  return `lines[${i}].${key}`;
};

const spokenBeat = (p: Premise, line: PremiseLine, role: Role, id: string, n: { gesture: number }): Beat => {
  const l = line;
  const who = l.who ?? p.cast[0]!.id;
  const thought = who === "narrator";
  const actions: Action[] = [];
  const beat: Beat = { id, speaker: who, line: l.text, actions, ...(thought ? {} : { expression: l.expression ?? ROLE_EXPRESSION[role] }) };
  if (l.delivery) beat.delivery = l.delivery;
  if (l.voiceOver && !thought) beat.voiceOver = true;
  if (!thought && l.gag) actions.push({ who, do: "gag", gag: l.gag, at: { fraction: 0.2 } });
  else if (!thought && role === "escalation") actions.push({ who, do: "pose", pose: GESTURES[n.gesture++ % GESTURES.length]!, at: { fraction: 0.15 } });
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
  if (p.template === "fable") {
    const dash = p.cast[0]!.id;
    const last = beats.length - 1;
    return beats.map((b, i) => (i === last ? { ...b, actions: [...(b.actions ?? []), { who: dash, do: "walkTo" as const, mark: "off-right", at: { fraction: 0.2 } }] } : b));
  }
  return beats;
};

const slamBeats = (p: Premise, flat: readonly PremiseLine[]): Beat[] =>
  flat.map((l, i) => {
    const who = l.who ?? p.cast[0]!.id;
    const last = roleOf(flat, i) === "punchline";
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
  const r = PremiseSchema.safeParse(migrate("premise", json).doc);
  if (!r.success) throw new SkitError(fromZodIssues(r.error.issues));
  const p = r.data;
  const diags = check(p, lib, sets);
  if (diags.length) throw new SkitError(diags);
  const marks = marksFor(p.cast.length);
  const groups = groupsOf(p);
  const flat = groups.flatMap((g) => g.lines);
  const n = { gesture: 0 };
  const staged = p.template === "text-slam" ? slamBeats(p, flat) : dress(p, flat.map((line, i) => spokenBeat(p, line, roleOf(flat, i), `l${i + 1}`, n)));
  const setOf = (g: Group) => g.set ?? defaultSet(p.template, p.aspect);
  const narrated = flat.some((l) => l.who === "narrator");
  const sit = (set: string, mark: string) => p.template !== "fable" && seatHeightAt(sets[set]!, mark) !== undefined;
  const cast = p.cast.map((c, i) => ({
    id: c.id,
    character: c.character,
    mark: marks[i]!,
    ...(c.label ? { label: c.label } : {}),
    ...(c.holding ? { holding: { prop: c.holding, hand: "R" as const } } : p.template === "interview" && i === 0 ? { holding: { prop: "mic", hand: "R" as const } } : {}),
    ...(p.template === "interview" && i === 0 ? { pose: "hold-chest" } : {}),
  }));
  const meta = { title: p.title, aspect: p.aspect, ...(p.description ? { description: p.description } : {}), hashtags: p.hashtags };
  // One scene stays `beats`, so a premise written the old way stages the way it always has.
  if (!p.scenes) {
    const set = setOf(groups[0]!);
    return {
      schemaVersion: 2,
      meta,
      set,
      cast: cast.map((c, i) => ({ ...c, ...(sit(set, marks[i]!) ? { seated: true } : {}) })),
      ...(narrated ? { narrator: { id: "narrator" } } : {}),
      overlay: { ...(groups[0]!.pov ? { pov: groups[0]!.pov } : {}), subtitles: p.template !== "text-slam" },
      beats: staged,
    };
  }
  let at = 0;
  return {
    schemaVersion: 2,
    meta,
    cast,
    ...(narrated ? { narrator: { id: "narrator" } } : {}),
    overlay: { subtitles: p.template !== "text-slam" },
    scenes: groups.map((g, s) => {
      const set = setOf(g);
      const beats = staged.slice(at, at + g.lines.length);
      at += g.lines.length;
      // A scene `cast` replaces the whole cast, so name everyone. Seating depends on this set.
      const sitting = p.cast.some((_, i) => sit(set, marks[i]!));
      const cast = sitting ? p.cast.map((c, i) => ({ id: c.id, ...(sit(set, marks[i]!) ? { seated: true as const } : {}) })) : undefined;
      return { id: `s${s + 1}`, set, ...(g.pov ? { pov: g.pov } : {}), ...(g.card ? { card: { title: g.card } } : {}), ...(cast ? { cast } : {}), beats };
    }),
  };
};
