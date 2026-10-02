import type { MusicBed } from "../audio/music";
import { applyLanguage } from "../i18n/apply";
import { frameOfMeta } from "../format/aspect";
import { migrate } from "../migrate";
import { CharacterSchema } from "../rig/schema";
import { coverOf } from "./cover";
import { fromZodIssues, SkitError, type Diagnostic } from "./diagnostics";
import { applyHook, type HookKind } from "./hooks";
import { msToFrame } from "./layout";
import { docBeats, isNarration, SkitSchema, type Beat, type CastMember, type Skit, type SkitDoc } from "./schema";
import { compileScene, type CompileInput } from "./scene";
import { styleById, type StyleId } from "./style";
import { scienceChecks } from "./scienceChecks";
import { pronunciationsFor, type Pronunciation } from "../voice/pronounce";
import type { Program, SceneTransition, Timeline } from "./timeline";

export type { CompileInput } from "./scene";

export type SeriesStyle = { style?: StyleId; coldOpen?: HookKind };

export type CompiledScene = { id: string; skit: Skit; timeline: Timeline };

export type CompileResult = {
  /** The first scene's timeline (for a single-scene skit, the whole skit). */
  timeline: Timeline;
  /** The first scene, resolved. */
  skit: Skit;
  /** Every scene with its resolved skit and timeline. */
  scenes: CompiledScene[];
  /** What the renderer plays: scenes joined by transitions. */
  program: Program;
  doc: SkitDoc;
  warnings: Diagnostic[];
};

/** Validate the document's shape. Throws `SkitError` with path + expected + example per problem. */
export const parseSkit = (json: unknown): SkitDoc => {
  const r = SkitSchema.safeParse(migrate("skit", json).doc);
  if (!r.success) throw new SkitError(fromZodIssues(r.error.issues));
  const frame = frameOfMeta(r.data.meta);
  if (!frame.ok) throw new SkitError([{ level: "error", code: "aspect", path: `meta.${frame.path}`, message: frame.message }]);
  return { ...r.data, meta: { ...r.data.meta, aspect: frame.aspect, width: frame.width, height: frame.height } };
};

type Resolved = { id: string; skit: Skit; enter?: SceneTransition; remap: (path: string) => string };

const spoken = (b: Beat) => !b.silent && !!b.line;

/**
 * Split a document into scene skits. The punchline is global (flagged beats, else the last
 * spoken beat of the skit); later scenes start after their transition, and each scene's tail
 * leaves room for the next transition.
 */
export const resolveScenes = (doc: SkitDoc, diags: Diagnostic[], style = styleById(doc.style)): Resolved[] => {
  if (!doc.scenes) return [{ id: "main", skit: { ...doc, set: doc.set!, beats: doc.beats! }, remap: (p) => p }];
  if (doc.labels?.length)
    diags.push({ level: "warning", code: "label-root", path: "labels", message: "labels on a multi-scene skit are ignored; put them on each scene" });
  const all = docBeats(doc);
  const ids = all.map((b) => b.id);
  ids.forEach((id, i) => ids.indexOf(id) !== i && diags.push({ level: "error", code: "duplicate-id", path: "scenes", message: `duplicate beat id "${id}" (beat ids name voice files, so they are unique across scenes)` }));
  const flagged = all.some((b) => b.punchline);
  const last = [...all].reverse().find((b) => spoken(b) && b.punchline !== false);
  const { fps } = doc.meta;
  const gap = doc.timing.gapMs;
  const trans = doc.scenes.map((sc, i) => {
    if (i === 0) return undefined;
    const t = sc.transition ?? { type: style.transition, durationMs: style.fadeMs };
    return { type: t.type, durationFrames: t.type === "cut" ? 0 : msToFrame(t.durationMs, fps) } satisfies SceneTransition;
  });
  const transMs = (i: number) => ((trans[i]?.durationFrames ?? 0) / fps) * 1000;
  return doc.scenes.map((sc, s) => {
    const castPath = new Map<number, string>();
    // A card scene is text over the set: nobody on stage unless the scene says so.
    const sceneCast = sc.cast ?? (sc.card ? [] : undefined);
    const cast: CastMember[] = sceneCast
      ? sceneCast.flatMap((o, j) => {
          const base = doc.cast.find((c) => c.id === o.id);
          if (!base) {
            diags.push({ level: "error", code: "unknown-cast-member", path: `scenes[${s}].cast[${j}].id`, message: `"${o.id}" is not in the skit's cast`, expected: `one of ${doc.cast.map((c) => c.id).join(", ")}` });
            return [];
          }
          castPath.set(castPath.size, `scenes[${s}].cast[${j}]`);
          const defined = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
          return [{ ...base, ...defined } as CastMember];
        })
      : doc.cast.map((c, j) => (castPath.set(j, `cast[${j}]`), c));
    const beats = sc.beats.map((b) => (spoken(b) && b.punchline === undefined ? { ...b, punchline: !flagged && b === last } : b));
    const skit: Skit = {
      ...doc,
      set: sc.set ?? doc.set!,
      cast,
      beats,
      card: sc.card,
      labels: sc.labels,
      figures: sc.figures,
      overlay: { ...doc.overlay, pov: sc.pov ?? (s === 0 ? doc.overlay.pov : undefined) },
      timing: {
        gapMs: gap,
        leadInMs: s === 0 ? doc.timing.leadInMs : transMs(s) + gap,
        tailMs: s === doc.scenes!.length - 1 ? doc.timing.tailMs : gap + transMs(s + 1),
      },
    };
    const remap = (p: string) => {
      const m = p.match(/^cast\[(\d+)\](.*)$/);
      if (m) return `${castPath.get(Number(m[1])) ?? `scenes[${s}].cast`}${m[2]}`;
      return /^(beats|set|card|figures)\b/.test(p) ? `scenes[${s}].${p}` : p;
    };
    return { id: sc.id, skit, enter: trans[s], remap };
  });
};

/** skit.json + prepared voice + library → program (scene timelines). Throws `SkitError` on any error. */
const withCharacters = (input: CompileInput, doc: SkitDoc): CompileInput => {
  if (!doc.characters?.length) return input;
  const characters = { ...input.lib.characters };
  for (const raw of doc.characters) {
    const parsed = CharacterSchema.safeParse(raw);
    if (parsed.success) characters[parsed.data.id] = parsed.data;
  }
  return { ...input, lib: { ...input.lib, characters } };
};

export const compileSkit = (input: CompileInput): CompileResult => {
  const parsed = parseSkit(input.skit);
  const doc = input.lang ? applyLanguage(parsed, input.lang) : parsed;
  const show = doc.meta.series ? input.series?.[doc.meta.series.id] : undefined;
  const style = styleById(doc.style ?? show?.style);
  const cold = (doc.coldOpen ?? show?.coldOpen) as HookKind | undefined;
  const sceneInput = withCharacters({ ...input, style }, doc);
  const diags: Diagnostic[] = [];
  const resolved = resolveScenes(doc, diags, style);
  const scenes: CompiledScene[] = [];
  for (const r of resolved) {
    let found: Diagnostic[];
    try {
      const out = compileScene(r.skit, sceneInput);
      scenes.push({ id: r.id, skit: r.skit, timeline: out.timeline });
      found = out.warnings;
    } catch (e) {
      if (!(e instanceof SkitError)) throw e;
      found = e.diagnostics;
    }
    diags.push(...found.map((d) => ({ ...d, path: r.remap(d.path) })));
  }
  const bed = doc.music ? input.music?.beds.find((b) => b.id === doc.music) : undefined;
  if (doc.music && !bed)
    diags.push({ level: "error", code: "unknown-music", path: "music", message: `unknown music bed "${doc.music}"`, expected: input.music?.beds.map((b) => b.id).join(", ") || "pass a music manifest" });
  if (diags.some((d) => d.level === "error")) throw new SkitError(diags);
  diags.push(...scienceChecks(doc, input.skit));
  const music: MusicBed | undefined = bed ? { src: bed.file, gain: bed.gain, ducked: bed.ducked } : undefined;

  let from = 0;
  const programScenes = scenes.map((sc, i) => {
    const t = resolved[i]!.enter;
    if (i > 0) from += scenes[i - 1]!.timeline.durationInFrames - (t?.durationFrames ?? 0);
    return { id: sc.id, from, transitionIn: t, timeline: sc.timeline };
  });
  const lastScene = programScenes[programScenes.length - 1]!;
  const program: Program = {
    schemaVersion: 1,
    title: doc.meta.title,
    fps: doc.meta.fps,
    width: doc.meta.width,
    height: doc.meta.height,
    durationInFrames: lastScene.from + lastScene.timeline.durationInFrames,
    scenes: programScenes,
    ...(music ? { music } : {}),
  };
  const covered = { ...program, cover: coverOf(program, doc.meta.series) };
  const hooked = cold && cold !== "pov" ? applyHook(covered, cold) : covered;
  return { timeline: scenes[0]!.timeline, skit: scenes[0]!.skit, scenes, program: hooked, doc, warnings: diags };
};

export type SkitLine = {
  id: string;
  speaker: string;
  /** Character id, or the narrator's id for voice-over lines. */
  character: string;
  text: string;
  /** Say this instead of `text` (the caption keeps `text`). */
  spoken?: string;
  /** Words in the line with a pronunciation hint (`pronunciations.json`), for the TTS. */
  pronounce?: Pronunciation[];
  delivery?: string;
  /** A voice-over line: voice it with `doc.narrator.voice`, not a character's voice. */
  narrator?: true;
};

/** The lines a voice source must synthesize: one per spoken TTS beat (id = beat id = voice file name). */
export const skitLines = (doc: SkitDoc, lexicon: readonly Pronunciation[] = []): SkitLine[] =>
  docBeats(doc).flatMap((b) => {
    if (b.silent || !b.speaker || !b.line || b.audio.source !== "tts") return [];
    const said = b.spoken ?? b.line;
    const pronounce = pronunciationsFor(said, lexicon);
    const extra = { ...(b.spoken ? { spoken: b.spoken } : {}), ...(pronounce.length ? { pronounce } : {}) };
    if (isNarration(doc, b)) return [{ id: b.id, speaker: b.speaker, character: b.speaker, text: b.line, ...extra, delivery: b.delivery, narrator: true as const }];
    const character = doc.cast.find((c) => c.id === b.speaker)?.character ?? b.speaker;
    return [{ id: b.id, speaker: b.speaker, character, text: b.line, ...extra, delivery: b.delivery }];
  });
