/** External tools used by the prepare step: Rhubarb Lip Sync and Remotion's bundled ffmpeg. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { MOUTH_SHAPES, type MouthCue } from "../../src/engine";

export const ROOT = path.resolve(import.meta.dirname, "../..");

/** RHUBARB_PATH, then `tools/Rhubarb-Lip-Sync-*\/rhubarb`, then `rhubarb` on PATH. */
export const findRhubarb = (): string | undefined => {
  if (process.env.RHUBARB_PATH) return process.env.RHUBARB_PATH;
  const tools = path.join(ROOT, "tools");
  if (fs.existsSync(tools)) {
    for (const d of fs.readdirSync(tools).sort().reverse()) {
      const bin = path.join(tools, d, "rhubarb");
      if (d.startsWith("Rhubarb-Lip-Sync") && fs.existsSync(bin)) return bin;
    }
  }
  try {
    return execFileSync("which", ["rhubarb"], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
};

export const rhubarbVersion = (bin: string): string =>
  execFileSync(bin, ["--version"], { encoding: "utf8" }).match(/\d+\.\d+\.\d+/)?.[0] ?? "unknown";

const RhubarbOut = z.object({
  metadata: z.object({ duration: z.number() }),
  mouthCues: z.array(z.object({ start: z.number(), end: z.number(), value: z.enum(MOUTH_SHAPES) })),
});

/** Run Rhubarb on a 16-bit PCM WAV with the line text as the dialog file. */
export const runRhubarb = (bin: string, wav: string, text: string, tmpDir: string): { durationMs: number; cues: MouthCue[] } => {
  const dialog = path.join(tmpDir, `${path.basename(wav)}.txt`);
  fs.writeFileSync(dialog, text);
  const json = execFileSync(bin, ["-q", "-f", "json", "--extendedShapes", "GHX", "-d", dialog, wav], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const out = RhubarbOut.parse(JSON.parse(json));
  return {
    durationMs: Math.round(out.metadata.duration * 1000),
    cues: out.mouthCues.map((c) => ({ startMs: Math.round(c.start * 1000), endMs: Math.round(c.end * 1000), shape: c.value })),
  };
};

/** Remotion's bundled ffmpeg (no system ffmpeg needed). */
export const ffmpeg = (args: string[]): void => {
  execFileSync(path.join(ROOT, "node_modules/.bin/remotion"), ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "ignore", "inherit"],
  });
};

/** Any audio → mono 16-bit PCM WAV (what Rhubarb reads). */
export const toPcmWav = (input: string, output: string): void =>
  ffmpeg(["-i", input, "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", output]);
