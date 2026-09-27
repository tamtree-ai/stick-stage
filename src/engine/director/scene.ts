/** Compile one resolved scene (a single-scene skit is one scene). */
import type { Library } from "../rig/actorState";
import type { SetDef } from "../set/schema";
import type { SafeArea } from "../text/safeArea";
import { buildCaptionPages } from "../text/captions";
import { cardLayout } from "../text/layout";
import type { PreparedLine, PreparedVoice } from "../voice/schema";
import { solveShots } from "./camera";
import { DEFAULT_SAFE_AREA } from "./camera";
import { SkitError, unknownId, type Diagnostic } from "./diagnostics";
import { anchorFrame, layoutBeats, msToFrame, reactorFor, type LaidBeat } from "./layout";
import { xAt } from "./placement";
import { isNarration, type Beat, type ReactionTable, type SfxManifest, type Skit } from "./schema";
import { planShots } from "./shots";
import { buildTracks } from "./tracks";
import type { AudioClip, CardEvent, ListEvent, SfxEvent, SlamEvent, Timeline } from "./timeline";

export type CompileInput = {
  /** Raw `skit.json` (validated by `compileSkit`). */
  skit: unknown;
  /** Prepared voice (`generated/voice.prepared.json`); needed for spoken beats. */
  voice?: PreparedVoice;
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  sfx: SfxManifest;
  reactions: ReactionTable;
  /** Face shots keep the face in this area. Default: `DEFAULT_SAFE_AREA`. */
  safeArea?: SafeArea;
};


const FACE_FRAMINGS = ["medium", "close", "extreme"];

/** Library ids the schema can't check: poses, expressions, props, sfx, characters, cast refs. */
const checkIds = (skit: Skit, input: CompileInput, diags: Diagnostic[]) => {
  const { lib, sets, sfx } = input;
  const ids = (t: object) => Object.keys(t);
  const castIds = skit.cast.map((c) => c.id);
  const need = (kind: string, got: string | undefined, known: string[], path: (string | number)[]) => {
    if (got !== undefined && !known.includes(got)) diags.push(unknownId(kind, got, known, path));
  };
  need("set", skit.set, ids(sets), ["set"]);
  const dup = (xs: string[], path: string, what: string) =>
    xs.forEach((x, i) => xs.indexOf(x) !== i && diags.push({ level: "error", code: "duplicate-id", path: `${path}[${i}].id`, message: `duplicate ${what} id "${x}"` }));
  dup(castIds, "cast", "cast");
  dup(skit.beats.map((b) => b.id), "beats", "beat");
  skit.cast.forEach((c, i) => {
    need("character", c.character, ids(lib.characters), ["cast", i, "character"]);
    need("pose", c.pose, ids(lib.poses), ["cast", i, "pose"]);
    need("expression", c.expression, ids(lib.expressions), ["cast", i, "expression"]);
    need("prop", c.holding?.prop, ids(lib.props), ["cast", i, "holding", "prop"]);
  });
  const sounds = sfx.sounds.map((s) => s.id);
  const speakers = skit.narrator ? [...castIds, skit.narrator.id] : castIds;
  skit.beats.forEach((b, i) => {
    const p = (...rest: (string | number)[]) => ["beats", i, ...rest];
    if (b.speaker !== undefined && !speakers.includes(b.speaker)) {
      const d = unknownId("speaker", b.speaker, speakers, p("speaker"));
      if (!skit.narrator && /narrat|voice/i.test(b.speaker)) d.example = `"narrator": { "id": "${b.speaker}", "voice": { "say": "Alex" } }  (skit level)`;
      diags.push(d);
    }
    need("cast member", b.focus, castIds, p("focus"));
    if (b.focus !== undefined && !isNarration(skit, b))
      diags.push({ level: "error", code: "focus-not-narration", path: `beats[${i}].focus`, message: `"focus" is for narrator beats; a cast line already centers its speaker`, expected: `remove "focus", or make the narrator speak this line` });
    if (isNarration(skit, b) && b.expression)
      diags.push({ level: "error", code: "narrator-expression", path: `beats[${i}].expression`, message: "the narrator has no face", expected: "an expression action on the cast member on screen", example: `{ "who": "${b.focus ?? castIds[0] ?? "milo"}", "do": "expression", "expression": "${b.expression}" }` });
    need("expression", b.expression, ids(lib.expressions), p("expression"));
    if (typeof b.reaction === "string") need("expression", b.reaction, ids(lib.expressions), p("reaction"));
    if (b.silent && b.expression)
      diags.push({ level: "error", code: "silent-with-expression", path: `beats[${i}].expression`, message: "a silent beat has no speaker", expected: `an action instead`, example: `{ "who": "milo", "do": "expression", "expression": "${b.expression}" }` });
    if (b.shot) {
      need("cast member", b.shot.on, castIds, p("shot", "on"));
      need("cast member", b.shot.punchIn?.on, castIds, p("shot", "punchIn", "on"));
      if (FACE_FRAMINGS.includes(b.shot.framing) && !b.shot.on)
        diags.push({ level: "error", code: "shot-needs-on", path: `beats[${i}].shot.on`, message: `framing "${b.shot.framing}" needs "on"`, expected: `one of ${castIds.join(", ")}`, example: `"shot": { "framing": "${b.shot.framing}", "on": "${castIds[0]}" }` });
    }
    b.actions.forEach((a, j) => {
      if (a.do === "pose") need("pose", a.pose, ids(lib.poses), p("actions", j, "pose"));
      if (a.do === "expression") need("expression", a.expression, ids(lib.expressions), p("actions", j, "expression"));
      if (a.do === "hold") need("prop", a.prop, ids(lib.props), p("actions", j, "prop"));
    });
    b.sfx.forEach((s, j) => need("sound", s.id, sounds, p("sfx", j, "id")));
  });
  if (skit.card?.beat !== undefined) need("beat", skit.card.beat, skit.beats.map((b) => b.id), ["card", "beat"]);
};

/** Card title lines stagger in this far apart when one anchor reveals them all. */
export const CARD_STAGGER_FRAMES = 5;

/** The scene's title card: lines from the layout, revealed on the card's anchors. */
const cardEvent = (skit: Skit, laid: readonly LaidBeat[], safeArea: CompileInput["safeArea"], durationInFrames: number, diags: Diagnostic[]): CardEvent | undefined => {
  const card = skit.card;
  if (!card) return undefined;
  const { fps, width, height } = skit.meta;
  const { lines } = cardLayout(card.title, card.kicker, width, height, safeArea ?? DEFAULT_SAFE_AREA);
  const id = card.beat ?? skit.beats[0]!.id;
  const b = laid.find((x) => x.beat.id === id && !x.synthetic)!;
  const anchors = Array.isArray(card.at) ? card.at : [card.at];
  if (anchors.length > 1 && anchors.length !== lines.length)
    diags.push({ level: "error", code: "card-lines", path: "card.at", message: `${anchors.length} anchors for a title of ${lines.length} line${lines.length === 1 ? "" : "s"} (${lines.map((l) => `"${l}"`).join(", ")})`, expected: `one anchor, or one per line (force breaks with "\n")` });
  const frames = anchors.map((a, i) => anchorFrame(b, a, anchors.length > 1 ? `card.at[${i}]` : "card.at", fps, diags));
  if (frames.some((f) => f === undefined)) return undefined;
  const at = lines.map((_, i) => (anchors.length > 1 ? frames[Math.min(i, frames.length - 1)]! : frames[0]! + i * CARD_STAGGER_FRAMES));
  return { kicker: card.kicker, lines, kickerFrom: Math.min(4, at[0]!), at, to: durationInFrames };
};

/** The speaker's expression going into beat `index` (for the default punchline reaction). */
const speakerExpression = (skit: Skit, index: number, speaker: string): string => {
  for (let i = index; i >= 0; i--) {
    const b = skit.beats[i]!;
    if (b.speaker === speaker && b.expression) return b.expression;
    const act = [...b.actions].reverse().find((a) => a.who === speaker && a.do === "expression");
    if (act && act.do === "expression") return act.expression;
  }
  return skit.cast.find((c) => c.id === speaker)?.expression ?? "neutral";
};

/** One resolved scene + prepared voice + library → frame-indexed timeline. Throws `SkitError` on errors. */
export const compileScene = (skit: Skit, input: CompileInput): { timeline: Timeline; warnings: Diagnostic[] } => {
  const diags: Diagnostic[] = [];
  checkIds(skit, input, diags);
  const fail = () => diags.some((d) => d.level === "error");
  if (fail()) throw new SkitError(diags);

  const { fps, width, height } = skit.meta;
  const set = input.sets[skit.set]!;
  const lines = new Map<string, PreparedLine>((input.voice?.lines ?? []).map((l) => [l.id, l]));
  const reactionFor = (beat: Beat, i: number) => {
    const reactor = reactorFor(skit, i, beat.speaker!);
    if (!reactor) return undefined;
    // Voice-over: the focus reacts to what's said about them, from where their face already is.
    const e = speakerExpression(skit, i, isNarration(skit, beat) ? reactor : beat.speaker!);
    const expression = typeof beat.reaction === "string" ? beat.reaction : (input.reactions.punchline[e] ?? input.reactions.defaultPunchline);
    return { reactor, expression };
  };
  const layout = layoutBeats(skit, lines, reactionFor, diags);
  if (fail()) throw new SkitError(diags);

  const { cast, moments } = buildTracks(skit, layout, set, input.lib, input.reactions, fps, diags);
  const hint = (e: string) => input.lib.expressions[e]?.closeup;
  const settleAt = (who: string, f: number) => {
    let at = f;
    for (const k of cast.find((c) => c.id === who)?.moveKeys ?? []) if (k.frame <= at && at < k.frame + k.durationFrames) at = k.frame + k.durationFrames;
    return at;
  };
  const plan = planShots(layout, moments, hint, fps, diags, settleAt);
  if (fail()) throw new SkitError(diags);
  const { shots, punchIns, shakes } = solveShots(plan, cast, input.lib, set, fps, width, height, input.safeArea, msToFrame(layout.totalMs, fps));

  const audio: AudioClip[] = [];
  const sfx: SfxEvent[] = [];
  const slams: SlamEvent[] = [];
  const lists: ListEvent[] = [];
  const sounds = new Map(input.sfx.sounds.map((s) => [s.id, s]));
  for (const b of layout.beats) {
    const where = b.path.join(".").replace(/\.(\d+)/g, "[$1]");
    if (b.line && b.kind === "line") {
      // Clips from a source file (audio.source "file") are trimmed copies prepared like TTS lines.
      audio.push({ frame: msToFrame(b.zeroMs, fps), durationFrames: Math.ceil((b.line.durationMs / 1000) * fps) + 1, src: b.line.audio, beatId: b.beat.id });
    }
    b.beat.sfx.forEach((s, j) => {
      const frame = anchorFrame(b, s.at, `${where}.sfx[${j}].at`, fps, diags);
      const snd = sounds.get(s.id)!;
      if (frame !== undefined)
        sfx.push({ frame: Math.max(0, frame), id: s.id, src: snd.file, volume: s.volume * snd.gain, durationFrames: Math.ceil((snd.durationMs / 1000) * fps) + 1 });
    });
    b.beat.text.forEach((t, j) => {
      if (t.type === "list") {
        const at = t.at.map((a, k) => anchorFrame(b, a, `${where}.text[${j}].at[${k}]`, fps, diags));
        if (at.every((f) => f !== undefined)) lists.push({ items: t.items, at: at as number[], to: 0 });
        return;
      }
      const frame = anchorFrame(b, t.at, `${where}.text[${j}].at`, fps, diags);
      if (frame !== undefined) slams.push({ text: t.value, from: frame, to: frame + msToFrame(t.durationMs, fps) });
    });
  }
  if (fail()) throw new SkitError(diags);

  // Screen direction: characters keep their left/right order across the whole skit.
  const order = (f: number) => [...cast].sort((a, b) => xAt(a, f) - xAt(b, f)).map((c) => c.id).join(",");
  const durationInFrames = msToFrame(layout.totalMs, fps);
  if (order(0) !== order(durationInFrames))
    diags.push({ level: "warning", code: "screen-direction", path: "beats", message: "a slideTo swaps the characters' sides; screen direction breaks across cuts" });

  const card = cardEvent(skit, layout.beats, input.safeArea, durationInFrames, diags);
  if (fail()) throw new SkitError(diags);
  const nextCut = (f: number) => shots.find((c) => c.frame > f)?.frame ?? durationInFrames;
  const spoken = layout.beats.filter((b) => b.kind === "line" && b.line);
  const timeline: Timeline = {
    schemaVersion: 1,
    title: skit.meta.title,
    fps,
    width,
    height,
    durationInFrames,
    set: skit.set,
    cast,
    beats: layout.beats.map((b) => ({
      id: b.beat.id,
      kind: b.kind,
      synthetic: b.synthetic,
      punchline: b.punchline,
      from: msToFrame(b.fromMs, fps),
      to: msToFrame(b.endMs, fps),
      speaker: b.beat.speaker,
      ...(b.narrator ? { narrator: true } : {}),
      audioFrom: b.line ? msToFrame(b.zeroMs, fps) : undefined,
      audioTo: b.line ? msToFrame(b.zeroMs + b.line.durationMs, fps) : undefined,
    })),
    shots,
    punchIns,
    shakes,
    audio,
    sfx: sfx.sort((a, b) => a.frame - b.frame),
    pov: skit.overlay.pov ? { text: skit.overlay.pov, from: 4, to: durationInFrames } : undefined,
    // A slam belongs to its shot: it ends at the next cut.
    slams: slams
      .sort((a, b) => a.from - b.from)
      .map((sl) => ({ ...sl, to: Math.min(sl.to, nextCut(sl.from)) })),
    // A list belongs to its shot too: it leaves at the first cut after its first item.
    lists: lists.map((l) => ({ ...l, to: nextCut(l.at[0]!) })),
    ...(card ? { card } : {}),
    pages: skit.overlay.subtitles
      ? buildCaptionPages(spoken.map((b) => ({ startMs: (msToFrame(b.zeroMs, fps) / fps) * 1000, words: b.line!.words, narrator: b.narrator })))
      : [],
    ...(skit.narrator ? { narratorCaption: skit.narrator.captionStyle } : {}),
  };
  return { timeline, warnings: diags };
};

