import { migrate } from "../migrate";
import { fromZodIssues, SkitError, type Diagnostic } from "./diagnostics";
import { msToFrame } from "./layout";
import { docBeats, SkitSchema, type Beat, type CastMember, type Skit, type SkitDoc } from "./schema";
import { compileScene, type CompileInput } from "./scene";
import type { Program, SceneTransition, Timeline } from "./timeline";

export type { CompileInput } from "./scene";

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
  return r.data;
};

type Resolved = { id: string; skit: Skit; enter?: SceneTransition; remap: (path: string) => string };

const spoken = (b: Beat) => !b.silent && !!b.line;

/**
 * Split a document into scene skits. The punchline is global (flagged beats, else the last
 * spoken beat of the skit); later scenes start after their transition, and each scene's tail
 * leaves room for the next transition.
 */
export const resolveScenes = (doc: SkitDoc, diags: Diagnostic[]): Resolved[] => {
  if (!doc.scenes) return [{ id: "main", skit: { ...doc, set: doc.set!, beats: doc.beats! }, remap: (p) => p }];
  const all = docBeats(doc);
  const ids = all.map((b) => b.id);
  ids.forEach((id, i) => ids.indexOf(id) !== i && diags.push({ level: "error", code: "duplicate-id", path: "scenes", message: `duplicate beat id "${id}" (beat ids name voice files, so they are unique across scenes)` }));
  const flagged = all.some((b) => b.punchline);
  const last = [...all].reverse().find((b) => spoken(b) && b.punchline !== false);
  const { fps } = doc.meta;
  const gap = doc.timing.gapMs;
  const trans = doc.scenes.map((sc, i) => {
    if (i === 0) return undefined;
    const t = sc.transition ?? { type: "fade" as const, durationMs: 400 };
    return { type: t.type, durationFrames: t.type === "cut" ? 0 : msToFrame(t.durationMs, fps) } satisfies SceneTransition;
  });
  const transMs = (i: number) => ((trans[i]?.durationFrames ?? 0) / fps) * 1000;
  return doc.scenes.map((sc, s) => {
    const castPath = new Map<number, string>();
    const cast: CastMember[] = sc.cast
      ? sc.cast.flatMap((o, j) => {
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
      return /^(beats|set)\b/.test(p) ? `scenes[${s}].${p}` : p;
    };
    return { id: sc.id, skit, enter: trans[s], remap };
  });
};

/** skit.json + prepared voice + library → program (scene timelines). Throws `SkitError` on any error. */
export const compileSkit = (input: CompileInput): CompileResult => {
  const doc = parseSkit(input.skit);
  const diags: Diagnostic[] = [];
  const resolved = resolveScenes(doc, diags);
  const scenes: CompiledScene[] = [];
  for (const r of resolved) {
    let found: Diagnostic[];
    try {
      const out = compileScene(r.skit, input);
      scenes.push({ id: r.id, skit: r.skit, timeline: out.timeline });
      found = out.warnings;
    } catch (e) {
      if (!(e instanceof SkitError)) throw e;
      found = e.diagnostics;
    }
    diags.push(...found.map((d) => ({ ...d, path: r.remap(d.path) })));
  }
  if (diags.some((d) => d.level === "error")) throw new SkitError(diags);

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
  };
  return { timeline: scenes[0]!.timeline, skit: scenes[0]!.skit, scenes, program, doc, warnings: diags };
};

/** The lines a voice source must synthesize: one per spoken TTS beat (id = beat id = voice file name). */
export const skitLines = (doc: SkitDoc) =>
  docBeats(doc).flatMap((b) => {
    if (b.silent || !b.speaker || !b.line || b.audio.source !== "tts") return [];
    const character = doc.cast.find((c) => c.id === b.speaker)?.character ?? b.speaker;
    return [{ id: b.id, speaker: b.speaker, character, text: b.line, delivery: b.delivery }];
  });
