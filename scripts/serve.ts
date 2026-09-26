/**
 * Render service: pnpm serve [--port=8787] [--host=127.0.0.1] [--insecure-local]
 * API: docs/render-service.md. Jobs live in public/skits/_jobs/<jobId>/ (the container's volume).
 * Environment:
 *   STICKSTAGE_API_TOKEN               bearer token (required unless --insecure-local)
 *   PORT, HOST                         listen address (flags win)
 *   STICKSTAGE_JOB_TTL_HOURS           delete finished jobs after this long (default 24)
 *   STICKSTAGE_BROWSER                 Chrome / headless shell to render with (default: Remotion's download)
 *   STICKSTAGE_RENDER_CONCURRENCY      parallel browser tabs per render (default: Remotion's)
 *   STICKSTAGE_ALLOW_ESTIMATED_MOUTHS  "1": render without Rhubarb (mouths estimated from words)
 *   RHUBARB_PATH                       Rhubarb binary (else tools/Rhubarb-Lip-Sync-*, else PATH)
 */
import path from "node:path";
import { findRhubarb, remotionBackend } from "../src/node";
import { createService } from "../src/server/app";
import { jobQueue } from "../src/server/jobs";
import { childPrep, renderPipeline } from "../src/server/pipeline";
import { PROJECT, ROOT, WS } from "./lib/tools";

const args = process.argv.slice(2);
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const env = process.env;
const insecure = args.includes("--insecure-local");
const token = env.STICKSTAGE_API_TOKEN || undefined;
if (!token && !insecure) {
  console.error("Set STICKSTAGE_API_TOKEN, or pass --insecure-local to run without auth on this machine.");
  process.exit(1);
}
const port = Number(flag("port") ?? env.PORT ?? 8787);
const host = flag("host") ?? env.HOST ?? "127.0.0.1";
if (insecure && !["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error("--insecure-local only listens on localhost.");
  process.exit(1);
}
const requireLipSync = env.STICKSTAGE_ALLOW_ESTIMATED_MOUTHS !== "1";
const rhubarb = findRhubarb(WS);
if (requireLipSync && !rhubarb) {
  console.error("Rhubarb not found (RHUBARB_PATH, tools/, or PATH). Set STICKSTAGE_ALLOW_ESTIMATED_MOUTHS=1 to render with estimated mouths.");
  process.exit(1);
}

const concurrency = env.STICKSTAGE_RENDER_CONCURRENCY ? Number(env.STICKSTAGE_RENDER_CONCURRENCY) : undefined;
const base = remotionBackend({ entryPoint: path.join(ROOT, "src/app/index.ts"), browserExecutable: env.STICKSTAGE_BROWSER || undefined, symlinkPublicDir: true });
const backend = concurrency ? { ...base, renderSkit: (id: string, out: string, o = {}) => base.renderSkit(id, out, { concurrency, ...o }) } : base;

const JOBS = "_jobs";
const queue = jobQueue({
  jobsDir: path.join(WS.publicDir, "skits", JOBS),
  ttlMs: Number(env.STICKSTAGE_JOB_TTL_HOURS ?? 24) * 3600_000,
  run: renderPipeline({ project: PROJECT, backend, prep: childPrep(ROOT, { requireLipSync }), skitIdOf: (id) => `${JOBS}/${id}` }),
});

let bundle: "building" | "ready" | "failed" = "building";
const started = Date.now();
backend.serveUrl().then(
  () => {
    bundle = "ready";
    console.log(`bundle ready (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  },
  (e) => {
    bundle = "failed";
    console.error("bundle failed:", e);
  },
);

queue.recover();
setInterval(() => {
  const n = queue.sweep();
  if (n) console.log(`swept ${n} expired job(s)`);
}, 10 * 60_000).unref();

const server = createService({ project: PROJECT, queue, token, health: () => ({ bundle, lipSync: rhubarb ? "rhubarb" : "estimated", auth: !!token }) });
server.listen(port, host, () => console.log(`stickstage render service on http://${host}:${port}${token ? "" : "  (NO AUTH: local only)"}`));

const stop = () => {
  console.log("shutting down; an interrupted job is re-queued on the next start");
  server.close();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
