/**
 * Prepare step: voice.json (TTS lines) and file-audio beats → script-aligned word timings +
 * mouth cues per line, cached by content hash in `generated/cache/`; writes
 * `generated/voice.prepared.json`. No network. Adapters decide the tools (see `adapters.ts`).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  alignWords,
  docBeats,
  estimateMouthCues,
  estimateWords,
  estimateWordsInSpans,
  parseSkit,
  PreparedLineSchema,
  VoiceManifestSchema,
  type PreparedLine,
  type PreparedVoice,
  type SkitDoc,
  type VoiceLine,
} from "../engine/core";
import { defaultAdapters, type Adapters } from "./adapters";
import type { Workspace } from "./workspace";

/** Bump when prepare's output for the same inputs changes, to invalidate the cache. */
export const PREP_VERSION = 5;

export type PrepResult = {
  voice: PreparedVoice;
  hits: number;
  mouthTool: string;
  warnings: string[];
};

export type PrepOptions = { requireLipSync?: boolean; adapters?: Adapters };

type Ctx = { ws: Workspace; skitId: string; dir: string; gen: string; a: Adapters; mouthTool: string; warnings: string[] };

const hashOf = (...parts: (Buffer | string)[]) => {
  const h = crypto.createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 24);
};

const cachedOr = (ctx: Ctx, key: string, extraFile: string | undefined, make: () => PreparedLine): { line: PreparedLine; hit: boolean } => {
  const file = path.join(ctx.gen, "cache", `${key}.json`);
  if (fs.existsSync(file) && (!extraFile || fs.existsSync(extraFile))) return { line: PreparedLineSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))), hit: true };
  const line = make();
  fs.writeFileSync(file, JSON.stringify(line, null, 1));
  return { line, hit: false };
};

const mouths = (ctx: Ctx, mono: string, text: string, words: PreparedLine["words"]) => (ctx.a.lipSync ? ctx.a.lipSync.cues(mono, text, ctx.gen) : estimateMouthCues(words));

/** A TTS line from the harness (or `pnpm voice:say`). */
const prepTtsLine = (ctx: Ctx, line: VoiceLine) => {
  const audio = path.join(ctx.dir, line.audio);
  if (!fs.existsSync(audio)) throw new Error(`Line "${line.id}": audio not found at ${path.relative(ctx.ws.root, audio)}`);
  const key = hashOf(fs.readFileSync(audio), JSON.stringify({ line: { ...line, audio: undefined }, mouthTool: ctx.mouthTool, PREP_VERSION }));
  return cachedOr(ctx, key, undefined, () => {
    const mono = path.join(ctx.gen, `${key}.wav`);
    ctx.a.normalizer.toWav(audio, mono, { rate: 22050 });
    const durationMs = line.durationMs ?? ctx.a.probe.durationMs(mono);
    const spans = ctx.a.probe.speechSpans(mono);
    const words = line.words?.length ? alignWords(line.text, durationMs, line.words) : spans.length ? estimateWordsInSpans(line.text, spans, durationMs) : estimateWords(line.text, durationMs);
    const mouthCues = mouths(ctx, mono, line.text, words);
    fs.rmSync(mono);
    return {
      id: line.id,
      speaker: line.speaker,
      text: line.text,
      audio: ctx.ws.publicPath(audio),
      durationMs,
      words,
      mouthCues,
      source: { words: line.words?.length ? "tts" : "estimated", mouth: ctx.a.lipSync ? "rhubarb" : "estimated" },
    };
  });
};

/** A beat cut from an existing audio file (`"audio": { "source": "file" }`). */
const prepClip = (ctx: Ctx, b: ReturnType<typeof docBeats>[number]) => {
  const a = b.audio;
  if (a.source !== "file") throw new Error("unreachable");
  const src = path.join(ctx.dir, a.src);
  if (!fs.existsSync(src)) throw new Error(`Beat "${b.id}": audio file not found at ${path.relative(ctx.ws.root, src)}`);
  const timing = a.words?.length ? "manual" : (ctx.a.transcriber?.id ?? "estimated");
  const key = hashOf(fs.readFileSync(src), JSON.stringify({ id: b.id, text: b.line, a: { ...a, src: undefined }, timing, mouth: ctx.mouthTool, PREP_VERSION }));
  const clip = path.join(ctx.gen, "clips", `${b.id}-${key}.wav`);
  return cachedOr(ctx, key, clip, () => {
    const text = b.line!;
    // The served clip keeps its channels; analysis runs on a mono copy.
    ctx.a.normalizer.toWav(src, clip, { stereo: true, startMs: a.startMs, endMs: a.endMs });
    const mono = path.join(ctx.gen, `${key}.mono.wav`);
    ctx.a.normalizer.toWav(clip, mono, { rate: 22050 });
    const durationMs = ctx.a.probe.durationMs(mono);
    const offset = a.startMs ?? 0;
    let words: PreparedLine["words"] | undefined;
    let source: PreparedLine["source"]["words"] = "estimated";
    if (a.words?.length) {
      words = alignWords(text, durationMs, a.words.map((w) => ({ text: w.text, startMs: w.startMs - offset, endMs: w.endMs === undefined ? undefined : w.endMs - offset })));
      source = "manual";
    } else if (ctx.a.transcriber) {
      const w16 = path.join(ctx.gen, `${key}.16k.wav`);
      ctx.a.normalizer.toWav(clip, w16, { rate: 16000 });
      try {
        words = alignWords(text, durationMs, ctx.a.transcriber.words(w16, path.join(ctx.gen, key)));
        source = "whisper";
      } catch (e) {
        ctx.warnings.push(`Beat "${b.id}": ${ctx.a.transcriber.id} failed (${e instanceof Error ? e.message : e}); word timings estimated.`);
      }
      fs.rmSync(w16, { force: true });
    }
    words ??= estimateWordsInSpans(text, ctx.a.probe.speechSpans(mono), durationMs);
    const mouthCues = mouths(ctx, mono, text, words);
    fs.rmSync(mono);
    return { id: b.id, speaker: b.speaker, text, audio: ctx.ws.publicPath(clip), durationMs, words, mouthCues, source: { words: source, mouth: ctx.a.lipSync ? "rhubarb" : "estimated" } };
  });
};

export const fileBeats = (doc: SkitDoc) => docBeats(doc).filter((b) => b.audio.source === "file" && !b.silent && b.line && b.speaker);

/** Does this skit have anything to prepare (a voice manifest or file-audio beats)? */
export const needsPrep = (ws: Workspace, skitId: string): boolean => {
  const dir = ws.skitDir(skitId);
  if (fs.existsSync(path.join(dir, "voice.json"))) return true;
  const skit = path.join(dir, "skit.json");
  return fs.existsSync(skit) && fileBeats(parseSkit(JSON.parse(fs.readFileSync(skit, "utf8")))).length > 0;
};

export const prepSkit = (ws: Workspace, skitId: string, opts: PrepOptions = {}): PrepResult => {
  const dir = ws.skitDir(skitId);
  const gen = path.join(dir, "generated");
  fs.mkdirSync(path.join(gen, "cache"), { recursive: true });
  fs.mkdirSync(path.join(gen, "clips"), { recursive: true });
  const a = opts.adapters ?? defaultAdapters(ws);
  const warnings: string[] = [];
  if (!a.lipSync) {
    const msg = "Rhubarb not found (set RHUBARB_PATH, put it in tools/, or on PATH).";
    if (opts.requireLipSync) throw new Error(msg);
    warnings.push(`${msg} Mouths will be ESTIMATED from word timings.`);
  }
  const ctx: Ctx = { ws, skitId, dir, gen, a, mouthTool: a.lipSync?.id ?? "estimated", warnings };

  const manifestPath = path.join(dir, "voice.json");
  const skitPath = path.join(dir, "skit.json");
  const doc = fs.existsSync(skitPath) ? parseSkit(JSON.parse(fs.readFileSync(skitPath, "utf8"))) : undefined;
  const clips = doc ? fileBeats(doc) : [];
  if (!fs.existsSync(manifestPath) && !clips.length)
    throw new Error(`No voice manifest at ${path.relative(ws.root, manifestPath)}. Generate voices first (tamtree harness, or pnpm voice:say ${skitId}).`);
  let tts: VoiceLine[] = [];
  if (fs.existsSync(manifestPath)) {
    const parsed = VoiceManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    if (!parsed.success)
      throw new Error(`Invalid ${path.relative(ws.root, manifestPath)}:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    tts = parsed.data.lines;
  }
  const results = [...tts.map((l) => prepTtsLine(ctx, l)), ...clips.map((b) => prepClip(ctx, b))];
  if (results.some((r) => r.line.source.words === "estimated" && clips.some((c) => c.id === r.line.id)) && !a.transcriber)
    warnings.push("Word timings for file-audio beats are ESTIMATED (set WHISPER_MODEL + whisper-cli, or give audio.words).");
  const voice: PreparedVoice = { schemaVersion: 1, lines: results.map((r) => r.line) };
  fs.writeFileSync(path.join(gen, "voice.prepared.json"), JSON.stringify(voice, null, 1));
  return { voice, hits: results.filter((r) => r.hit).length, mouthTool: ctx.mouthTool, warnings };
};
