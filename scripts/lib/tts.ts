/**
 * Text to speech for the dev scripts (`pnpm voice:tts`, `pnpm try`). The engine and the render
 * service never call a TTS; this is a prepare-step tool, like `pnpm voice:say`.
 *   default              Kokoro (kokoro-js) in this process, on the CPU. Weights download once
 *                        (~90 MB) to ~/.cache/stickstage/kokoro (STICKSTAGE_KOKORO_CACHE).
 *   LOCAL_TTS_BASE_URL   any OpenAI-compatible POST /audio/speech instead (Kokoro-FastAPI,
 *                        OpenAI), with LOCAL_TTS_MODEL (default "kokoro") and LOCAL_TTS_API_KEY.
 * Every line is written as 16-bit PCM WAV, which is what prep and the render service read.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DOCTOR_HINT, kokoroCacheDir } from "./doctor";

export type Audio = { audio: Float32Array; rate: number };

/** One phrase to voice, with how it's acted (`deliveryFor`). */
export type SynthJob = { text: string; voice: string; speed: number; intensity: number; seed: number };

export interface Tts {
  /** Name + model, recorded in the cache key. */
  readonly id: string;
  /** One line, written to `wav` (16-bit PCM). */
  speak(text: string, voice: string, wav: string): Promise<void>;
  /** One phrase as samples, at `speed` (1 = normal). */
  synth(text: string, voice: string, speed?: number): Promise<Audio>;
  /** Many phrases at once (a TTS with a slow start voices a whole skit in one go). Default: `synth` each. */
  synthMany?(jobs: readonly SynthJob[]): Promise<Audio[]>;
}

/** 16-bit PCM mono WAV → float samples. */
export const wavSamples = (bytes: Buffer): Audio => {
  let rate = 24000;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = bytes.toString("ascii", at, at + 4);
    const size = bytes.readUInt32LE(at + 4);
    if (id === "fmt ") {
      rate = bytes.readUInt32LE(at + 12);
      if (bytes.readUInt16LE(at + 22) !== 16 || bytes.readUInt16LE(at + 10) !== 1) throw new Error("expected mono 16-bit PCM WAV");
    }
    if (id === "data") {
      const n = Math.floor(Math.min(size, bytes.length - at - 8) / 2);
      const audio = new Float32Array(n);
      for (let i = 0; i < n; i++) audio[i] = bytes.readInt16LE(at + 8 + i * 2) / 32768;
      return { audio, rate };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
};

/** Float samples → 16-bit PCM mono WAV. */
export const pcm16Wav = (samples: Float32Array, rate: number): Buffer => {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32767), i * 2);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVE", 8);
  head.write("fmt ", 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
};

export const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

type KokoroModel = { generate(text: string, o: { voice: string; speed?: number }): Promise<{ audio: Float32Array; sampling_rate: number }>; voices: Record<string, unknown> };

/** Kokoro in this process: loaded once, q8 weights on the CPU. */
export const kokoroTts = (log: (s: string) => void = console.log): Tts => {
  let loading: Promise<KokoroModel> | undefined;
  const load = () =>
    (loading ??= (async () => {
      let mod: typeof import("kokoro-js");
      let transformers: typeof import("@huggingface/transformers");
      try {
        [mod, transformers] = await Promise.all([import("kokoro-js"), import("@huggingface/transformers")]);
      } catch {
        throw new Error(`Kokoro is not installed (kokoro-js is an optional dependency): run pnpm install, or set LOCAL_TTS_BASE_URL. ${DOCTOR_HINT}`);
      }
      transformers.env.cacheDir = kokoroCacheDir();
      const shown = new Map<string, number>();
      const progress = (p: { status: string; file?: string; progress?: number; total?: number }) => {
        if (p.status !== "progress" || !p.file || !p.total || p.total < 1_000_000) return;
        const step = Math.floor((p.progress ?? 0) / 25) * 25;
        if (shown.get(p.file) === step) return;
        shown.set(p.file, step);
        log(`Kokoro (first run only): ${p.file} ${step}% of ${(p.total / 1e6).toFixed(0)} MB`);
      };
      return (await mod.KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: "q8", device: "cpu", progress_callback: progress as never })) as unknown as KokoroModel;
    })());
  return {
    id: `kokoro-js:${KOKORO_MODEL}:q8`,
    synth: async (text, voice, speed = 1) => {
      const tts = await load();
      if (!(voice in tts.voices)) throw new Error(`"${voice}" is not a Kokoro voice. Pick one of: ${Object.keys(tts.voices).join(", ")}`);
      const out = await tts.generate(text, { voice, speed });
      return { audio: out.audio, rate: out.sampling_rate };
    },
    speak: async function (text, voice, wav) {
      const out = await this.synth(text, voice);
      fs.writeFileSync(wav, pcm16Wav(out.audio, out.rate));
    },
  };
};

/** Any OpenAI-compatible speech endpoint (`POST {base}/audio/speech`), asked for WAV. */
export const httpTts = (baseUrl: string, opts: { model?: string; apiKey?: string } = {}): Tts => {
  const base = baseUrl.replace(/\/+$/, "");
  const model = opts.model ?? "kokoro";
  const fetchWav = async (text: string, voice: string, speed = 1): Promise<Buffer> => {
    const res = await fetch(`${base}/audio/speech`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}) },
      body: JSON.stringify({ model, input: text, voice, response_format: "wav", ...(speed !== 1 ? { speed } : {}) }),
    });
    if (!res.ok) throw new Error(`${base}/audio/speech answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.subarray(0, 4).toString() !== "RIFF") throw new Error(`${base}/audio/speech did not return a WAV file`);
    return bytes;
  };
  return {
    id: `http:${base}:${model}`,
    synth: async (text, voice, speed) => wavSamples(await fetchWav(text, voice, speed)),
    speak: async (text, voice, wav) => {
      fs.writeFileSync(wav, await fetchWav(text, voice));
    },
  };
};

export const CHATTERBOX_PIN = "chatterbox-tts==0.1.7";
// Perth (its watermarker) still imports pkg_resources, which setuptools 81 dropped.
const REF_TEXT =
  "Hello there! It's a lovely day today, isn't it? I was just thinking about all the fun things we could do together. Shall we go and see?";

/**
 * Chatterbox (Resemble AI, MIT): an expressive voice with an emotion dial, run in its own Python
 * env through uv (`scripts/lib/voice_chatterbox.py`). It clones a voice from a short reference clip, so
 * each Kokoro voice is spoken once (cached in ~/.cache/stickstage/voice-refs) and Chatterbox then
 * performs every line in that voice: `intensity` sets the emotion (exaggeration) and slows the
 * pacing (cfg). Outputs carry Resemble's inaudible Perth watermark.
 */
export const chatterboxTts = (kokoro: Tts, log: (s: string) => void = console.log): Tts => {
  const refs = path.join(os.homedir(), ".cache", "stickstage", "voice-refs");
  const refFor = async (voice: string): Promise<string> => {
    const ref = path.join(refs, `${voice}.wav`);
    if (!fs.existsSync(ref)) {
      fs.mkdirSync(refs, { recursive: true });
      await kokoro.speak(REF_TEXT, voice, ref);
    }
    return ref;
  };
  const synthMany = async (jobs: readonly SynthJob[]): Promise<Audio[]> => {
    if (!jobs.length) return [];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-cb-"));
    const spec = await Promise.all(
      jobs.map(async (j, i) => ({
        text: j.text,
        out: path.join(dir, `${i}.wav`),
        ref: await refFor(j.voice),
        exaggeration: +(0.3 + j.intensity * 0.6).toFixed(3),
        cfg: +(0.5 - j.intensity * 0.2).toFixed(3),
        seed: j.seed,
      })),
    );
    fs.writeFileSync(path.join(dir, "jobs.json"), JSON.stringify(spec));
    log(`Chatterbox: ${jobs.length} phrases (first run downloads the model, ~2 GB)`);
    const script = path.join(import.meta.dirname, "voice_chatterbox.py");
    const run = spawnSync("uv", ["run", "--quiet", "--python", "3.11", "--with", CHATTERBOX_PIN, "--with", "setuptools<81", script, path.join(dir, "jobs.json")], { stdio: "inherit" });
    if (run.error || run.status !== 0) throw new Error(`Chatterbox failed${run.error ? `: ${run.error.message}` : ` (exit ${run.status})`}. It needs uv (https://docs.astral.sh/uv/). ${DOCTOR_HINT}`);
    const out = spec.map((j) => wavSamples(fs.readFileSync(j.out)));
    fs.rmSync(dir, { recursive: true, force: true });
    return out;
  };
  return {
    id: `chatterbox:${CHATTERBOX_PIN}:${kokoro.id}`,
    synthMany,
    synth: async (text, voice, speed = 1) => (await synthMany([{ text, voice, speed, intensity: 0.45, seed: 0 }]))[0]!,
    speak: async function (text, voice, wav) {
      const out = await this.synth(text, voice);
      fs.writeFileSync(wav, pcm16Wav(out.audio, out.rate));
    },
  };
};

/** `STICKSTAGE_TTS=chatterbox` for the expressive voice; LOCAL_TTS_BASE_URL for a server; else Kokoro. */
export const ttsFromEnv = (env: NodeJS.ProcessEnv = process.env, log?: (s: string) => void): Tts => {
  if (env.LOCAL_TTS_BASE_URL) return httpTts(env.LOCAL_TTS_BASE_URL, { model: env.LOCAL_TTS_MODEL, apiKey: env.LOCAL_TTS_API_KEY });
  return env.STICKSTAGE_TTS === "chatterbox" ? chatterboxTts(kokoroTts(log), log) : kokoroTts(log);
};
