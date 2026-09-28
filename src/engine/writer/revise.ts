import type { Diagnostic } from "../director/diagnostics";
import type { Beat, SkitDoc, SkitInput } from "../director/schema";
import { lastWordAnchor } from "../templates/stage";
import { parseLoose } from "./parse";
import { repairPrompt } from "./repair";
import { ReplyError } from "./draft";
import type { WriterWorld } from "./world";

const PUNCH_PAUSE_MS = 450;
const PUNCH_HOLD_MS = 300;

type RawLine = { id?: string; who?: string; text: string; expression?: string; slam?: string; delivery?: string; gag?: string };
type Unit = { beat: Beat; trail: Beat[] };

const asString = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

const spoken = (b: Beat): boolean => !b.silent && !!b.line && !!b.speaker;

/** A silent slam beat is a line too: the words are the slam. */
const isSlamBeat = (b: Beat): boolean => b.silent && !!b.speaker && b.text.some((t) => t.type === "slam");

const unitsOf = (beats: readonly Beat[]): { lead: Beat[]; units: Unit[] } => {
  const lead: Beat[] = [];
  const units: Unit[] = [];
  for (const beat of beats) {
    if (spoken(beat) || isSlamBeat(beat)) units.push({ beat, trail: [] });
    else if (units.length === 0) lead.push(beat);
    else units[units.length - 1]!.trail.push(beat);
  }
  return { lead, units };
};

const linesOf = (data: unknown): RawLine[] => {
  const list = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { lines?: unknown }).lines) ? (data as { lines: unknown[] }).lines : beatsOf(data);
  return list.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : typeof o.line === "string" ? o.line.trim() : "";
    return [{ id: asString(o.id), who: asString(o.who) ?? asString(o.speaker), text, expression: asString(o.expression), slam: asString(o.slam), delivery: asString(o.delivery), gag: asString(o.gag) }];
  });
};

/** A model that sent a whole skit still only contributes its spoken lines. */
const beatsOf = (data: unknown): Record<string, unknown>[] => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const o = data as { beats?: unknown; scenes?: unknown };
  const beats = Array.isArray(o.beats) ? o.beats : Array.isArray(o.scenes) ? o.scenes.flatMap((s) => (s && typeof s === "object" && Array.isArray((s as { beats?: unknown }).beats) ? (s as { beats: unknown[] }).beats : [])) : [];
  return beats.flatMap((b) => {
    if (!b || typeof b !== "object") return [];
    const beat = b as Record<string, unknown>;
    if (typeof beat.line === "string") return [beat];
    const text = Array.isArray(beat.text) ? beat.text.find((t) => t && typeof t === "object" && (t as { type?: unknown }).type === "slam") : undefined;
    if (text && typeof text === "object" && typeof (text as { value?: unknown }).value === "string") return [{ ...beat, text: (text as { value: string }).value }];
    return [];
  });
};

const freshId = (wanted: string | undefined, used: Set<string>): string => {
  const ok = wanted && /^[A-Za-z0-9_-]+$/.test(wanted) && !used.has(wanted);
  if (ok) return wanted;
  let n = used.size + 1;
  while (used.has(`n${n}`)) n++;
  return `n${n}`;
};

const moodOf = (mood: string | undefined, path: string, world: WriterWorld, warnings: Diagnostic[]): string | undefined => {
  if (!mood) return undefined;
  if (world.expressions.includes(mood)) return mood;
  warnings.push({ level: "warning", code: "mood", path, message: `mood "${mood}" is not one StickStage has; played as "neutral"` });
  return "neutral";
};

const freshSpoken = (id: string, who: string, text: string, expression: string | undefined, gag?: string): Beat => ({
  id,
  silent: false,
  speaker: who,
  line: text,
  expression: expression ?? "neutral",
  audio: { source: "tts" },
  actions: gag ? [{ who, do: "gag", gag, at: { fraction: 0.2 } }] : [],
  sfx: [],
  text: [],
});

const freshSlam = (id: string, who: string, text: string, expression: string | undefined): Beat => ({
  id,
  silent: true,
  speaker: who,
  audio: { source: "tts" },
  durationMs: Math.min(2200, Math.max(1200, 900 + 45 * Math.min(text.length, 40))),
  actions: [{ who, do: "expression", expression: expression ?? "deadpan", at: { ms: 0 } }],
  text: [{ type: "slam", value: text.slice(0, 40), at: { ms: 120 }, durationMs: 1100 }],
  sfx: [{ id: "pop", at: { ms: 120 }, volume: 1 }],
});

const patch = (beat: Beat, line: RawLine, who: string, expression: string | undefined, warnings: Diagnostic[]): Beat => {
  if (isSlamBeat(beat)) {
    const next = structuredClone(beat);
    const cue = next.text.find((t) => t.type === "slam");
    if (cue && cue.type === "slam" && line.text !== cue.value) cue.value = line.text.slice(0, 40);
    const act = next.actions.find((a) => a.do === "expression");
    if (expression && act && act.do === "expression") act.expression = expression;
    if (who !== beat.speaker) {
      next.speaker = who;
      next.actions.forEach((a) => { if (a.who === beat.speaker) a.who = who; });
    }
    return next;
  }
  const textChanged = line.text !== beat.line || who !== beat.speaker;
  if (!textChanged) {
    const next = structuredClone(beat);
    if (expression && expression !== beat.expression) next.expression = expression;
    if (line.delivery) next.delivery = line.delivery;
    return next;
  }
  warnings.push({ level: "warning", code: "restage", path: `beats.${beat.id}`, message: `line "${beat.id}" changed, so it was staged again` });
  const next = freshSpoken(beat.id, who, line.text, expression, line.gag);
  if (line.delivery) next.delivery = line.delivery;
  return next;
};

const punchline = (beats: Beat[]) => {
  const last = [...beats].reverse().find((b) => spoken(b) || isSlamBeat(b));
  if (!last) return;
  for (const b of beats) {
    if (b === last || !b.punchline) continue;
    delete b.punchline;
    if (b.pauseBeforeMs === PUNCH_PAUSE_MS && b.holdAfterMs === PUNCH_HOLD_MS) {
      delete b.pauseBeforeMs;
      delete b.holdAfterMs;
    }
  }
  last.punchline = true;
  if (!isSlamBeat(last)) {
    if (last.pauseBeforeMs === undefined) last.pauseBeforeMs = PUNCH_PAUSE_MS;
    if (last.holdAfterMs === undefined) last.holdAfterMs = PUNCH_HOLD_MS;
  }
};

/**
 * A change reply → the same skit, with staging kept on every line whose words did not change.
 * New lines are staged, missing lines are dropped, and the punchline follows the last line.
 */
export const skitFromReply = (reply: string, doc: SkitDoc, world: WriterWorld): { skit: SkitInput; warnings: Diagnostic[] } => {
  const warnings: Diagnostic[] = [];
  const errors: Diagnostic[] = [];
  let parsed: unknown;
  try {
    parsed = parseLoose(reply);
  } catch {
    throw new ReplyError([{ level: "error", code: "reply-json", path: "(root)", message: "the reply is not JSON", expected: "one JSON object" }], repairPrompt([{ level: "error", code: "reply-json", path: "(root)", message: "the reply is not JSON", expected: '{"lines":[...]}' }], reply));
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && !Array.isArray((parsed as { lines?: unknown }).lines) && ((parsed as { beats?: unknown }).beats || (parsed as { scenes?: unknown }).scenes))
    warnings.push({ level: "warning", code: "reply-shape", path: "(root)", message: "the reply was a whole skit; only its lines were used" });
  const incoming = linesOf(parsed);
  if (!incoming.length) errors.push({ level: "error", code: "reply-lines", path: "lines", message: "the reply has no lines", expected: '{"lines":[{"id":"...","who":"...","text":"..."}]}' });
  if (errors.length) throw new ReplyError(errors, repairPrompt(errors, reply));

  const skit = structuredClone(doc);
  const scenes = skit.scenes ?? [{ id: "main", set: skit.set, beats: skit.beats! }];
  const castIds = skit.cast.map((c) => c.id);
  const speakers = skit.narrator ? [...castIds, skit.narrator.id] : castIds;
  const located = scenes.map((sc, scene) => ({ scene, ...unitsOf(sc.beats) }));
  const byId = new Map<string, { scene: number; unit: Unit }>();
  for (const loc of located) for (const unit of loc.units) byId.set(unit.beat.id, { scene: loc.scene, unit });
  const slamMode = located.some((l) => l.units.some((u) => isSlamBeat(u.beat))) && located.every((l) => l.units.every((u) => isSlamBeat(u.beat)));

  const used = new Set<string>();
  const buckets: Unit[][] = scenes.map(() => []);
  let scene = 0;
  incoming.forEach((line, i) => {
    if (!line.text) {
      errors.push({ level: "error", code: "reply-line", path: `lines[${i}].text`, message: "a line needs words" });
      return;
    }
    let who = line.who;
    if (!who) {
      if (castIds.length === 1) who = castIds[0]!;
      else errors.push({ level: "error", code: "line-speaker", path: `lines[${i}].who`, message: "who says this line?", expected: speakers.join(" or ") });
    } else if (!speakers.includes(who)) errors.push({ level: "error", code: "unknown-cast-member", path: `lines[${i}].who`, message: `unknown speaker "${who}"`, expected: speakers.join(" or ") });
    if (!who) return;
    const expression = moodOf(line.expression, `lines[${i}].expression`, world, warnings);
    const existing = line.id ? byId.get(line.id) : undefined;
    if (existing && !used.has(existing.unit.beat.id)) {
      scene = existing.scene;
      used.add(existing.unit.beat.id);
      const beat = patch(existing.unit.beat, line, who, expression, warnings);
      if (line.slam && i !== incoming.length - 1) warnings.push({ level: "warning", code: "slam", path: `lines[${i}].slam`, message: "a slam belongs on the last line; this one was dropped" });
      buckets[scene]!.push({ beat, trail: existing.unit.trail });
      return;
    }
    const id = freshId(line.id, new Set([...byId.keys(), ...used, ...buckets.flat().map((u) => u.beat.id)]));
    if (line.id && line.id !== id) warnings.push({ level: "warning", code: "line-id", path: `lines[${i}].id`, message: `id "${line.id}" is already used; the new line is "${id}"` });
    used.add(id);
    const beat = slamMode ? freshSlam(id, who, line.text, expression) : freshSpoken(id, who, line.text, expression, line.gag);
    if (line.delivery && spoken(beat)) beat.delivery = line.delivery;
    if (line.slam && i !== incoming.length - 1) warnings.push({ level: "warning", code: "slam", path: `lines[${i}].slam`, message: "a slam belongs on the last line; this one was dropped" });
    buckets[scene]!.push({ beat, trail: [] });
  });
  if (errors.length) throw new ReplyError(errors, repairPrompt(errors, reply));

  const dropped = [...byId.keys()].filter((id) => !used.has(id));
  if (dropped.length) warnings.push({ level: "warning", code: "lines-dropped", path: "lines", message: `dropped ${dropped.join(", ")}` });

  const built = scenes.flatMap((sc, i) => {
    const loc = located[i]!;
    const units = buckets[i]!;
    if (!units.length) {
      warnings.push({ level: "warning", code: "scene-dropped", path: skit.scenes ? `scenes[${i}]` : "beats", message: `scene "${sc.id}" lost every line, so it was dropped` });
      return [];
    }
    const beats = [...loc.lead, ...units.flatMap((u) => [u.beat, ...u.trail])];
    return [{ ...sc, beats }];
  });
  if (!built.length) throw new ReplyError([{ level: "error", code: "reply-lines", path: "lines", message: "every line was dropped", expected: "at least one line" }], repairPrompt([{ level: "error", code: "reply-lines", path: "lines", message: "every line was dropped" }], reply));

  const all = built.flatMap((sc) => sc.beats);
  punchline(all);
  // A slam on a line that is no longer the punchline is left; the model's slam on the last line wins.
  const lastSpoken = [...all].reverse().find(spoken);
  const lastIncoming = [...incoming].reverse().find((l) => l.text);
  if (lastSpoken?.line && lastIncoming?.slam) {
    if (lastIncoming.slam.length > 40) warnings.push({ level: "warning", code: "slam-length", path: "lines", message: "a slam is at most 40 characters; it was cut" });
    const value = lastIncoming.slam.slice(0, 40);
    const cue = lastSpoken.text.find((t) => t.type === "slam");
    if (cue && cue.type === "slam") cue.value = value;
    else lastSpoken.text = [...lastSpoken.text, { type: "slam", value, at: lastWordAnchor(lastSpoken.line), durationMs: 1100 }];
  }

  const without = (key: string) => Object.fromEntries(Object.entries(skit).filter(([k]) => k !== key));
  if (skit.scenes) return { skit: { ...without("beats"), scenes: built } as SkitInput, warnings };
  return { skit: { ...without("scenes"), beats: built[0]!.beats } as SkitInput, warnings };
};
