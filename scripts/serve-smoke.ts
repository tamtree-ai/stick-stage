/**
 * End-to-end check of a running render service: pnpm serve:smoke [baseUrl] [--skit=fine] [--sheet]
 *   healthz → POST /validate (the skit) → POST /render (skit + voice.json + voice/*) → poll
 *   GET /jobs/:id → download every output into out/smoke/<skit>/. Token: STICKSTAGE_API_TOKEN.
 * Uses a voiced skit from public/skits/ as the stand-in for what the tamtree nodes will send.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const skitId = args.find((a) => a.startsWith("--skit="))?.split("=")[1] ?? "fine";
const token = process.env.STICKSTAGE_API_TOKEN;
const auth: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
const dir = path.join(ROOT, "public/skits", skitId);

const call = async (p: string, init: RequestInit = {}) => {
  const res = await fetch(base + p, { ...init, headers: { ...auth, ...(init.headers as Record<string, string>) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${p} → ${res.status}\n${await res.text()}`);
  return res;
};

const t0 = Date.now();
const secs = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

console.log("healthz", await (await call("/healthz")).json());

const skit = JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8"));
const v = (await (await call("/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skit }) })).json()) as {
  ok: boolean;
  lines: { id: string; speaker: string; text: string }[];
  estimatedDurationSec: number;
};
console.log(`validate: ok=${v.ok}, ${v.lines.length} lines, ~${v.estimatedDurationSec}s with placeholder timings`);

const voice = JSON.parse(fs.readFileSync(path.join(dir, "voice.json"), "utf8")) as { lines: { audio: string }[] };
const form = new FormData();
form.set("skit", JSON.stringify(skit));
form.set("voice", JSON.stringify(voice));
form.set("options", JSON.stringify({ sheet: args.includes("--sheet") }));
for (const l of voice.lines) form.append("audio", new Blob([fs.readFileSync(path.join(dir, l.audio))]), path.basename(l.audio));
const job = (await (await call("/render", { method: "POST", body: form })).json()) as { id: string };
console.log(`render: job ${job.id}`);

type Status = { status: string; stage?: string; progress?: number; error?: unknown; check?: { ok: boolean; errors: number; warnings: number }; durationSec?: number; warnings: string[]; outputs?: Record<string, { url: string; name: string; bytes: number }> };
let s: Status;
let last = "";
for (;;) {
  s = (await (await call(`/jobs/${job.id}`)).json()) as Status;
  const line = `${s.status}${s.stage ? ` ${s.stage}` : ""}${s.stage === "render" && s.progress !== undefined ? ` ${Math.floor(s.progress * 10) * 10}%` : ""}`;
  if (line !== last) console.log(`  [${secs()}] ${(last = line)}`);
  if (["succeeded", "failed", "cancelled"].includes(s.status)) break;
  await new Promise((r) => setTimeout(r, 1000));
}
if (s.status !== "succeeded") {
  console.error(JSON.stringify(s, null, 1));
  process.exit(1);
}
for (const w of s.warnings) console.warn(`WARNING: ${w}`);
const outDir = path.join(ROOT, "out/smoke", skitId);
fs.mkdirSync(outDir, { recursive: true });
for (const [k, o] of Object.entries(s.outputs ?? {})) {
  const bytes = Buffer.from(await (await call(o.url)).arrayBuffer());
  if (bytes.length !== o.bytes) throw new Error(`${k}: got ${bytes.length} bytes, expected ${o.bytes}`);
  fs.writeFileSync(path.join(outDir, o.name), bytes);
  console.log(`  ${k.padEnd(8)} ${path.relative(ROOT, path.join(outDir, o.name))} (${(o.bytes / 1024).toFixed(0)} KB)`);
}
console.log(`done in ${secs()}: ${s.durationSec}s video, check ok=${s.check?.ok} (${s.check?.errors} errors, ${s.check?.warnings} warnings)`);
