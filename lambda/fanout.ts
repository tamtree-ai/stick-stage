/**
 * Fan-out for long renders (8–12 min explainers don't fit one 15-minute Lambda). The invocation
 * Tamtree calls is the coordinator: it preps, compiles and checks as usual, then invokes copies of
 * this function asynchronously with `chunk: { job, segments }` (the request itself waits in
 * `fanout/<job>/request.json`: an async invoke carries at most 256 KB). A
 * worker preps and compiles the same request, renders its segments (scene cuts, at most a minute
 * each) and uploads them to `fanout/<job>/<hash>.mp4`. The coordinator waits for them, and the
 * pipeline joins every segment as it does for its scene cache. Missing pieces render locally.
 */
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import type { SegmentPlan } from "../src/engine/core";
import type { SegmentFarm } from "../src/server/pipeline";

/** New accounts often get 10 concurrent executions: the coordinator plus 8 leaves one spare. */
const MAX_WORKERS = 8;
/** Below 2 minutes of missing video the coordinator renders it faster than workers can cold-start. */
const MIN_FRAMES = 3600;
const POLL_MS = 4000;

export type Chunk = { job: string; segments: string[] };

export const requestKey = (job: string) => `fanout/${job}/request.json`;

export const segmentKey = (job: string, hash: string, ext: "mp4" | "err" = "mp4") => `fanout/${job}/${hash}.${ext}`;

/** Spread segments over `n` workers by frame count (largest first onto the lightest bin). */
export const binSegments = (segments: readonly SegmentPlan[], n: number): SegmentPlan[][] => {
  const bins = Array.from({ length: Math.max(1, n) }, () => ({ frames: 0, segs: [] as SegmentPlan[] }));
  const len = (s: SegmentPlan) => s.frames[1] - s.frames[0] + 1;
  for (const s of [...segments].sort((a, b) => len(b) - len(a))) {
    const bin = bins.reduce((a, b) => (b.frames < a.frames ? b : a));
    bin.segs.push(s);
    bin.frames += len(s);
  }
  return bins.map((b) => b.segs).filter((b) => b.length);
};

export const lambdaFarm = (o: {
  s3: S3Client;
  bucket: string;
  /** The coordinator's request, re-sent to each worker. */
  items: unknown;
  jobId: string;
  /** Stop waiting at this time (ms since epoch) and let the pipeline render what's left. */
  deadline: () => number;
  log: (line: string) => void;
}): SegmentFarm => {
  const lambda = new LambdaClient({});
  return async ({ segments, cacheDir, signal }) => {
    const fn = process.env.AWS_LAMBDA_FUNCTION_NAME;
    const total = segments.reduce((n, s) => n + s.frames[1] - s.frames[0] + 1, 0);
    if (!fn || process.env.STICKSTAGE_FANOUT === "off" || total < MIN_FRAMES) return;
    const bins = binSegments(segments, Math.min(MAX_WORKERS, Math.ceil(total / 1800)));
    o.log(`fan-out: ${segments.length} segments, ${total} frames over ${bins.length} workers`);
    await o.s3.send(new PutObjectCommand({ Bucket: o.bucket, Key: requestKey(o.jobId), Body: JSON.stringify(o.items), ContentType: "application/json" }));
    await Promise.all(
      bins.map((bin) => {
        const chunk: Chunk = { job: o.jobId, segments: bin.map((s) => s.hash) };
        return lambda.send(new InvokeCommand({ FunctionName: fn, InvocationType: "Event", Payload: JSON.stringify({ v: 1, chunk }) }));
      }),
    );
    const pending = new Set(segments.map((s) => s.hash));
    while (pending.size && Date.now() < o.deadline() && !signal.aborted) {
      for (const hash of [...pending]) {
        const body = await read(o.s3, o.bucket, segmentKey(o.jobId, hash));
        if (body) {
          fs.writeFileSync(path.join(cacheDir, `${hash}.mp4`), body);
          pending.delete(hash);
          continue;
        }
        const err = await read(o.s3, o.bucket, segmentKey(o.jobId, hash, "err"));
        if (err) throw new Error(`worker failed on ${hash}: ${Buffer.from(err).toString("utf8")}`);
      }
      if (pending.size) await new Promise((r) => setTimeout(r, POLL_MS));
    }
    if (pending.size) o.log(`fan-out: ${pending.size} segment(s) not back in time; rendering them here`);
  };
};

/** A worker's copy of the coordinator's request. */
export const chunkItems = async (s3: S3Client, bucket: string, chunk: Chunk): Promise<{ json: Record<string, unknown> }[]> => {
  const body = await read(s3, bucket, requestKey(chunk.job));
  if (!body) throw new Error(`no ${requestKey(chunk.job)}`);
  return JSON.parse(Buffer.from(body).toString("utf8"));
};

/** Upload a worker's segments, or an error marker for each so the coordinator stops waiting. */
export const reportChunk = async (s3: S3Client, bucket: string, chunk: Chunk, result: Record<string, string> | Error): Promise<void> => {
  for (const hash of chunk.segments) {
    const ok = !(result instanceof Error) && result[hash];
    await s3.send(
      new PutObjectCommand(
        ok
          ? { Bucket: bucket, Key: segmentKey(chunk.job, hash), Body: fs.readFileSync(ok), ContentType: "video/mp4" }
          : { Bucket: bucket, Key: segmentKey(chunk.job, hash, "err"), Body: result instanceof Error ? result.message : "segment not rendered", ContentType: "text/plain" },
      ),
    );
  }
};

const read = async (s3: S3Client, bucket: string, key: string): Promise<Uint8Array | undefined> => {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return res.Body ? await res.Body.transformToByteArray() : undefined;
  } catch (e) {
    // Without s3:ListBucket (the role has Get/Put only), S3 answers a missing key with 403.
    const name = (e as { name?: string }).name;
    if (name === "NoSuchKey" || name === "AccessDenied") return undefined;
    throw e;
  }
};
