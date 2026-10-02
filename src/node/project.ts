/** A project: a workspace plus its registries. Loads, compiles, checks and summarizes skits. */
import fs from "node:fs";
import path from "node:path";
import { applyLanguage, checkSkit, compileSkit, parseSkit, placeholderVoice, PreparedVoiceSchema, skitLines, type CheckReport, type CompileResult, type Library, type Program, type ReactionTable, type SafeArea, type SeriesStyle, type SetDef, type SfxManifest, type Timeline, type ImageDef, type Pronunciation } from "../engine/core";
import type { Workspace } from "./workspace";
import { prepEquations } from "./figures";

export type Project = {
  ws: Workspace;
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  sfx: SfxManifest;
  reactions: ReactionTable;
  safeArea: SafeArea;
  /** Series documents, so a skit can inherit style and cold open. */
  series?: Readonly<Record<string, SeriesStyle>>;
  /** Credited NASA / ESA images figures may show. */
  images?: Readonly<Record<string, ImageDef>>;
  /** How to say science words (`pronunciations.json`), listed per line for the harness TTS. */
  pronunciations?: readonly Pronunciation[];
};

export const isSkit = (p: Project, id: string) => fs.existsSync(path.join(p.ws.skitDir(id), "skit.json"));

/** Compile `skit.json` with its prepared voice; writes `generated/timeline.json` (the program). Throws `SkitError`. */
export const compileSkitIn = (p: Project, id: string, extra?: { lang?: string; coldOpen?: "pov" | "none" | "teaser" | "slam" }): CompileResult => {
  const dir = p.ws.skitDir(id);
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8")) as Record<string, unknown>;
  const skit = extra?.coldOpen ? { ...raw, coldOpen: extra.coldOpen === "pov" ? "pov" : extra.coldOpen } : raw;
  const voicePath = path.join(dir, extra?.lang ? `generated/voice.${extra.lang}.prepared.json` : "generated/voice.prepared.json");
  const voice = fs.existsSync(voicePath)
    ? PreparedVoiceSchema.parse(JSON.parse(fs.readFileSync(voicePath, "utf8")))
    : extra?.lang
      ? placeholderVoice(skitLines(applyLanguage(parseSkit(skit), extra.lang)), extra.lang)
      : undefined;
  // Equations are typeset here too (hash-cached), so a compile never waits on a separate prep.
  const { equations } = prepEquations(dir, skit);
  const r = compileSkit({ skit, voice, lib: p.lib, sets: p.sets, sfx: p.sfx, reactions: p.reactions, safeArea: p.safeArea, series: p.series, lang: extra?.lang, figures: { equations, images: p.images } });
  fs.mkdirSync(path.join(dir, "generated"), { recursive: true });
  fs.writeFileSync(path.join(dir, "generated/timeline.json"), JSON.stringify(r.program));
  return r;
};

/** Self-check a compiled skit; writes `generated/check.json`. */
export const checkSkitIn = (p: Project, id: string, result: CompileResult): CheckReport => {
  const r = checkSkit({ result, lib: p.lib, sets: p.sets, safeArea: p.safeArea });
  fs.writeFileSync(path.join(p.ws.skitDir(id), "generated/check.json"), JSON.stringify(r, null, 1));
  return r;
};

/** One-screen summary per scene: beats, shots and why, punch-ins, SFX (times are skit-absolute). */
export const summarize = (prog: Program): string => {
  const head = `"${prog.title}": ${prog.scenes.length > 1 ? `${prog.scenes.length} scenes, ` : ""}${(prog.durationInFrames / prog.fps).toFixed(2)}s (${prog.durationInFrames} frames)`;
  return [head, ...prog.scenes.map((sc) => summarizeScene(sc.timeline, sc.from, prog.scenes.length > 1 ? `scene ${sc.id}${sc.transitionIn ? ` (${sc.transitionIn.type} in)` : ""}` : undefined))].join("\n");
};

const summarizeScene = (tl: Timeline, offset: number, label?: string): string => {
  const s = (f: number) => `${((f + offset) / tl.fps).toFixed(2)}s`;
  return [
    `${label ? `${label}: ` : ""}${tl.beats.length} beats, set ${tl.set}`,
    ...tl.beats.map((b) => `  beat ${b.id.padEnd(14)} ${b.kind.padEnd(8)} ${s(b.from)}–${s(b.to)}${b.speaker ? `  ${b.speaker}${b.narrator ? " (voice-over)" : ""}` : ""}${b.punchline ? "  PUNCHLINE" : ""}`),
    ...tl.shots.map((x) => `  cut  ${s(x.frame).padStart(6)}  ${x.framing}${x.on ? ` on ${x.on}` : ""}  (${x.reason})`),
    ...tl.punchIns.map((x) => `  punch ${s(x.frame).padStart(5)}  on ${x.on}`),
    ...tl.sfx.map((x) => `  sfx  ${s(x.frame).padStart(6)}  ${x.id}`),
    ...tl.slams.map((x) => `  slam ${s(x.from).padStart(6)}  ${x.text}`),
    ...tl.lists.flatMap((l) => l.items.map((it, i) => `  list ${s(l.at[i]!).padStart(6)}  ${it}`)),
    ...(tl.card ? [`  card ${s(tl.card.at[0]!).padStart(6)}  ${tl.card.kicker ? `${tl.card.kicker} / ` : ""}${tl.card.lines.join(" / ")}`] : []),
  ].join("\n");
};
