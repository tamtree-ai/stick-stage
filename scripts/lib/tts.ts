/**
 * Text to speech for the dev scripts (`pnpm voice:tts`, `pnpm try`). The engine and the render
 * service never call a TTS; this is a prepare-step tool, like `pnpm voice:say`.
 *   default              Kokoro (kokoro-js) in this process, on the CPU. Weights download once
 *                        (~90 MB) to ~/.cache/stickstage/kokoro (STICKSTAGE_KOKORO_CACHE).
 *   LOCAL_TTS_BASE_URL   any OpenAI-compatible POST /audio/speech instead (Kokoro-FastAPI,
 *                        OpenAI), with LOCAL_TTS_MODEL (default "kokoro") and LOCAL_TTS_API_KEY.
 * Every line is written as 16-bit PCM WAV, which is what prep and the render service read.
 */
import fs from "node:fs";
import { DOCTOR_HINT, kokoroCacheDir } from "./doctor";

export interface Tts {
  /** Name + model, recorded in the cache key. */
  readonly id: string;
  /** One line, written to `wav` (16-bit PCM). */
  speak(text: string, voice: string, wav: string): Promise<void>;
}

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

type KokoroModel = { generate(text: string, o: { voice: string }): Promise<{ audio: Float32Array; sampling_rate: number }>; voices: Record<string, unknown> };

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
    speak: async (text, voice, wav) => {
      const tts = await load();
      if (!(voice in tts.voices)) throw new Error(`"${voice}" is not a Kokoro voice. Pick one of: ${Object.keys(tts.voices).join(", ")}`);
      const out = await tts.generate(text, { voice });
      fs.writeFileSync(wav, pcm16Wav(out.audio, out.sampling_rate));
    },
  };
};

/** Any OpenAI-compatible speech endpoint (`POST {base}/audio/speech`), asked for WAV. */
export const httpTts = (baseUrl: string, opts: { model?: string; apiKey?: string } = {}): Tts => {
  const base = baseUrl.replace(/\/+$/, "");
  const model = opts.model ?? "kokoro";
  return {
    id: `http:${base}:${model}`,
    speak: async (text, voice, wav) => {
      const res = await fetch(`${base}/audio/speech`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}) },
        body: JSON.stringify({ model, input: text, voice, response_format: "wav" }),
      });
      if (!res.ok) throw new Error(`${base}/audio/speech answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.subarray(0, 4).toString() !== "RIFF") throw new Error(`${base}/audio/speech did not return a WAV file`);
      fs.writeFileSync(wav, bytes);
    },
  };
};

export const ttsFromEnv = (env: NodeJS.ProcessEnv = process.env, log?: (s: string) => void): Tts =>
  env.LOCAL_TTS_BASE_URL ? httpTts(env.LOCAL_TTS_BASE_URL, { model: env.LOCAL_TTS_MODEL, apiKey: env.LOCAL_TTS_API_KEY }) : kokoroTts(log);
