/** Voice a skit with a `Tts` (Kokoro by default): voice/<lineId>.wav + voice.json, cached per line. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseSkit, skitLines, type VoiceManifest } from "../../src/engine";
import { wavDurationMs } from "../../src/node";
import { KOKORO_DEFAULT, KOKORO_NARRATOR, KOKORO_VOICES } from "./kokoro-voices";
import type { Tts } from "./tts";

export type VoiceOptions = {
  /** Character id (or "narrator") → voice, over the defaults. */
  voices?: Record<string, string>;
  log?: (s: string) => void;
};

/** Which voice each line gets: the override, the house cast's Kokoro voice, then the default. */
export const voiceFor = (character: string, narrator: boolean, voices: Record<string, string> = {}): string =>
  narrator ? (voices.narrator ?? KOKORO_NARRATOR) : (voices[character] ?? KOKORO_VOICES[character] ?? KOKORO_DEFAULT);

export const voiceSkitDir = async (dir: string, tts: Tts, o: VoiceOptions = {}): Promise<VoiceManifest> => {
  const log = o.log ?? console.log;
  const doc = parseSkit(JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8")));
  const lines = skitLines(doc);
  const voiceDir = path.join(dir, "voice");
  const cache = path.join(dir, "generated", "tts-cache");
  fs.mkdirSync(voiceDir, { recursive: true });
  fs.mkdirSync(cache, { recursive: true });
  let made = 0;
  const out: VoiceManifest["lines"] = [];
  for (const line of lines) {
    const voice = voiceFor(line.character, !!line.narrator, o.voices);
    const key = crypto.createHash("sha256").update(JSON.stringify([tts.id, voice, line.text])).digest("hex").slice(0, 24);
    const cached = path.join(cache, `${key}.wav`);
    if (!fs.existsSync(cached)) {
      await tts.speak(line.text, voice, cached);
      made++;
      log(`  ${line.id} (${voice}): ${line.text}`);
    }
    const wav = path.join(voiceDir, `${line.id}.wav`);
    fs.copyFileSync(cached, wav);
    out.push({ id: line.id, speaker: line.speaker, text: line.text, audio: `voice/${line.id}.wav`, durationMs: wavDurationMs(wav) });
  }
  const manifest: VoiceManifest = { schemaVersion: 1, lines: out };
  fs.writeFileSync(path.join(dir, "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
  log(`voiced ${lines.length} lines (${made} new, ${lines.length - made} cached) with ${tts.id}`);
  return manifest;
};
