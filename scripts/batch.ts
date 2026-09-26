/**
 * Batch render (plan M6): pnpm batch [skitId…] [--all] [--say] [--force] [--skip-check]
 *   --all: every skit in public/skits except labs (ids ending in "lab").
 * Per skit: prep → compile → self-check → render, into out/posts/<skitId>/:
 *   <skitId>-<title-slug>-<hash>.mp4   the video (hash of the program + renderer/library code: unchanged skits are skipped)
 *   …txt                               post caption: description, hashtags, AI-voice note, script
 *   …srt                               subtitles (script text exactly)
 *   …json                              what was rendered: title, duration, check summary
 * Skits that fail to compile or fail the self-check are reported and skipped; exit 1 if any failed.
 */
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { formatDiagnostics, parseSkit, postText, programSrt, skitLines, slug, SkitError, VoiceManifestSchema } from "../src/engine";
import { library } from "../src/data";
import { prepIfVoiced, renderSkitMp4 } from "./lib/render";
import { checkSkitDir, compileSkitDir, isSkit, skitDir } from "./lib/skit";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const all = fs.readdirSync(path.join(ROOT, "public/skits")).filter((id) => isSkit(id));
const ids = has("all") ? all.filter((id) => !id.endsWith("lab")) : args.filter((a) => !a.startsWith("--"));
if (!ids.length) {
  console.error("usage: pnpm batch <skitId…> | --all  [--say] [--force] [--skip-check]");
  process.exit(1);
}

/** Hash of everything that affects pixels besides the program: engine, app and library sources, public media. */
const CODE_HASH = (() => {
  const h = crypto.createHash("sha256");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  for (const f of ["src/engine", "src/app", "src/data", "public/sfx", "public/fonts"].flatMap((d) => walk(path.join(ROOT, d))).sort()) h.update(f).update(fs.readFileSync(f));
  return h.digest("hex");
})();

type Row = { id: string; status: "rendered" | "unchanged" | "failed"; out?: string; reason?: string };
const rows: Row[] = [];
for (const id of ids) {
  console.log(`\n== ${id}`);
  if (!isSkit(id)) {
    rows.push({ id, status: "failed", reason: "no skit.json" });
    continue;
  }
  try {
    const doc = parseSkit(JSON.parse(fs.readFileSync(path.join(skitDir(id), "skit.json"), "utf8")));
    if (has("say")) {
      const voicePath = path.join(skitDir(id), "voice.json");
      const have = fs.existsSync(voicePath) ? new Map(VoiceManifestSchema.parse(JSON.parse(fs.readFileSync(voicePath, "utf8"))).lines.map((l) => [l.id, l.text])) : new Map();
      if (skitLines(doc).some((l) => have.get(l.id) !== l.text)) execFileSync(path.join(ROOT, "node_modules/.bin/tsx"), ["scripts/voice-say.ts", id], { stdio: "inherit", cwd: ROOT });
    }
    for (const w of prepIfVoiced(id)) console.warn(`WARNING: ${w}`);
    const result = compileSkitDir(id, { exitOnError: false });
    const report = checkSkitDir(id, result);
    if (!report.ok && !has("skip-check")) {
      rows.push({ id, status: "failed", reason: `self-check: ${report.errors} error(s)` });
      continue;
    }
    // What's rendered depends on the program and on the renderer + library code.
    const hash = crypto.createHash("sha256").update(JSON.stringify(result.program)).update(CODE_HASH).digest("hex").slice(0, 8);
    const dir = path.join(ROOT, "out/posts", id);
    const base = path.join(dir, `${id}-${slug(doc.meta.title)}-${hash}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${base}.txt`, postText(doc, library));
    fs.writeFileSync(`${base}.srt`, programSrt(result.program));
    const manifest = {
      skit: id,
      title: doc.meta.title,
      hash,
      durationSec: +(result.program.durationInFrames / result.program.fps).toFixed(2),
      scenes: result.program.scenes.length,
      check: { ok: report.ok, errors: report.errors, warnings: report.warnings },
      syntheticVoices: doc.meta.syntheticVoices,
      reminder: doc.meta.syntheticVoices ? "Tick the platform's AI-generated / synthetic-media label when posting." : undefined,
    };
    fs.writeFileSync(`${base}.json`, JSON.stringify(manifest, null, 2) + "\n");
    if (fs.existsSync(`${base}.mp4`) && !has("force")) {
      rows.push({ id, status: "unchanged", out: path.relative(ROOT, `${base}.mp4`) });
      continue;
    }
    await renderSkitMp4(id, { out: `${base}.mp4` });
    rows.push({ id, status: "rendered", out: path.relative(ROOT, `${base}.mp4`) });
  } catch (e) {
    rows.push({ id, status: "failed", reason: e instanceof SkitError ? formatDiagnostics(e.diagnostics) : e instanceof Error ? e.message : String(e) });
  }
}

console.log("\nbatch:");
for (const r of rows) console.log(`  ${r.status.padEnd(9)} ${r.id}${r.out ? `  → ${r.out}` : ""}${r.reason ? `\n            ${r.reason.split("\n").join("\n            ")}` : ""}`);
process.exit(rows.some((r) => r.status === "failed") ? 1 : 0);
