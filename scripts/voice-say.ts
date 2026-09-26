/**
 * Local dev voice source: pnpm voice:say <skitId>
 *
 * Stand-in for the tamtree harness TTS nodes. Reads `public/skits/<skitId>/script.json`
 * (`voices`: speaker → macOS `say` voice, `lines`: [{ id, speaker, text }]), synthesizes each
 * line with macOS `say`, and writes `voice/<lineId>.wav` plus `voice.json` in the same
 * contract the harness produces. `say` gives no word timings, so prep estimates them.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { VoiceManifest } from "../src/engine";
import { wavDurationMs } from "./lib/audio";
import { ROOT } from "./lib/tools";

const ScriptSchema = z.object({
  voices: z.record(z.string(), z.string()),
  /** `say -r` words per minute. */
  rate: z.number().optional(),
  lines: z.array(z.object({ id: z.string(), speaker: z.string(), text: z.string() }).passthrough()),
});

const skitId = process.argv[2];
if (!skitId) {
  console.error("usage: pnpm voice:say <skitId>");
  process.exit(1);
}
const skitDir = path.join(ROOT, "public/skits", skitId);
const script = ScriptSchema.parse(JSON.parse(fs.readFileSync(path.join(skitDir, "script.json"), "utf8")));
const voiceDir = path.join(skitDir, "voice");
fs.mkdirSync(voiceDir, { recursive: true });

const manifest: VoiceManifest = {
  schemaVersion: 1,
  lines: script.lines.map((line) => {
    const voice = script.voices[line.speaker];
    if (!voice) throw new Error(`No voice for speaker "${line.speaker}" in script.json voices`);
    const wav = path.join(voiceDir, `${line.id}.wav`);
    const rate = script.rate ? ["-r", String(script.rate)] : [];
    execFileSync("say", ["-v", voice, ...rate, "--file-format=WAVE", "--data-format=LEI16@22050", "-o", wav, line.text]);
    return { id: line.id, speaker: line.speaker, text: line.text, audio: `voice/${line.id}.wav`, durationMs: wavDurationMs(wav) };
  }),
};
fs.writeFileSync(path.join(skitDir, "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`voice:say ${skitId}: ${manifest.lines.length} lines → ${path.relative(ROOT, voiceDir)}`);
