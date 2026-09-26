/**
 * The render service: routes over the job queue. `createService` returns a `node:http` server
 * that isn't listening yet; `scripts/serve.ts` reads the environment and starts it.
 *
 *   GET    /healthz                  liveness + tools (no auth)
 *   POST   /validate                 { premise } | { skit } → skit + lines to voice + verdict
 *   POST   /render                   multipart skit + voice + audio files → 202 job
 *   GET    /jobs/:id                 job status
 *   GET    /jobs/:id/files/:name     an output (mp4, srt, txt, manifest, sheet)
 *   DELETE /jobs/:id                 cancel
 */
import http from "node:http";
import path from "node:path";
import type { Project } from "../node";
import { requireBearer } from "./auth";
import { HttpError, readForm, readJson, router, type Ctx } from "./http";
import { JOB_ID, type Job, type JobQueue } from "./jobs";
import { parseSubmission, writeSubmission } from "./submit";
import { validate } from "./validate";

export type ServiceOptions = {
  project: Project;
  queue: JobQueue;
  /** Bearer token; `undefined` turns auth off (local dev only). */
  token: string | undefined;
  /** Extra fields for `/healthz` (tool paths, versions). */
  health?: () => Record<string, unknown>;
  limits?: { jsonBytes?: number; uploadBytes?: number };
};

const MB = 1024 * 1024;

/** A job as the API shows it: output files become download URLs. */
export const jobView = (job: Job) => ({
  ...job,
  outputs: job.outputs && Object.fromEntries(Object.entries(job.outputs).map(([k, o]) => [k, { url: `/jobs/${job.id}/files/${k}`, type: o.type, bytes: o.bytes, name: path.basename(o.file) }])),
});

export const createService = (o: ServiceOptions) => {
  const auth = requireBearer(o.token);
  const r = router();
  const jsonLimit = o.limits?.jsonBytes ?? 2 * MB;
  const uploadLimit = o.limits?.uploadBytes ?? 100 * MB;

  const jobOf = (ctx: Ctx) => {
    const id = ctx.params.id!;
    const job = JOB_ID.test(id) ? o.queue.get(id) : undefined;
    if (!job) throw new HttpError(404, "job-not-found", `no job ${id}`);
    return job;
  };

  r.get("/healthz", () => ({ json: { ok: true, queue: o.queue.depth(), ...o.health?.() } }));

  r.post("/validate", async ({ req }) => ({ json: validate(o.project, await readJson(req, jsonLimit)) }));

  r.post("/render", async ({ req }) => {
    const submission = await parseSubmission(await readForm(req, uploadLimit));
    const { id, dir } = o.queue.reserve();
    try {
      writeSubmission(dir, submission);
    } catch (e) {
      o.queue.discard(id);
      throw e;
    }
    const job = o.queue.enqueue(id, submission.options, submission.warnings);
    return { status: 202, json: jobView(job) };
  });

  r.get("/jobs/:id", (ctx) => ({ json: jobView(jobOf(ctx)) }));

  r.get("/jobs/:id/files/:name", (ctx) => {
    const job = jobOf(ctx);
    const out = job.outputs?.[ctx.params.name!];
    if (!out) throw new HttpError(404, "file-not-found", `job ${job.id} has no output "${ctx.params.name}"${job.status !== "succeeded" ? ` (status: ${job.status})` : ""}`);
    return { file: { path: path.join(o.queue.dirOf(job.id), out.file), type: out.type, name: path.basename(out.file) } };
  });

  r.delete("/jobs/:id", async (ctx) => ({ json: jobView((await o.queue.cancel(jobOf(ctx).id))!) }));

  return http.createServer((req, res) => void r.handle(req, res, (ctx) => ctx.url.pathname !== "/healthz" && auth(ctx.req)));
};
