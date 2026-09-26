/** Minimal PCM WAV reading for the prepare step (duration, silence detection). */
import fs from "node:fs";
import type { Span } from "../../src/engine";

type Pcm = { rate: number; channels: number; bits: number; data: Buffer };

const readWav = (file: string): Pcm => {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${file}: not a WAV file`);
  let fmt: Omit<Pcm, "data"> | undefined;
  for (let at = 12; at + 8 <= b.length; ) {
    const id = b.toString("ascii", at, at + 4);
    const size = b.readUInt32LE(at + 4);
    if (id === "fmt ") fmt = { channels: b.readUInt16LE(at + 10), rate: b.readUInt32LE(at + 12), bits: b.readUInt16LE(at + 22) };
    if (id === "data" && fmt) return { ...fmt, data: b.subarray(at + 8, Math.min(b.length, at + 8 + size)) };
    at += 8 + size + (size % 2);
  }
  throw new Error(`${file}: no fmt/data chunk`);
};

export const wavDurationMs = (file: string): number => {
  const w = readWav(file);
  return Math.round((w.data.length / (w.rate * w.channels * (w.bits / 8))) * 1000);
};

/**
 * Spoken spans of a mono 16-bit WAV: 10 ms RMS windows above −32 dB of the loudest window,
 * bridging gaps shorter than `minPauseMs`, dropping blips shorter than 60 ms.
 */
export const speechSpans = (file: string, minPauseMs = 140): Span[] => {
  const w = readWav(file);
  if (w.bits !== 16 || w.channels !== 1) throw new Error(`${file}: speechSpans expects mono 16-bit PCM`);
  const win = Math.round(w.rate / 100);
  const n = Math.floor(w.data.length / 2 / win);
  const rms: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < win; j++) {
      const s = w.data.readInt16LE((i * win + j) * 2) / 32768;
      sum += s * s;
    }
    rms.push(Math.sqrt(sum / win));
  }
  const threshold = Math.max(...rms, 1e-6) * 10 ** (-32 / 20);
  const spans: Span[] = [];
  rms.forEach((v, i) => {
    if (v < threshold) return;
    const last = spans[spans.length - 1];
    if (last && i * 10 - last.endMs <= minPauseMs) last.endMs = (i + 1) * 10;
    else spans.push({ startMs: i * 10, endMs: (i + 1) * 10 });
  });
  return spans.filter((s) => s.endMs - s.startMs >= 60);
};
