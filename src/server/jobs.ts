/**
 * Render jobs: one folder per job (`<jobsDir>/<id>/`, which is also the job's skit folder) with its
 * state in `job.json`. A FIFO runs one job at a time, since a render already uses every core. On
 * start, queued and interrupted jobs are re-queued (every step is idempotent and cached).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CheckReport, Diagnostic } from "../engine/core";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type JobStage = "prep" | "compile" | "check" | "render" | "post";
export type JobOptions = { skipCheck?: boolean; debug?: boolean; sheet?: boolean };
export type JobOutput = { file: string; type: string; bytes: number };

export type Job = {
  id: string;
  status: JobStatus;
  createdAt: string;
  /** Queue order across restarts (`createdAt` ties within a millisecond). */
  seq: number;
  startedAt?: string;
  finishedAt?: string;
  stage?: JobStage;
  /** 0..1 within the current stage (render only; other stages are quick). */
  progress?: number;
  options: JobOptions;
  title?: string;
  durationSec?: number;
  warnings: string[];
  diagnostics?: Diagnostic[];
  check?: CheckReport;
  error?: { code: string; message: string };
  /** By name (`mp4`, `srt`, `txt`, `manifest`, `sheet`); files live in the job folder. */
  outputs?: Record<string, JobOutput>;
};

/** What a pipeline run reports back; thrown `JobFailure`s become `failed` with a code. */
export type JobRun = (job: Job, ctl: { dir: string; signal: AbortSignal; update: (patch: Partial<Job>) => void }) => Promise<Partial<Job>>;

export class JobFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly patch: Partial<Job> = {},
  ) {
    super(message);
    this.name = "JobFailure";
  }
}

export const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FINISHED: JobStatus[] = ["succeeded", "failed", "cancelled"];

export type JobQueueOptions = { jobsDir: string; run: JobRun; ttlMs?: number; now?: () => Date; log?: (s: string) => void };

export const jobQueue = (o: JobQueueOptions) => {
  const now = o.now ?? (() => new Date());
  const log = o.log ?? console.log;
  const jobs = new Map<string, Job>();
  const queue: string[] = [];
  let counter = 0;
  let running: { id: string; abort: AbortController; done: Promise<void> } | undefined;
  let idle: Promise<void> = Promise.resolve();

  const dirOf = (id: string) => path.join(o.jobsDir, id);
  const save = (job: Job) => fs.writeFileSync(path.join(dirOf(job.id), "job.json"), JSON.stringify(job, null, 1));
  const patch = (id: string, p: Partial<Job>) => {
    const job = jobs.get(id);
    if (!job) return;
    Object.assign(job, p);
    save(job);
  };

  /** A new job id and its empty folder; fill it, then `enqueue`. */
  const reserve = () => {
    const id = crypto.randomUUID();
    fs.mkdirSync(dirOf(id), { recursive: true });
    return { id, dir: dirOf(id) };
  };

  const enqueue = (id: string, options: JobOptions = {}, warnings: string[] = []): Job => {
    const at = now();
    const job: Job = { id, status: "queued", createdAt: at.toISOString(), seq: at.getTime() * 1000 + (counter++ % 1000), options, warnings };
    jobs.set(id, job);
    save(job);
    queue.push(id);
    kick();
    return job;
  };

  const runOne = async (id: string) => {
    const abort = new AbortController();
    const job = jobs.get(id)!;
    patch(id, { status: "running", startedAt: now().toISOString(), stage: undefined, progress: undefined, error: undefined });
    let done!: () => void;
    running = { id, abort, done: new Promise((r) => (done = r)) };
    try {
      const out = await o.run(job, { dir: dirOf(id), signal: abort.signal, update: (p) => patch(id, p) });
      if (abort.signal.aborted) throw new JobFailure("cancelled", "cancelled");
      patch(id, { ...out, status: "succeeded", finishedAt: now().toISOString(), progress: 1 });
    } catch (e) {
      if (abort.signal.aborted) patch(id, { status: "cancelled", finishedAt: now().toISOString() });
      else {
        const f = e instanceof JobFailure ? e : new JobFailure("internal", e instanceof Error ? e.message : String(e));
        if (f.code === "internal") log(`job ${id} crashed: ${e instanceof Error ? (e.stack ?? e.message) : e}`);
        patch(id, { ...f.patch, status: "failed", finishedAt: now().toISOString(), error: { code: f.code, message: f.message } });
      }
    } finally {
      running = undefined;
      done();
    }
    log(`job ${id} ${jobs.get(id)!.status}`);
  };

  const kick = () => {
    idle = idle.then(async () => {
      while (!running && queue.length) await runOne(queue.shift()!);
    });
  };

  /** Cancel a queued or running job; its media is removed, its status stays readable until the sweep. */
  const cancel = async (id: string): Promise<Job | undefined> => {
    const job = jobs.get(id);
    if (!job) return undefined;
    if (job.status === "queued") {
      queue.splice(queue.indexOf(id), 1);
      patch(id, { status: "cancelled", finishedAt: now().toISOString() });
    } else if (job.status === "running" && running?.id === id) {
      running.abort.abort();
      await running.done;
    }
    if (job.status === "cancelled") {
      for (const f of fs.readdirSync(dirOf(id))) if (f !== "job.json") fs.rmSync(path.join(dirOf(id), f), { recursive: true, force: true });
      patch(id, { outputs: undefined });
    }
    return job;
  };

  /** Load jobs from disk; re-queue anything that never finished (oldest first). */
  const recover = () => {
    if (!fs.existsSync(o.jobsDir)) fs.mkdirSync(o.jobsDir, { recursive: true });
    const found: Job[] = [];
    for (const id of fs.readdirSync(o.jobsDir)) {
      const file = path.join(dirOf(id), "job.json");
      if (!JOB_ID.test(id) || !fs.existsSync(file)) continue;
      try {
        found.push(JSON.parse(fs.readFileSync(file, "utf8")) as Job);
      } catch {
        log(`job ${id}: unreadable job.json, skipped`);
      }
    }
    found.sort((a, b) => a.seq - b.seq);
    for (const job of found) {
      jobs.set(job.id, job);
      if (FINISHED.includes(job.status)) continue;
      patch(job.id, { status: "queued", stage: undefined, progress: undefined });
      queue.push(job.id);
    }
    if (queue.length) log(`re-queued ${queue.length} unfinished job(s)`);
    kick();
  };

  /** Delete finished jobs older than the TTL (by finish time). */
  const sweep = () => {
    if (!o.ttlMs) return 0;
    const cutoff = now().getTime() - o.ttlMs;
    let n = 0;
    for (const job of [...jobs.values()]) {
      if (!FINISHED.includes(job.status) || !job.finishedAt || Date.parse(job.finishedAt) > cutoff) continue;
      fs.rmSync(dirOf(job.id), { recursive: true, force: true });
      jobs.delete(job.id);
      n++;
    }
    return n;
  };

  return {
    reserve,
    enqueue,
    cancel,
    recover,
    sweep,
    get: (id: string) => jobs.get(id),
    dirOf,
    /** Discard a reserved folder that never became a job (bad upload). */
    discard: (id: string) => !jobs.has(id) && fs.rmSync(dirOf(id), { recursive: true, force: true }),
    depth: () => queue.length + (running ? 1 : 0),
    /** Resolves once the queue is empty and nothing runs (tests, graceful shutdown). */
    drain: async () => {
      while (running || queue.length) await idle;
    },
  };
};

export type JobQueue = ReturnType<typeof jobQueue>;
