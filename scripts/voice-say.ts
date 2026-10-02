/**
 * Local dev voice source: pnpm voice:say <skitId>
 *
 * Stand-in for the tamtree harness TTS nodes. Synthesizes each spoken line with macOS `say`
 * and writes `voice/<lineId>.wav` plus `voice.json` in the same contract the harness produces.
 * Reads `skit.json` (one line per spoken beat, voice = the character's `voice.say`) or, for
 * labs, `script.json` (`voices`: speaker → voice, `lines`: [{ id, speaker, text }]).
 * `say` gives no word timings, so prep estimates them.
 * `--narrator-rate=<wpm>` speeds up the voice-over lines (dev voices only; the harness picks its own pace).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { formatDiagnostics, parseSkit, SkitError, skitLines, type VoiceManifest } from "../src/engine";
import { library } from "../src/data";
import { wavDurationMs } from "../src/node";
import { ROOT } from "./lib/tools";

const ScriptSchema = z.object({
  voices: z.record(z.string(), z.string()),
  /** `say -r` words per minute. */
  rate: z.number().optional(),
  lines: z.array(z.object({ id: z.string(), speaker: z.string(), text: z.string() }).passthrough()),
});

type Line = { id: string; speaker: string; text: string; spoken?: string; voice: string; rate?: number };

const skitId = process.argv[2];
const narratorRate = Number(process.argv.find((a) => a.startsWith("--narrator-rate="))?.split("=")[1]) || undefined;
if (!skitId) {
  console.error("usage: pnpm voice:say <skitId> [--narrator-rate=<wpm>]");
  process.exit(1);
}
const skitDir = path.join(ROOT, "public/skits", skitId);
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(skitDir, f), "utf8"));

const DEFAULT_VOICE = "Samantha";
// Ships with every macOS; a skit picks a better one in `narrator.voice.say`.
const DEFAULT_NARRATOR = "Fred";
let lines: Line[];
let rate: number | undefined;
if (fs.existsSync(path.join(skitDir, "skit.json"))) {
  try {
    const doc = parseSkit(read("skit.json"));
    lines = skitLines(doc).map((l) => ({
      ...l,
      voice: l.narrator ? (doc.narrator?.voice?.say ?? DEFAULT_NARRATOR) : (library.characters[l.character]?.voice?.say ?? DEFAULT_VOICE),
      rate: l.narrator ? narratorRate : undefined,
    }));
  } catch (e) {
    console.error(e instanceof SkitError ? formatDiagnostics(e.diagnostics) : e);
    process.exit(1);
  }
} else {
  const script = ScriptSchema.parse(read("script.json"));
  rate = script.rate;
  lines = script.lines.map((l) => {
    const voice = script.voices[l.speaker];
    if (!voice) throw new Error(`No voice for speaker "${l.speaker}" in script.json voices`);
    return { ...l, voice };
  });
}

const voiceDir = path.join(skitDir, "voice");
fs.mkdirSync(voiceDir, { recursive: true });
const manifest: VoiceManifest = {
  schemaVersion: 1,
  lines: lines.map((line) => {
    const wav = path.join(voiceDir, `${line.id}.wav`);
    const wpm = line.rate ?? rate;
    const r = wpm ? ["-r", String(wpm)] : [];
    execFileSync("say", ["-v", line.voice, ...r, "--file-format=WAVE", "--data-format=LEI16@22050", "-o", wav, line.spoken ?? line.text]);
    return { id: line.id, speaker: line.speaker, text: line.text, ...(line.spoken ? { spoken: line.spoken } : {}), audio: `voice/${line.id}.wav`, durationMs: wavDurationMs(wav) };
  }),
};
fs.writeFileSync(path.join(skitDir, "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`voice:say ${skitId}: ${manifest.lines.length} lines → ${path.relative(ROOT, voiceDir)}`);
