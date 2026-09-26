/**
 * One render job, the same steps as `pnpm batch`: prep (child process) → compile → self-check →
 * MP4 (+ optional contact sheet) → post files. Outputs land in `<job>/out/`.
 */
import { makeCancelSignal } from "@remotion/renderer";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { slug, SkitError } from "../engine/core";
import { checkSkitIn, compileSkitIn, writePostFiles, type Project, type RenderBackend } from "../node";
import { JobFailure, type JobOutput, type JobRun } from "./jobs";

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

const TYPES: Record<string, string> = { mp4: "video/mp4", srt: "application/x-subrip", txt: "text/plain; charset=utf-8", manifest: "application/json", sheet: "image/png" };

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

    update({ stage: "compile", warnings });
    let result;
    try {
      result = compileSkitIn(o.project, id);
    } catch (e) {
      if (e instanceof SkitError) throw new JobFailure("invalid-skit", "the skit doesn't compile with these voices", { diagnostics: e.diagnostics });
      throw e;
    }
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
    try {
      await o.backend.renderSkit(id, `${base}.mp4`, { debug: job.options.debug, cancelSignal, onProgress: (p) => update({ progress: +p.toFixed(3) }) });
      if (job.options.sheet) {
        update({ progress: 0 });
        await o.backend.renderSheet({ id: "Skit", inputProps: { skit: id, showLabels: false }, maxTiles: 24, out: `${base}-sheet.png`, cancelSignal });
      }
    } catch (e) {
      aborted();
      throw new JobFailure("render-failed", e instanceof Error ? e.message : String(e));
    } finally {
      signal.removeEventListener("abort", onAbort);
    }

    update({ stage: "post" });
    const post = writePostFiles(base, { skit: job.id, doc, program: result.program, report: check, lib: o.project.lib });
    const files: Record<string, string> = { mp4: `${base}.mp4`, srt: post.srt, txt: post.txt, manifest: post.json, ...(job.options.sheet ? { sheet: `${base}-sheet.png` } : {}) };
    const outputs: Record<string, JobOutput> = {};
    for (const [k, f] of Object.entries(files)) outputs[k] = { file: path.relative(dir, f), type: TYPES[k]!, bytes: fs.statSync(f).size };
    return { ...meta, check, warnings, outputs, stage: undefined };
  };
