/**
 * Local voices: pnpm voice:tts <skitId> [--voice-<character>=<kokoroVoice>]
 *
 * Voices every spoken line of public/skits/<id>/skit.json with Kokoro in this process (or
 * LOCAL_TTS_BASE_URL, see scripts/lib/tts.ts) and writes voice/<lineId>.wav + voice.json in the
 * voice contract (docs/voice-contract.md). Kokoro gives no word timings, so prep estimates them
 * from the audio and Rhubarb drives the mouths. Lines are cached by text and voice.
 */
import { formatDiagnostics, SkitError } from "../src/engine";
import { DOCTOR_HINT } from "./lib/doctor";
import { skitDir } from "./lib/skit";
import { ttsFromEnv } from "./lib/tts";
import { voiceSkitDir } from "./lib/voice-tts";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("usage: pnpm voice:tts <skitId> [--voice-<character>=<kokoroVoice>]");
  process.exit(1);
}
const voices = Object.fromEntries(args.flatMap((a) => (a.startsWith("--voice-") && a.includes("=") ? [a.slice(8).split("=") as [string, string]] : [])));
const dir = skitDir(id);
if (!fs.existsSync(path.join(dir, "skit.json"))) {
  console.error(`No skit at public/skits/${id}/skit.json (labs with script.json use pnpm voice:say). ${DOCTOR_HINT}`);
  process.exit(1);
}
try {
  await voiceSkitDir(dir, ttsFromEnv(), { voices });
} catch (e) {
  console.error(e instanceof SkitError ? formatDiagnostics(e.diagnostics) : e instanceof Error ? e.message : e);
  process.exit(1);
}
