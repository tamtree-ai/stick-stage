/**
 * The director loop (plan M5): pnpm direct <skitId> [--say] [--no-mp4] [--debug] [--json]
 *   (--say: dev voices with macOS `say` when voice.json is missing or stale)
 *   prep → compile (diagnostics) → self-check → contact sheet → MP4 (only if the check passes).
 * Writes `generated/direct.json` with every step's outcome, for the skit-director skill.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { formatDiagnostics, parseSkit, SkitError, skitLines, VoiceManifestSchema } from "../src/engine";
import { prepIfVoiced, renderSkitMp4 } from "./lib/render";
import { renderSheet } from "./lib/sheet";
import { checkSkitDir, compileSkitDir, isSkit, skitDir, summarize } from "./lib/skit";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const has = (f: string) => args.includes(`--${f}`);
if (!id || !isSkit(id)) {
  console.error(`usage: pnpm direct <skitId> [--say] [--no-mp4] [--debug] [--json]${id ? `  (no public/skits/${id}/skit.json)` : ""}`);
  process.exit(1);
}
const dir = skitDir(id);
const status: Record<string, unknown> = { skit: id };
const done = (code: number) => {
  fs.mkdirSync(path.join(dir, "generated"), { recursive: true });
  fs.writeFileSync(path.join(dir, "generated/direct.json"), JSON.stringify(status, null, 1));
  if (has("json")) console.log(JSON.stringify(status, null, 1));
  process.exit(code);
};

// 1. Validate the document before spending time on voices.
let lines: ReturnType<typeof skitLines>;
try {
  lines = skitLines(parseSkit(JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8"))));
} catch (e) {
  status.validate = { ok: false, diagnostics: e instanceof SkitError ? e.diagnostics : String(e) };
  console.error(e instanceof SkitError ? formatDiagnostics(e.diagnostics) : e);
  done(1);
  throw e;
}
status.validate = { ok: true };

// 2. Voices: missing or stale lines need the harness (or --say for dev).
const voicePath = path.join(dir, "voice.json");
const voice = fs.existsSync(voicePath) ? VoiceManifestSchema.safeParse(JSON.parse(fs.readFileSync(voicePath, "utf8"))) : undefined;
const have = new Map((voice?.success ? voice.data.lines : []).map((l) => [l.id, l.text]));
const stale = lines.filter((l) => have.get(l.id) !== l.text).map((l) => l.id);
if (stale.length) {
  if (!has("say")) {
    status.voice = { ok: false, missing: stale, hint: "run the tamtree harness TTS for these lines, or add --say for dev voices" };
    console.error(`voice missing or stale for: ${stale.join(", ")}. Run the tamtree harness, or pnpm direct ${id} --say (dev voices).`);
    done(1);
  }
  execFileSync(path.join(ROOT, "node_modules/.bin/tsx"), ["scripts/voice-say.ts", id], { stdio: "inherit", cwd: ROOT });
}
status.voice = { ok: true, regenerated: stale };

// 3. Prep → compile → check.
const warnings = prepIfVoiced(id);
const result = compileSkitDir(id);
status.compile = { ok: true, warnings: result.warnings, prepWarnings: warnings, durationSec: result.program.durationInFrames / result.program.fps };
console.log(summarize(result.program));
const report = checkSkitDir(id, result);
status.check = report;

// 4. Contact sheet (always: it's what a reviewer reads first), then the MP4 if the check passed.
const sheet = await renderSheet({ id: has("debug") ? "SkitDebug" : "Skit", inputProps: { skit: id, showLabels: has("debug") }, scale: 0.2, out: path.join(ROOT, "out", `${id}-sheet.png`), title: id });
status.sheet = path.relative(ROOT, sheet);
console.log(`sheet: ${status.sheet}`);
if (!report.ok) {
  console.error("self-check failed: fix the errors above before rendering the MP4");
  done(1);
}
if (!has("no-mp4")) {
  const mp4 = await renderSkitMp4(id, { debug: has("debug") });
  status.mp4 = path.relative(ROOT, mp4);
  console.log(`mp4: ${status.mp4}`);
}
done(0);
