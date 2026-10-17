/**
 * AWS Lambda entry: one render job per invocation, the same pipeline as `pnpm serve` (src/server/pipeline.ts).
 *
 * Event: Tamtree's Cloud Function envelope (v1). Item 0's json is
 *   { skit, voice, audio: { "<file>": "<s3 key>" }, options? }
 * where <file> is the name in voice.json's "voice/<file>" and options are POST /render's.
 * Inputs and outputs live in STICKSTAGE_BUCKET (credentials come from the execution role).
 * With a callback the answer is POSTed there, otherwise it is the return value.
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { remotionBackend } from "../src/node";
import { HttpError } from "../src/server/http";
import { JobFailure, type Job } from "../src/server/jobs";
import { childPrep, renderPipeline } from "../src/server/pipeline";
import { parseSubmission, writeSubmission } from "../src/server/submit";
import { PROJECT, ROOT, WS } from "../scripts/lib/tools";

type LambdaContext = { getRemainingTimeInMillis(): number };
type Envelope = { v: 1; items?: { json: Record<string, unknown> }[]; callback?: { url: string } };
type RenderInput = { skit?: unknown; voice?: unknown; audio?: Record<string, string>; options?: Record<string, unknown> };
type Reply = { items: { json: Record<string, unknown> }[]; logs: string[]; error?: { code: string; message: string; retryable: boolean } };

const BUCKET = process.env.STICKSTAGE_BUCKET ?? "";
/** In the image, public/skits/_jobs is a symlink to /tmp/jobs: the only writable place on Lambda. */
const JOBS = "_jobs";
/** Answer this long before Lambda's own timeout, so a render that runs too long still reports. */
const MARGIN_MS = 30_000;
const SIGNED_URL_S = 3600;

// The symlink's target starts out missing on every new container.
try {
  fs.mkdirSync(fs.readlinkSync(path.join(WS.publicDir, "skits", JOBS)), { recursive: true });
} catch {
  // Not a symlink: a local run, where public/skits/_jobs is a real folder.
}

const s3 = new S3Client({});
// Lambda has no GPU: without software GL, Chrome's GPU process hangs and Remotion times out
// connecting. One Chrome process is also kinder to the sandbox and to a small vCPU share.
const chromiumOptions = { gl: "swangle", enableMultiProcessOnLinux: false } as const;
// Once per container: the Remotion bundle is built on the first render and reused while warm.
const backend = remotionBackend({ entryPoint: path.join(ROOT, "src/app/index.ts"), browserExecutable: process.env.STICKSTAGE_BROWSER || undefined, chromiumOptions, symlinkPublicDir: true });
const run = renderPipeline({ project: PROJECT, backend, prep: childPrep(ROOT, { requireLipSync: true }), skitIdOf: (id) => `${JOBS}/${id}` });

export const handler = async (event: Envelope, context: LambdaContext): Promise<Reply | null> => {
  const reply = await render(event, context);
  if (!event.callback) return reply;
  // Never log the callback URL: it is a single-use bearer capability.
  const res = await fetch(event.callback.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(reply) });
  if (!res.ok) throw new Error(`Tamtree refused the callback: HTTP ${res.status}`);
  return null;
};

const render = async (event: Envelope, context: LambdaContext): Promise<Reply> => {
  if (!BUCKET) return failure("misconfigured", "STICKSTAGE_BUCKET is not set on the function", []);
  const id = randomUUID();
  const dir = path.join(WS.publicDir, "skits", JOBS, id);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(0, context.getRemainingTimeInMillis() - MARGIN_MS));
  try {
    const input = (event.items?.[0]?.json ?? {}) as RenderInput;
    if (!input.skit || !input.voice || !input.audio) return failure("bad-request", "item 0 needs skit, voice and audio", []);
    const form = new FormData();
    form.set("skit", JSON.stringify(input.skit));
    form.set("voice", JSON.stringify(input.voice));
    form.set("options", JSON.stringify(input.options ?? {}));
    for (const [file, key] of Object.entries(input.audio)) form.append("audio", new File([await download(key)], file));
    const submission = await parseSubmission(form);
    writeSubmission(dir, submission);

    const job: Job = { id, status: "running", createdAt: new Date().toISOString(), seq: 0, options: submission.options, warnings: submission.warnings };
    const result = await run(job, { dir, signal: controller.signal, update: (p) => p.stage && console.log(`stage ${p.stage}`) });

    const outputs: Record<string, unknown> = {};
    for (const [name, o] of Object.entries(result.outputs ?? {})) {
      const key = `jobs/${id}/${path.basename(o.file)}`;
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: fs.readFileSync(path.join(dir, o.file)), ContentType: o.type }));
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: SIGNED_URL_S });
      outputs[name] = { bucket: BUCKET, key, type: o.type, bytes: o.bytes, url };
    }
    const warnings = [...job.warnings, ...(result.warnings ?? [])];
    return { items: [{ json: { jobId: id, title: result.title, durationSec: result.durationSec, check: result.check, warnings, outputs } }], logs: warnings };
  } catch (e) {
    if (e instanceof JobFailure) {
      const message = e.code === "cancelled" ? "the render ran out of Lambda time" : e.message;
      return failure(e.code, message, (e.patch.diagnostics ?? e.patch.check?.findings ?? []) as unknown[]);
    }
    if (e instanceof HttpError) return failure(e.code, e.message, (e.details?.diagnostics as unknown[] | undefined) ?? []);
    console.error(e);
    return failure("internal", e instanceof Error ? e.message : String(e), []);
  } finally {
    clearTimeout(timer);
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const failure = (code: string, message: string, details: unknown[]): Reply => ({
  items: [],
  logs: details.map((d) => JSON.stringify(d)),
  error: { code, message, retryable: false },
});

const download = async (key: string): Promise<Uint8Array> => {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`s3://${BUCKET}/${key} is empty`);
  return res.Body.transformToByteArray();
};
