/** Tiny deterministic DSP kit for `scripts/sfx-gen.ts`: oscillators, noise, biquads, WAV out. */
import fs from "node:fs";

export const SR = 44100;
export type Sig = Float32Array;

export const buf = (seconds: number): Sig => new Float32Array(Math.round(seconds * SR));
export const time = (i: number) => i / SR;

/** Seeded PRNG (mulberry32) → white noise in [-1, 1]. */
export const noise = (seconds: number, seed: number): Sig => {
  let a = seed >>> 0;
  const out = buf(seconds);
  for (let i = 0; i < out.length; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  return out;
};

export type Wave = "sine" | "saw" | "square" | "tri";
const shape = (w: Wave, ph: number): number => {
  const p = ph - Math.floor(ph);
  if (w === "sine") return Math.sin(2 * Math.PI * p);
  if (w === "saw") return 2 * p - 1;
  if (w === "square") return p < 0.5 ? 1 : -1;
  return 1 - 4 * Math.abs(p - 0.5);
};

/** Oscillator with a time-varying frequency (Hz). */
export const osc = (seconds: number, freq: (t: number) => number, wave: Wave = "sine"): Sig => {
  const out = buf(seconds);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = shape(wave, ph);
    ph += freq(time(i)) / SR;
  }
  return out;
};

/** Multiply by an envelope function of time. */
export const env = (s: Sig, f: (t: number) => number): Sig => s.map((v, i) => v * f(time(i)));

/** RBJ biquad with a time-varying cutoff (recomputed every 16 samples). */
export const filter = (s: Sig, kind: "lp" | "hp" | "bp", cutoff: (t: number) => number, q = 0.707): Sig => {
  const out = new Float32Array(s.length);
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < s.length; i++) {
    if (i % 16 === 0) {
      const w = (2 * Math.PI * Math.min(cutoff(time(i)), SR * 0.45)) / SR;
      const alpha = Math.sin(w) / (2 * q);
      const cw = Math.cos(w);
      const a0 = 1 + alpha;
      if (kind === "lp") [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
      else if (kind === "hp") [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
      else [b0, b1, b2] = [alpha, 0, -alpha];
      [b0, b1, b2, a1, a2] = [b0 / a0, b1 / a0, b2 / a0, (-2 * cw) / a0, (1 - alpha) / a0];
    }
    const x = s[i]!;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    [x2, x1, y2, y1] = [x1, x, y1, y];
    out[i] = y;
  }
  return out;
};

/** Sum signals, each optionally delayed (s) and scaled. */
export const mix = (seconds: number, ...parts: [Sig, number?, number?][]): Sig => {
  const out = buf(seconds);
  for (const [s, gain = 1, delay = 0] of parts) {
    const off = Math.round(delay * SR);
    for (let i = 0; i < s.length && i + off < out.length; i++) out[i + off]! += s[i]! * gain;
  }
  return out;
};

export const saturate = (s: Sig, drive: number): Sig => s.map((v) => Math.tanh(v * drive) / Math.tanh(drive));

/** Exponential decay envelope with a short linear attack. */
export const perc = (attack: number, decay: number) => (t: number) => (t < attack ? t / attack : Math.exp(-(t - attack) * decay));

/** Normalize to a peak, fade the edges (no clicks), write 16-bit mono PCM. Returns duration in ms. */
export const writeWav = (file: string, s: Sig, peak = 0.89): number => {
  const fade = Math.round(0.004 * SR);
  let max = 0;
  for (const v of s) max = Math.max(max, Math.abs(v));
  const k = max > 0 ? peak / max : 1;
  const data = Buffer.alloc(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const edge = Math.min(1, i / fade, (s.length - 1 - i) / fade);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s[i]! * k * edge)) * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
  return Math.round((s.length / SR) * 1000);
};
