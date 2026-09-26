/**
 * Prepare step (library): voice.json → script-aligned word timings + Rhubarb mouth cues per
 * line, cached by content hash in `generated/cache/`; writes `generated/voice.prepared.json`.
 * No network. Used by `pnpm prep` and `pnpm render <skitId>`.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  alignWords,
  estimateWords,
  estimateWordsInSpans,
  estimateMouthCues,
  PreparedLineSchema,
  VoiceManifestSchema,
  type PreparedLine,
  type PreparedVoice,
} from "../../src/engine";
import { speechSpans, wavDurationMs } from "./audio";
import { findRhubarb, rhubarbVersion, ROOT, runRhubarb, toPcmWav } from "./tools";

/** Bump when prepare's output for the same inputs changes, to invalidate the cache. */
const PREP_VERSION = 4;

export type PrepResult = {
  voice: PreparedVoice;
  hits: number;
  mouthTool: string;
  warnings: string[];
};

export const prepSkit = (skitId: string, opts: { requireRhubarb?: boolean } = {}): PrepResult => {
  const skitDir = path.join(ROOT, "public/skits", skitId);
  const genDir = path.join(skitDir, "generated");
  const cacheDir = path.join(genDir, "cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  const manifestPath = path.join(skitDir, "voice.json");
  if (!fs.existsSync(manifestPath))
    throw new Error(
      `No voice manifest at ${path.relative(ROOT, manifestPath)}. Generate voices first (tamtree harness, or pnpm voice:say ${skitId}).`,
    );
  const parsed = VoiceManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  if (!parsed.success)
    throw new Error(
      `Invalid ${path.relative(ROOT, manifestPath)}:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`,
    );

  const warnings: string[] = [];
  const rhubarb = findRhubarb();
  if (!rhubarb) {
    const msg = "Rhubarb not found (set RHUBARB_PATH, put it in tools/, or on PATH).";
    if (opts.requireRhubarb) throw new Error(msg);
    warnings.push(`${msg} Mouths will be ESTIMATED from word timings.`);
  }
  const mouthTool = rhubarb ? `rhubarb ${rhubarbVersion(rhubarb)}` : "estimated";

  let hits = 0;
  const lines: PreparedLine[] = parsed.data.lines.map((line) => {
    const audioPath = path.join(skitDir, line.audio);
    if (!fs.existsSync(audioPath))
      throw new Error(`Line "${line.id}": audio not found at ${path.relative(ROOT, audioPath)}`);
    const key = crypto
      .createHash("sha256")
      .update(fs.readFileSync(audioPath))
      .update(JSON.stringify({ line: { ...line, audio: undefined }, mouthTool, PREP_VERSION }))
      .digest("hex")
      .slice(0, 24);
    const cached = path.join(cacheDir, `${key}.json`);
    if (fs.existsSync(cached)) {
      hits++;
      return PreparedLineSchema.parse(JSON.parse(fs.readFileSync(cached, "utf8")));
    }

    const wav = path.join(genDir, `${key}.wav`);
    toPcmWav(audioPath, wav);
    const durationMs = line.durationMs ?? wavDurationMs(wav);
    const speech = speechSpans(wav);
    const mouthCues = rhubarb ? runRhubarb(rhubarb, wav, line.text, genDir).cues : undefined;
    fs.rmSync(wav);
    const words = line.words?.length
      ? alignWords(line.text, durationMs, line.words)
      : speech
        ? estimateWordsInSpans(line.text, speech, durationMs)
        : estimateWords(line.text, durationMs);
    const prepared: PreparedLine = {
      id: line.id,
      speaker: line.speaker,
      text: line.text,
      audio: path.posix.join("skits", skitId, line.audio),
      durationMs,
      words,
      mouthCues: mouthCues ?? estimateMouthCues(words),
      source: {
        words: line.words?.length ? "tts" : "estimated",
        mouth: rhubarb ? "rhubarb" : "estimated",
      },
    };
    fs.writeFileSync(cached, JSON.stringify(prepared, null, 1));
    return prepared;
  });

  const out: PreparedVoice = { schemaVersion: 1, lines };
  fs.writeFileSync(path.join(genDir, "voice.prepared.json"), JSON.stringify(out, null, 1));
  return { voice: out, hits, mouthTool, warnings };
};
