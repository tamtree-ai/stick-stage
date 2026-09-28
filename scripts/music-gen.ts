/**
 * One original music bed: pnpm music
 *
 * A quiet pentatonic loop, synthesized in code (deterministic, CC0), ducked under dialog.
 * This is one stem, not a library.
 */
import fs from "node:fs";
import path from "node:path";
import { MusicManifestSchema, type MusicManifest } from "../src/engine";
import { env, mix, osc, writeWav, type Sig } from "./lib/synth";
import { ROOT } from "./lib/tools";

const SOURCE = "synthesized in code by scripts/music-gen.ts (StickStage, original)";
const LICENSE = "CC0-1.0";

const bed = (): Sig => {
  const notes = [261.63, 293.66, 329.63, 392, 329.63, 293.66];
  const len = 1.4;
  const T = notes.length * len;
  const parts = notes.map((hz, i): [Sig, number, number] => {
    const tone = env(osc(len, () => hz, "sine"), (t) => Math.sin((Math.PI * t) / len) ** 1.4);
    const fifth = env(osc(len, () => hz * 1.5, "sine"), (t) => 0.25 * Math.sin((Math.PI * t) / len));
    return [mix(len, [tone, 0.7], [fifth, 0.3]), 1, i * len];
  });
  return mix(T, ...parts);
};

const outDir = path.join(ROOT, "public/music");
const manifestPath = path.join(ROOT, "src/data/music.json");
fs.mkdirSync(outDir, { recursive: true });
const file = "music/room.wav";
const durationMs = writeWav(path.join(ROOT, "public", file), bed());
const manifest: MusicManifest = {
  schemaVersion: 1,
  beds: [{ id: "room", file, durationMs, gain: 0.18, ducked: 0.05, license: LICENSE, source: SOURCE }],
};
fs.writeFileSync(manifestPath, JSON.stringify(MusicManifestSchema.parse(manifest), null, 2) + "\n");
console.log(`music: room ${durationMs} ms → public/${file}`);
