/**
 * Node integrations behind interfaces (the core workflow never depends on a specific tool).
 * First-party implementations: Remotion's bundled ffmpeg (normalizer), the WAV probe, Rhubarb
 * (lip-sync), whisper.cpp (transcriber, optional). Precomputed timings and cues are a
 * first-class path: every adapter is optional except the normalizer and the probe.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { MOUTH_SHAPES, parseWhisperJson, type MouthCue, type Span, type TimedWord } from "../engine/core";
import { speechSpans, wavDurationMs } from "./audio";
import type { Workspace } from "./workspace";

export interface AudioNormalizer {
  /** Any audio → 16-bit PCM WAV (mono unless `stereo`), optionally trimmed. */
  toWav(input: string, output: string, opts?: { rate?: number; stereo?: boolean; startMs?: number; endMs?: number }): void;
}
export interface MediaProbe {
  durationMs(wav: string): number;
  /** Spoken spans (silence detection) of a mono 16-bit WAV. */
  speechSpans(wav: string): Span[];
}
export interface LipSyncer {
  /** Name + version, recorded in cache keys and provenance. */
  readonly id: string;
  cues(monoWav: string, text: string, tmpDir: string): MouthCue[];
}
export interface Transcriber {
  readonly id: string;
  /** Word timings (ms) for a 16 kHz mono WAV. */
  words(wav16k: string, tmpBase: string): TimedWord[];
}

export type Adapters = { normalizer: AudioNormalizer; probe: MediaProbe; lipSync?: LipSyncer; transcriber?: Transcriber };

/** Remotion's bundled ffmpeg (no system ffmpeg needed). */
export const remotionFfmpeg = (ws: Workspace): AudioNormalizer => {
  const run = (args: string[]) =>
    execFileSync(path.join(ws.root, "node_modules/.bin/remotion"), ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
  return {
    toWav: (input, output, o = {}) => {
      const trim = [...(o.startMs !== undefined ? ["-ss", `${o.startMs / 1000}`] : []), ...(o.endMs !== undefined ? ["-to", `${o.endMs / 1000}`] : [])];
      run(["-i", input, ...trim, ...(o.stereo ? [] : ["-ac", "1"]), ...(o.rate ? ["-ar", String(o.rate)] : []), "-c:a", "pcm_s16le", output]);
    },
  };
};

export const wavProbe: MediaProbe = { durationMs: wavDurationMs, speechSpans: (w) => speechSpans(w) };

const RhubarbOut = z.object({
  metadata: z.object({ duration: z.number() }),
  mouthCues: z.array(z.object({ start: z.number(), end: z.number(), value: z.enum(MOUTH_SHAPES) })),
});

/** Rhubarb Lip Sync at `bin`, always run with the line text as the dialog file. */
export const rhubarb = (bin: string): LipSyncer => {
  const version = execFileSync(bin, ["--version"], { encoding: "utf8" }).match(/\d+\.\d+\.\d+/)?.[0] ?? "unknown";
  return {
    id: `rhubarb ${version}`,
    cues: (wav, text, tmpDir) => {
      const dialog = path.join(tmpDir, `${path.basename(wav)}.txt`);
      fs.writeFileSync(dialog, text);
      const json = execFileSync(bin, ["-q", "-f", "json", "--extendedShapes", "GHX", "-d", dialog, wav], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      return RhubarbOut.parse(JSON.parse(json)).mouthCues.map((c) => ({ startMs: Math.round(c.start * 1000), endMs: Math.round(c.end * 1000), shape: c.value }));
    },
  };
};

const which = (bin: string): string | undefined => {
  try {
    return execFileSync("which", [bin], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
};

/** `env.RHUBARB_PATH`, then `<tools>/Rhubarb-Lip-Sync-*\/rhubarb`, then `rhubarb` on PATH. */
export const findRhubarb = (ws: Workspace, env: NodeJS.ProcessEnv = process.env): string | undefined => {
  if (env.RHUBARB_PATH) return env.RHUBARB_PATH;
  if (fs.existsSync(ws.toolsDir))
    for (const d of fs.readdirSync(ws.toolsDir).sort().reverse()) {
      const bin = path.join(ws.toolsDir, d, "rhubarb");
      if (d.startsWith("Rhubarb-Lip-Sync") && fs.existsSync(bin)) return bin;
    }
  return which("rhubarb");
};

/** whisper.cpp (`whisper-cli`) with a ggml model, one word per segment. */
export const whisperCpp = (bin: string, model: string): Transcriber => ({
  id: `whisper:${path.basename(model)}`,
  words: (wav16k, tmpBase) => {
    execFileSync(bin, ["-m", model, "-f", wav16k, "-oj", "-ml", "1", "-sow", "-of", tmpBase, "-np"], { stdio: ["ignore", "ignore", "inherit"] });
    const json = JSON.parse(fs.readFileSync(`${tmpBase}.json`, "utf8"));
    fs.rmSync(`${tmpBase}.json`);
    return parseWhisperJson(json);
  },
});

/** WHISPER_MODEL (a ggml file) + WHISPER_PATH or `whisper-cli` on PATH; undefined when not set up. */
export const findWhisper = (env: NodeJS.ProcessEnv = process.env): Transcriber | undefined => {
  const model = env.WHISPER_MODEL;
  if (!model || !fs.existsSync(model)) return undefined;
  const bin = env.WHISPER_PATH ?? which("whisper-cli");
  return bin ? whisperCpp(bin, model) : undefined;
};

/** The default adapters for a workspace: ffmpeg + WAV probe, plus Rhubarb and Whisper when installed. */
export const defaultAdapters = (ws: Workspace, env: NodeJS.ProcessEnv = process.env): Adapters => {
  const bin = findRhubarb(ws, env);
  return { normalizer: remotionFfmpeg(ws), probe: wavProbe, lipSync: bin ? rhubarb(bin) : undefined, transcriber: findWhisper(env) };
};
