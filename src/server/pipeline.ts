/**
 * One render job, the same steps as `pnpm batch`: prep (child process) → compile → self-check →
 * MP4 (+ optional contact sheet) → post files. Outputs land in `<job>/out/`.
 */
import { makeCancelSignal } from "@remotion/renderer";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { catalogVersion, planSegments, slug, SkitError, type Program } from "../engine/core";
import { checkSkitIn, compileSkitIn, writePostFiles, type Project, type RenderBackend } from "../node";
import { JobFailure, type HookVariant, type Job, type JobOutput, type JobRun } from "./jobs";

export type PrepOutcome = { lines: number; hits: number; mouthTool: string; warnings: string[] };
export type PrepRunner = (skitId: string, signal: AbortSignal) => Promise<PrepOutcome>;

const CHILD = path.join(import.meta.dirname, "prep-child.ts");

/** Prep in a child process that inherits this process's loader flags (tsx), so it runs the same TypeScript. */
export const childPrep =
  (root: string, o: { requireLipSync: boolean }): PrepRunner =>
  (skitId, signal) =>
    new Promise((resolve, reject) => {
      const args = [...process.execArgv, CHILD, root, skitId, ...(o.requireLipSync ? ["--require-lipsync"] : [])];
      const child = spawn(process.execPath, args, { signal, stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      let err = "";
      child.stdout.on("data", (c) => (out += c));
      child.stderr.on("data", (c) => (err += c));
      child.on("error", reject);
      child.on("close", (code) => {
        const last = out.trim().split("\n").pop() ?? "";
        let r: ({ ok: true } & PrepOutcome) | { ok: false; message: string } | undefined;
        try {
          r = JSON.parse(last);
        } catch {
          r = undefined;
        }
        if (r?.ok) resolve(r);
        else reject(new JobFailure("prep-failed", r && !r.ok ? r.message : `prep exited ${code}: ${err.trim().slice(-2000)}`));
      });
    });

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  srt: "application/x-subrip",
  txt: "text/plain; charset=utf-8",
  manifest: "application/json",
  sheet: "image/png",
  cover: "image/png",
  thumbnail: "image/png",
  voice: "application/json",
};

export const renderPipeline =
  (o: { project: Project; backend: RenderBackend; prep: PrepRunner; skitIdOf: (jobId: string) => string }): JobRun =>
  async (job, { dir, signal, update }) => {
    const id = o.skitIdOf(job.id);
    const aborted = () => {
      if (signal.aborted) throw new JobFailure("cancelled", "cancelled");
    };

    update({ stage: "prep" });
    const prep = await o.prep(id, signal);
    const warnings = [...prep.warnings];
    aborted();

    if (job.options.mode === "prepare") {
      const voicePath = path.join(dir, "generated/voice.prepared.json");
      if (!fs.existsSync(voicePath)) throw new JobFailure("prep-failed", "prep did not write voice.prepared.json");
      const outputs: Record<string, JobOutput> = { voice: statOut(dir, voicePath, "voice") };
      const voiceDir = path.join(dir, "voice");
      if (fs.existsSync(voiceDir)) {
        for (const name of fs.readdirSync(voiceDir)) outputs[`audio-${name.replace(/\W/g, "_")}`] = { file: path.relative(dir, path.join(voiceDir, name)), type: "application/octet-stream", bytes: fs.statSync(path.join(voiceDir, name)).size };
      }
      return { warnings, outputs, stage: undefined };
    }

    update({ stage: "compile", warnings });
    const compile = (coldOpen?: HookVariant) => {
      try {
        return compileSkitIn(o.project, id, { lang: job.options.lang, ...(coldOpen ? { coldOpen } : {}) });
      } catch (e) {
        if (e instanceof SkitError) throw new JobFailure("invalid-skit", "the skit doesn't compile with these voices", { diagnostics: e.diagnostics });
        throw e;
      }
    };
    let result = compile();
    const doc = result.doc;
    const meta = { title: doc.meta.title, durationSec: +(result.program.durationInFrames / result.program.fps).toFixed(2), diagnostics: result.warnings };

    update({ stage: "check", ...meta });
    const check = checkSkitIn(o.project, id, result);
    if (!check.ok && !job.options.skipCheck) throw new JobFailure("check-failed", `self-check found ${check.errors} error(s)`, { check });

    update({ stage: "render", progress: 0, check });
    const base = path.join(dir, "out", slug(doc.meta.title));
    const { cancelSignal, cancel } = makeCancelSignal();
    const onAbort = () => cancel();
    signal.addEventListener("abort", onAbort);
    const files: Record<string, string> = {};
    try {
      const variants = job.options.variants?.length ? job.options.variants : [undefined];
      for (const variant of variants) {
        if (variant) result = compile(variant);
        const out = variant ? `${base}-${variant}.mp4` : `${base}.mp4`;
        await renderPicture(o.project, o.backend, id, dir, result.program, out, job, cancelSignal, (p) => update({ progress: +p.toFixed(3) }));
        files[variant ? `mp4-${variant}` : "mp4"] = out;
      }
      if (!files.mp4) files.mp4 = files[`mp4-${variants[0]}`]!;
      if (job.options.sheet) {
        update({ progress: 0 });
        await o.backend.renderSheet({ id: "Skit", inputProps: { skit: id, showLabels: false }, maxTiles: 24, out: `${base}-sheet.png`, cancelSignal });
        files.sheet = `${base}-sheet.png`;
      }
      if (job.options.covers !== false) {
        await o.backend.renderComposition("Cover", { skit: id, showLabels: false }, `${base}-cover.png`);
        await o.backend.renderComposition("Thumbnail", { skit: id, showLabels: false }, `${base}-thumb.png`);
        files.cover = `${base}-cover.png`;
        files.thumbnail = `${base}-thumb.png`;
      }
    } catch (e) {
      aborted();
      throw new JobFailure("render-failed", e instanceof Error ? e.message : String(e));
    } finally {
      signal.removeEventListener("abort", onAbort);
    }

    update({ stage: "post" });
    const post = writePostFiles(base, { skit: job.id, doc, program: result.program, report: check, lib: o.project.lib });
    files.srt = post.srt;
    files.txt = post.txt;
    files.manifest = post.json;
    const outputs: Record<string, JobOutput> = {};
    for (const [k, f] of Object.entries(files)) outputs[k] = statOut(dir, f, k in TYPES ? k : "mp4");
    return { ...meta, check, warnings, outputs, stage: undefined };
  };

const statOut = (dir: string, file: string, kind: string): JobOutput => ({ file: path.relative(dir, file), type: TYPES[kind] ?? TYPES.mp4!, bytes: fs.statSync(file).size });

const renderPicture = async (project: Project, backend: RenderBackend, id: string, dir: string, program: Program, out: string, job: Job, cancelSignal: ReturnType<typeof makeCancelSignal>["cancelSignal"], onProgress: (p: number) => void) => {
  const draft = job.options.quality === "draft";
  const look = { debug: job.options.debug, cancelSignal, onProgress, ...(draft ? { scale: 0.5, x264Preset: "ultrafast" as const } : {}) };
  const multi = job.options.sceneCache !== false && program.scenes.length > 1 && !job.options.debug;
  if (!multi) {
    await backend.renderSkit(id, out, look);
    return;
  }
  try {
    await renderCached(project, backend, id, dir, program, out, look);
  } catch (e) {
    if (String(e).includes("cancelled")) throw e;
    await backend.renderSkit(id, out, look);
  }
};

const renderCached = async (project: Project, backend: RenderBackend, id: string, dir: string, program: Program, out: string, look: Parameters<RenderBackend["renderSkit"]>[2]) => {
  const cache = path.join(dir, "..", "_cache");
  fs.mkdirSync(cache, { recursive: true });
  const audio: Record<string, string> = {};
  const voiceDir = path.join(dir, "voice");
  if (fs.existsSync(voiceDir)) for (const name of fs.readdirSync(voiceDir)) audio[name] = String(fs.statSync(path.join(voiceDir, name)).size);
  const plan = planSegments(program, catalogVersion(project), audio);
  const parts: string[] = [];
  const hook = program.hook;
  if (hook) {
    const hookFile = path.join(cache, `hook-${hook.kind}-${hook.scene}-${hook.frame}.mp4`);
    if (!fs.existsSync(hookFile)) await backend.renderSkit(id, hookFile, { ...look, frames: [0, Math.max(0, hook.prefixFrames - 1)] });
    parts.push(hookFile);
  }
  for (const seg of plan) {
    const file = path.join(cache, `${seg.hash}.mp4`);
    if (!fs.existsSync(file)) await backend.renderSkit(id, file, { ...look, omitHook: true, frames: seg.frames });
    parts.push(file);
  }
  concatMp4(project.ws.root, parts, out, hook ? hook.transitionFrames / program.fps : 0);
};

/** Join cached scene clips. The first body clip loses the frames the hook's slide already showed. */
const concatMp4 = (root: string, parts: string[], out: string, trimFirstBodySec: number) => {
  const list = `${out}.concat.txt`;
  const lines = parts.map((file, i) => {
    const body = i === 1 && trimFirstBodySec > 0 ? `\ninpoint ${trimFirstBodySec.toFixed(3)}` : "";
    return `file '${file.replace(/'/g, "'\\''")}'${body}`;
  });
  fs.writeFileSync(list, lines.join("\n"));
  execFileSync(path.join(root, "node_modules/.bin/remotion"), ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out], { stdio: ["ignore", "ignore", "pipe"] });
};
