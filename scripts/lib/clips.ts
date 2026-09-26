/**
 * Prepare beats whose audio comes from an existing file (`"audio": { "source": "file" }`), e.g.
 * lip-syncing to a trending sound: trim → word timings (manual, Whisper, or estimated from
 * silences) → Rhubarb mouths. Hash-cached like TTS lines; no network.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { alignWords, docBeats, estimateMouthCues, estimateWordsInSpans, parseWhisperJson, PreparedLineSchema, type PreparedLine, type SkitDoc } from "../../src/engine";
import { speechSpans, wavDurationMs } from "./audio";
import { ffmpeg, findWhisper, ROOT, runRhubarb, runWhisper } from "./tools";

export const CLIP_VERSION = 1;

export type ClipContext = { skitId: string; rhubarb?: string; mouthTool: string; warnings: string[] };

export const fileBeats = (doc: SkitDoc) => docBeats(doc).filter((b) => b.audio.source === "file" && !b.silent && b.line && b.speaker);

export const prepFileLines = (doc: SkitDoc, ctx: ClipContext): { lines: PreparedLine[]; hits: number } => {
  const skitDir = path.join(ROOT, "public/skits", ctx.skitId);
  const genDir = path.join(skitDir, "generated");
  const clipDir = path.join(genDir, "clips");
  fs.mkdirSync(path.join(genDir, "cache"), { recursive: true });
  fs.mkdirSync(clipDir, { recursive: true });
  const whisper = findWhisper();
  let hits = 0;
  const lines = fileBeats(doc).map((b): PreparedLine => {
    if (b.audio.source !== "file") throw new Error("unreachable");
    const a = b.audio;
    const src = path.join(skitDir, a.src);
    if (!fs.existsSync(src)) throw new Error(`Beat "${b.id}": audio file not found at ${path.relative(ROOT, src)}`);
    const tool = a.words?.length ? "manual" : whisper ? `whisper:${path.basename(whisper.model)}` : "estimated";
    const key = crypto
      .createHash("sha256")
      .update(fs.readFileSync(src))
      .update(JSON.stringify({ id: b.id, text: b.line, a: { ...a, src: undefined }, tool, mouth: ctx.mouthTool, CLIP_VERSION }))
      .digest("hex")
      .slice(0, 24);
    const clip = path.join(clipDir, `${b.id}-${key}.wav`);
    const cached = path.join(genDir, "cache", `${key}.json`);
    if (fs.existsSync(cached) && fs.existsSync(clip)) {
      hits++;
      return PreparedLineSchema.parse(JSON.parse(fs.readFileSync(cached, "utf8")));
    }
    const trim = [...(a.startMs !== undefined ? ["-ss", `${a.startMs / 1000}`] : []), ...(a.endMs !== undefined ? ["-to", `${a.endMs / 1000}`] : [])];
    // The served clip (stereo as-is), and a mono 16-bit copy for analysis.
    ffmpeg(["-i", src, ...trim, "-c:a", "pcm_s16le", clip]);
    const mono = path.join(genDir, `${key}.mono.wav`);
    ffmpeg(["-i", clip, "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", mono]);
    const durationMs = wavDurationMs(mono);
    const offset = a.startMs ?? 0;
    let words;
    let source: PreparedLine["source"]["words"];
    if (a.words?.length) {
      words = alignWords(b.line!, durationMs, a.words.map((w) => ({ text: w.text, startMs: w.startMs - offset, endMs: w.endMs === undefined ? undefined : w.endMs - offset })));
      source = "manual";
    } else if (whisper) {
      const w16 = path.join(genDir, `${key}.16k.wav`);
      ffmpeg(["-i", clip, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", w16]);
      try {
        words = alignWords(b.line!, durationMs, parseWhisperJson(runWhisper(whisper, w16, path.join(genDir, key))));
        source = "whisper" as const;
      } catch (e) {
        ctx.warnings.push(`Beat "${b.id}": Whisper failed (${e instanceof Error ? e.message : e}); word timings estimated.`);
      }
      fs.rmSync(w16, { force: true });
    }
    if (!words) {
      words = estimateWordsInSpans(b.line!, speechSpans(mono), durationMs);
      source = "estimated";
    }
    const mouthCues = ctx.rhubarb ? runRhubarb(ctx.rhubarb, mono, b.line!, genDir).cues : estimateMouthCues(words);
    fs.rmSync(mono);
    const prepared: PreparedLine = {
      id: b.id,
      speaker: b.speaker,
      text: b.line!,
      audio: path.posix.join("skits", ctx.skitId, "generated/clips", path.basename(clip)),
      durationMs,
      words,
      mouthCues,
      source: { words: source!, mouth: ctx.rhubarb ? "rhubarb" : "estimated" },
    };
    fs.writeFileSync(cached, JSON.stringify(prepared, null, 1));
    return prepared;
  });
  if (lines.some((l) => l.source.words === "estimated") && !whisper)
    ctx.warnings.push("Word timings for file-audio beats are ESTIMATED (set WHISPER_MODEL + whisper-cli, or give audio.words).");
  return { lines, hits };
};
