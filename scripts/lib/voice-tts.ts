/** Voice a skit with a `Tts` (Kokoro by default): voice/<lineId>.wav + voice.json, cached per line. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { deliveryFor, parseSkit, phrasesOf, skitLines, type VoiceManifest } from "../../src/engine";
import { wavDurationMs } from "../../src/node";
import { series } from "../../src/data";
import { KOKORO_DEFAULT, KOKORO_NARRATOR, KOKORO_VOICES } from "./kokoro-voices";
import { pcm16Wav, type Audio, type SynthJob, type Tts } from "./tts";

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

/** Join phrase takes with the planned silences between them. */
const assemble = (takes: readonly Audio[], pausesMs: readonly number[]): Audio => {
  const rate = takes[0]?.rate ?? 24000;
  const parts = takes.flatMap((t, i) => [trimSilence(t), new Float32Array(Math.round((rate * (pausesMs[i] ?? 0)) / 1000))]);
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.length;
  }
  return { audio: all, rate };
};

/**
 * Say lines as they're meant: phrase by phrase, acted by the line's delivery (`deliveryFor`: speed,
 * intensity), with real pauses at the punctuation (`phrasesOf`), so "A shell! A real one! It's mine!"
 * lands as three beats instead of one breath. Every phrase of every line goes to the TTS in one
 * batch when it can take one (Chatterbox loads a big model once).
 */
export const performLines = async (tts: Tts, lines: readonly { text: string; voice: string; line: { narrator?: boolean; expression?: string; delivery?: string; pace?: "normal" | "fast" } }[]): Promise<Audio[]> => {
  const plans = lines.map((l) => {
    const d = deliveryFor(l.line);
    return { d, voice: l.voice, phrases: phrasesOf(l.text, d) };
  });
  const jobs: SynthJob[] = plans.flatMap((p, i) => p.phrases.map((ph, k) => ({ text: ph.text, voice: p.voice, speed: p.d.speed, intensity: p.d.intensity, seed: i * 100 + k })));
  const takes: Audio[] = [];
  if (tts.synthMany) takes.push(...(await tts.synthMany(jobs)));
  else for (const j of jobs) takes.push(await tts.synth(j.text, j.voice, j.speed));
  let at = 0;
  return plans.map((p) => {
    const mine = takes.slice(at, at + p.phrases.length);
    at += p.phrases.length;
    return assemble(mine, p.phrases.map((ph) => ph.pauseMs));
  });
};

/** One line, performed (`performLines`). */
export const performLine = async (tts: Tts, text: string, voice: string, line: { narrator?: boolean; expression?: string; delivery?: string }): Promise<Audio> =>
  (await performLines(tts, [{ text, voice, line }]))[0]!;

export const voiceSkitDir = async (dir: string, tts: Tts, o: VoiceOptions = {}): Promise<VoiceManifest> => {
  const log = o.log ?? console.log;
  const doc = parseSkit(JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8")));
  const lines = skitLines(doc, [], series);
  const voiceDir = path.join(dir, "voice");
  const cache = path.join(dir, "generated", "tts-cache");
  fs.mkdirSync(voiceDir, { recursive: true });
  fs.mkdirSync(cache, { recursive: true });
  const planned = lines.map((line) => {
    const voice = voiceFor(line.character, !!line.narrator, o.voices);
    const said = line.spoken ?? line.text;
    const key = crypto.createHash("sha256").update(JSON.stringify([tts.id, voice, said, "phrased-2", deliveryFor(line)])).digest("hex").slice(0, 24);
    return { line, voice, said, cached: path.join(cache, `${key}.wav`) };
  });
  const todo = planned.filter((p) => !fs.existsSync(p.cached));
  const takes = await performLines(tts, todo.map((p) => ({ text: p.said, voice: p.voice, line: p.line })));
  todo.forEach((p, i) => {
    fs.writeFileSync(p.cached, pcm16Wav(takes[i]!.audio, takes[i]!.rate));
    log(`  ${p.line.id} (${p.voice}): ${p.line.text}`);
  });
  const out: VoiceManifest["lines"] = planned.map(({ line, cached }) => {
    const wav = path.join(voiceDir, `${line.id}.wav`);
    fs.copyFileSync(cached, wav);
    return { id: line.id, speaker: line.speaker, text: line.text, audio: `voice/${line.id}.wav`, durationMs: wavDurationMs(wav) };
  });
  const manifest: VoiceManifest = { schemaVersion: 1, lines: out };
  fs.writeFileSync(path.join(dir, "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
  log(`voiced ${lines.length} lines (${todo.length} new, ${lines.length - todo.length} cached) with ${tts.id}`);
  return manifest;
};
