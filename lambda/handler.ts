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
import { childPrep, renderPipeline, renderSegments } from "../src/server/pipeline";
import { parseSubmission, writeSubmission } from "../src/server/submit";
import { PROJECT, ROOT, WS } from "../scripts/lib/tools";
import { checkOnly, DESCRIPTION, type CheckReply } from "./check";
import { chunkItems, lambdaFarm, reportChunk, type Chunk } from "./fanout";
import { toFindings, type EnvelopeFinding } from "./findings";

type LambdaContext = { getRemainingTimeInMillis(): number };
type Envelope = {
  v: 1;
  items?: { json: Record<string, unknown> }[];
  callback?: { url: string };
  /** Tamtree 2.7.0: validate and answer findings, no render (lambda/check.ts). */
  check_only?: boolean;
  /** Tamtree 2.7.0: answer what this function returns, no render. */
  describe?: boolean;
  /** Set only by this function's own coordinator: render these segments (`fanout.ts`). */
  chunk?: Chunk;
};
type RenderInput = { skit?: unknown; voice?: unknown; audio?: Record<string, string>; options?: Record<string, unknown> };
/** Tamtree's reply file (EnvelopeBinary): a link, plus the lasting S3 location a Files connection reads. */
type ReplyFile = { url: string; file_name: string; mime_type: string; size_bytes: number; expires_at: string; s3: { bucket: string; key: string; region?: string } };
type Reply = {
  items: { json: Record<string, unknown>; binary?: Record<string, ReplyFile> }[];
  logs: string[];
  error?: { code: string; message: string; retryable: boolean };
  /** Tamtree 2.7.0: the detail as data. An older Tamtree ignores it and reads `logs`. */
  findings?: EnvelopeFinding[];
};

const BUCKET = process.env.STICKSTAGE_BUCKET ?? "";
/** Lambda sets AWS_REGION; it is the bucket's region as long as the two are deployed together. */
const REGION = process.env.AWS_REGION ?? "";
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
// swiftshader rasterises on the CPU: in production (2026-10-30) it took a ~10 min render to ~3,
// against swangle. It needs multi-process Chrome (single-process hung). STICKSTAGE_GL=swangle
// goes back to the old path.
const swiftshader = process.env.STICKSTAGE_GL !== "swangle";
const chromiumOptions = { gl: swiftshader ? "swiftshader" : "swangle", enableMultiProcessOnLinux: swiftshader } as const;
// Dockerfile.lambda builds the bundle into the image (STICKSTAGE_BUNDLE_DIR); unset, it is built on first use.
const backend = remotionBackend({
  entryPoint: path.join(ROOT, "src/app/index.ts"),
  bundleDir: process.env.STICKSTAGE_BUNDLE_DIR || undefined,
  browserExecutable: process.env.STICKSTAGE_BROWSER || undefined,
  chromiumOptions,
  symlinkPublicDir: true,
});
const steps = { project: PROJECT, backend, prep: childPrep(ROOT, { requireLipSync: true }), skitIdOf: (id: string) => `${JOBS}/${id}` };

export const handler = async (event: Envelope, context: LambdaContext): Promise<Reply | CheckReply | typeof DESCRIPTION | null> => {
  // Neither renders, and Tamtree always waits for their answer, so neither takes a callback.
  if (event.describe) return DESCRIPTION;
  if (event.check_only) return checkOnly(PROJECT, (event.items?.[0]?.json ?? {}) as RenderInput);
  if (event.chunk) return renderChunk(event, event.chunk, context);
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
    const job = await stage(event, id, dir);
    if (typeof job === "string") return failure("bad-request", job, []);
    const farm = lambdaFarm({ s3, bucket: BUCKET, items: event.items, jobId: id, deadline: () => Date.now() + context.getRemainingTimeInMillis() - 2 * MARGIN_MS, log: console.log });
    const result = await renderPipeline({ ...steps, farm })(job, { dir, signal: controller.signal, update: (p) => p.stage && console.log(`stage ${p.stage}`) });

    const outputs: Record<string, unknown> = {};
    // The same files as Tamtree attachments: a later step reads $binary.mp4 as a file. `s3` lets a
    // step with a Files connection read it after the link has expired. `outputs` stays for flows built on it.
    const binary: Record<string, ReplyFile> = {};
    const expiresAt = new Date(Date.now() + SIGNED_URL_S * 1000).toISOString();
    for (const [name, o] of Object.entries(result.outputs ?? {})) {
      const key = `jobs/${id}/${path.basename(o.file)}`;
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: fs.readFileSync(path.join(dir, o.file)), ContentType: o.type }));
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: SIGNED_URL_S });
      outputs[name] = { bucket: BUCKET, key, type: o.type, bytes: o.bytes, url };
      binary[name] = {
        url,
        file_name: path.basename(o.file),
        mime_type: o.type,
        size_bytes: o.bytes,
        expires_at: expiresAt,
        s3: { bucket: BUCKET, key, region: REGION || undefined },
      };
    }
    const warnings = [...job.warnings, ...(result.warnings ?? [])];
    const json = { jobId: id, title: result.title, durationSec: result.durationSec, check: result.check, warnings, outputs };
    // Warnings and info from the self-check ride along on a success too.
    return { items: [{ json, binary }], logs: warnings, findings: toFindings(result.check?.findings ?? []) };
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

/** Download the audio, check and write the submission into the job folder. A string is a bad request. */
const stage = async (event: Envelope, id: string, dir: string): Promise<Job | string> => {
  const input = (event.items?.[0]?.json ?? {}) as RenderInput;
  if (!input.skit || !input.voice || !input.audio) return "item 0 needs skit, voice and audio";
  const form = new FormData();
  form.set("skit", JSON.stringify(input.skit));
  form.set("voice", JSON.stringify(input.voice));
  form.set("options", JSON.stringify(input.options ?? {}));
  for (const [file, key] of Object.entries(input.audio)) form.append("audio", new File([await download(key)], file));
  const submission = await parseSubmission(form);
  writeSubmission(dir, submission);
  return { id, status: "running", createdAt: new Date().toISOString(), seq: 0, options: submission.options, warnings: submission.warnings };
};

/** A fan-out worker: the coordinator's request, only these segments, uploaded for it to join. */
const renderChunk = async (event: Envelope, chunk: Chunk, context: LambdaContext): Promise<null> => {
  const id = randomUUID();
  const dir = path.join(WS.publicDir, "skits", JOBS, id);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(0, context.getRemainingTimeInMillis() - MARGIN_MS));
  try {
    const job = await stage({ ...event, items: await chunkItems(s3, BUCKET, chunk) }, id, dir);
    if (typeof job === "string") throw new Error(job);
    await reportChunk(s3, BUCKET, chunk, await renderSegments(steps, job, dir, chunk.segments, controller.signal));
  } catch (e) {
    console.error(e);
    await reportChunk(s3, BUCKET, chunk, e instanceof Error ? e : new Error(String(e)));
  } finally {
    clearTimeout(timer);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return null;
};

// `logs` keeps the JSON lines until every Tamtree that calls this reads `findings` (2.7.0);
// the newer run view hides lines that duplicate a finding.
const failure = (code: string, message: string, details: unknown[]): Reply => ({
  items: [],
  logs: details.map((d) => JSON.stringify(d)),
  error: { code, message, retryable: false },
  findings: toFindings(details),
});

const download = async (key: string): Promise<Uint8Array> => {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`s3://${BUCKET}/${key} is empty`);
  return res.Body.transformToByteArray();
};
