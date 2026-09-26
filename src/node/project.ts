/** A project: a workspace plus its registries. Loads, compiles, checks and summarizes skits. */
import fs from "node:fs";
import path from "node:path";
import { checkSkit, compileSkit, PreparedVoiceSchema, type CheckReport, type CompileResult, type Library, type Program, type ReactionTable, type SafeArea, type SetDef, type SfxManifest, type Timeline } from "../engine/core";
import type { Workspace } from "./workspace";

export type Project = {
  ws: Workspace;
  lib: Library;
  sets: Readonly<Record<string, SetDef>>;
  sfx: SfxManifest;
  reactions: ReactionTable;
  safeArea: SafeArea;
};

export const isSkit = (p: Project, id: string) => fs.existsSync(path.join(p.ws.skitDir(id), "skit.json"));

/** Compile `skit.json` with its prepared voice; writes `generated/timeline.json` (the program). Throws `SkitError`. */
export const compileSkitIn = (p: Project, id: string): CompileResult => {
  const dir = p.ws.skitDir(id);
  const skit = JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8"));
  const voicePath = path.join(dir, "generated/voice.prepared.json");
  const voice = fs.existsSync(voicePath) ? PreparedVoiceSchema.parse(JSON.parse(fs.readFileSync(voicePath, "utf8"))) : undefined;
  const r = compileSkit({ skit, voice, lib: p.lib, sets: p.sets, sfx: p.sfx, reactions: p.reactions });
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
    ...tl.beats.map((b) => `  beat ${b.id.padEnd(14)} ${b.kind.padEnd(8)} ${s(b.from)}–${s(b.to)}${b.speaker ? `  ${b.speaker}` : ""}${b.punchline ? "  PUNCHLINE" : ""}`),
    ...tl.shots.map((x) => `  cut  ${s(x.frame).padStart(6)}  ${x.framing}${x.on ? ` on ${x.on}` : ""}  (${x.reason})`),
    ...tl.punchIns.map((x) => `  punch ${s(x.frame).padStart(5)}  on ${x.on}`),
    ...tl.sfx.map((x) => `  sfx  ${s(x.frame).padStart(6)}  ${x.id}`),
    ...tl.slams.map((x) => `  slam ${s(x.from).padStart(6)}  ${x.text}`),
  ].join("\n");
};
