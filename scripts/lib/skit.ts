/** Load and compile a skit from `public/skits/<id>/` (Node side of the director). */
import fs from "node:fs";
import path from "node:path";
import { checkSkit, compileSkit, formatDiagnostics, formatReport, PreparedVoiceSchema, SkitError, type CheckReport, type CompileResult, type Program, type Timeline } from "../../src/engine";
import { library, reactions, safeArea, sets, sfxLibrary } from "../../src/data";
import { ROOT } from "./tools";

export const skitDir = (id: string) => path.join(ROOT, "public/skits", id);
export const isSkit = (id: string) => fs.existsSync(path.join(skitDir(id), "skit.json"));

/** Compile, printing diagnostics. Exits the process on errors. */
export const compileSkitDir = (id: string): CompileResult => {
  const dir = skitDir(id);
  const skit = JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8"));
  const voicePath = path.join(dir, "generated/voice.prepared.json");
  const voice = fs.existsSync(voicePath) ? PreparedVoiceSchema.parse(JSON.parse(fs.readFileSync(voicePath, "utf8"))) : undefined;
  try {
    const r = compileSkit({ skit, voice, lib: library, sets, sfx: sfxLibrary, reactions });
    if (r.warnings.length) console.warn(formatDiagnostics(r.warnings));
    fs.mkdirSync(path.join(dir, "generated"), { recursive: true });
    fs.writeFileSync(path.join(dir, "generated/timeline.json"), JSON.stringify(r.program));
    return r;
  } catch (e) {
    if (!(e instanceof SkitError)) throw e;
    console.error(`${path.relative(ROOT, path.join(dir, "skit.json"))}: ${formatDiagnostics(e.diagnostics)}`);
    process.exit(1);
  }
};

/** One-screen summary per scene: beats, shots and why, punch-ins, SFX (times are skit-absolute). */
export const summarize = (p: Program): string => {
  const head = `"${p.title}": ${p.scenes.length > 1 ? `${p.scenes.length} scenes, ` : ""}${(p.durationInFrames / p.fps).toFixed(2)}s (${p.durationInFrames} frames)`;
  return [
    head,
    ...p.scenes.map((sc) =>
      summarizeScene(sc.timeline, sc.from, p.scenes.length > 1 ? `scene ${sc.id}${sc.transitionIn ? ` (${sc.transitionIn.type} in)` : ""}` : undefined),
    ),
  ].join("\n");
};

const summarizeScene = (tl: Timeline, offset: number, label?: string): string => {
  const s = (f: number) => `${((f + offset) / tl.fps).toFixed(2)}s`;
  const rows = [
    `${label ? `${label}: ` : ""}${tl.beats.length} beats, set ${tl.set}`,
    ...tl.beats.map((b) => `  beat ${b.id.padEnd(14)} ${b.kind.padEnd(8)} ${s(b.from)}–${s(b.to)}${b.speaker ? `  ${b.speaker}` : ""}${b.punchline ? "  PUNCHLINE" : ""}`),
    ...tl.shots.map((x) => `  cut  ${s(x.frame).padStart(6)}  ${x.framing}${x.on ? ` on ${x.on}` : ""}  (${x.reason})`),
    ...tl.punchIns.map((p) => `  punch ${s(p.frame).padStart(5)}  on ${p.on}`),
    ...tl.sfx.map((x) => `  sfx  ${s(x.frame).padStart(6)}  ${x.id}`),
    ...tl.slams.map((x) => `  slam ${s(x.from).padStart(6)}  ${x.text}`),
  ];
  return rows.join("\n");
};

/** M5 self-check on a compiled skit; writes `generated/check.json` and prints the report. */
export const checkSkitDir = (id: string, result: CompileResult, quiet = false): CheckReport => {
  const r = checkSkit({ result, lib: library, sets, safeArea });
  fs.writeFileSync(path.join(skitDir(id), "generated/check.json"), JSON.stringify(r, null, 1));
  if (!quiet) console.log(formatReport(r, result.timeline.fps));
  return r;
};
