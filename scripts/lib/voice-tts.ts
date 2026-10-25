/** Voice a skit with a `Tts` (Kokoro by default): voice/<lineId>.wav + voice.json, cached per line. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { deliveryFor, parseSkit, phrasesOf, skitLines, type VoiceManifest } from "../../src/engine";
import { wavDurationMs } from "../../src/node";
import { KOKORO_DEFAULT, KOKORO_NARRATOR, KOKORO_VOICES } from "./kokoro-voices";
import { pcm16Wav, type Audio, type Tts } from "./tts";

export type VoiceOptions = {
  /** Character id (or "narrator") → voice, over the defaults. */
  voices?: Record<string, string>;
  log?: (s: string) => void;
};

/** Which voice each line gets: the override, the house cast's Kokoro voice, then the default. */
export const voiceFor = (character: string, narrator: boolean, voices: Record<string, string> = {}): string =>
  narrator ? (voices.narrator ?? KOKORO_NARRATOR) : (voices[character] ?? KOKORO_VOICES[character] ?? KOKORO_DEFAULT);

/** Cut the silence a TTS leaves around a phrase, keeping `padMs` so consonants aren't clipped. */
export const trimSilence = ({ audio, rate }: Audio, padMs = 40, floor = 0.012): Float32Array => {
  let a = 0;
  let b = audio.length - 1;
  while (a < b && Math.abs(audio[a]!) < floor) a++;
  while (b > a && Math.abs(audio[b]!) < floor) b--;
  const pad = Math.round((rate * padMs) / 1000);
  return audio.subarray(Math.max(0, a - pad), Math.min(audio.length, b + pad + 1));
};

/**
 * Say a line as it's meant: phrase by phrase at the line's delivery speed, with real pauses at
 * its punctuation (`phrasesOf`, `deliveryFor`), so "A shell! A real one! It's mine!" lands as three
 * beats instead of one breath.
 */
export const performLine = async (tts: Tts, text: string, voice: string, line: { narrator?: boolean; expression?: string; delivery?: string }): Promise<Audio> => {
  const d = deliveryFor(line);
  const parts: Float32Array[] = [];
  let rate = 24000;
  for (const p of phrasesOf(text, d)) {
    const out = await tts.synth(p.text, voice, d.speed);
    rate = out.rate;
    parts.push(trimSilence(out));
    if (p.pauseMs > 0) parts.push(new Float32Array(Math.round((rate * p.pauseMs) / 1000)));
  }
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.length;
  }
  return { audio: all, rate };
};

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
    const said = line.spoken ?? line.text;
    const d = deliveryFor(line);
    const key = crypto.createHash("sha256").update(JSON.stringify([tts.id, voice, said, "phrased-1", d])).digest("hex").slice(0, 24);
    const cached = path.join(cache, `${key}.wav`);
    if (!fs.existsSync(cached)) {
      const out = await performLine(tts, said, voice, line);
      fs.writeFileSync(cached, pcm16Wav(out.audio, out.rate));
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
