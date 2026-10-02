/**
 * SFX library: pnpm sfx
 *
 * Synthesizes the comedy stings in code (deterministic, same bytes every run) into
 * `public/sfx/*.wav` and updates `src/data/sfx.json`. Like the set kit, the sounds are made in
 * code, so they are our own work (CC0). Entries in the manifest that this script didn't make
 * (licensed third-party files added by hand) are kept.
 */
import fs from "node:fs";
import path from "node:path";
import { SfxManifestSchema, type SfxManifest } from "../src/engine";
import { buf, env, filter, mix, noise, osc, perc, saturate, SR, time, writeWav, type Sig } from "./lib/synth";
import { ROOT } from "./lib/tools";
import { SCIENCE_SOUNDS } from "./lib/sfx-science";

const SOURCE = "synthesized in code by scripts/sfx-gen.ts (StickStage, original)";
const LICENSE = "CC0-1.0";

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

type Sound = { id: string; gain: number; tags: string[]; make: () => Sig };

const SOUNDS: Sound[] = [
  {
    id: "pop",
    gain: 0.7,
    tags: ["appear", "small"],
    make: () => mix(0.14, [env(osc(0.14, (t) => 250 + 1100 * Math.exp(-t * 45)), perc(0.001, 40))], [env(noise(0.01, 1), perc(0.0005, 600)), 0.3]),
  },
  {
    id: "boing",
    gain: 0.75,
    tags: ["hop", "silly"],
    make: () => {
      const f = (t: number) => 170 * (1 + 0.32 * Math.sin(2 * Math.PI * 12 * t) * Math.exp(-3 * t)) * (1 + 0.5 * t);
      return env(mix(0.8, [osc(0.8, f)], [osc(0.8, (t) => 2 * f(t), "tri"), 0.25]), perc(0.004, 3.8));
    },
  },
  {
    id: "whoosh",
    gain: 0.7,
    tags: ["move", "transition"],
    make: () => {
      const T = 0.55;
      const n = filter(noise(T, 2), "bp", (t) => 350 + 2600 * Math.sin((Math.PI * t) / T) ** 2, 1.4);
      return env(n, (t) => Math.sin((Math.PI * t) / T) ** 1.5);
    },
  },
  {
    id: "swish",
    gain: 0.6,
    tags: ["move", "gesture"],
    make: () => {
      const T = 0.22;
      return env(filter(noise(T, 3), "bp", (t) => 1500 + 4000 * (t / T), 1.8), (t) => Math.sin((Math.PI * t) / T) ** 2);
    },
  },
  {
    id: "zip",
    gain: 0.6,
    tags: ["move", "slide"],
    make: () => {
      const T = 0.26;
      const n = filter(noise(T, 4), "bp", (t) => 800 * Math.pow(6, t / T), 3);
      const tone = osc(T, (t) => 420 * Math.pow(4, t / T), "tri");
      return env(mix(T, [n], [tone, 0.15]), (t) => Math.min(1, t / 0.02) * (1 - t / T));
    },
  },
  {
    id: "record-scratch",
    gain: 0.8,
    tags: ["interrupt", "awkward"],
    make: () => {
      // Scrub a busy "record" back and forth: playback speed follows the hand.
      const src = mix(3, [filter(noise(3, 5), "bp", () => 900, 0.8)], [osc(3, () => 220, "saw"), 0.35], [osc(3, () => 330, "saw"), 0.25]);
      const T = 0.6;
      const out = buf(T);
      let pos = SR * 1.5;
      for (let i = 0; i < out.length; i++) {
        const t = time(i);
        const v = t < 0.16 ? 4.5 * Math.sin((Math.PI * t) / 0.16) : -2.5 * Math.sin((Math.PI * (t - 0.16)) / (T - 0.16));
        pos += v;
        const j = Math.floor(pos);
        out[i] = (src[j]! * (1 - (pos - j)) + src[j + 1]! * (pos - j)) * Math.min(1, Math.abs(v) / 0.6);
      }
      return saturate(filter(out, "hp", () => 180), 1.8);
    },
  },
  {
    id: "boom",
    gain: 0.85,
    tags: ["hit", "dramatic"],
    make: () => {
      const T = 1.5;
      const body = env(osc(T, (t) => 46 + 95 * Math.exp(-t * 16)), perc(0.003, 2.1));
      const thump = env(filter(noise(0.2, 6), "lp", () => 400), perc(0.001, 28));
      return saturate(mix(T, [body], [thump, 0.6]), 2.6);
    },
  },
  {
    id: "ding",
    gain: 0.55,
    tags: ["idea", "correct"],
    make: () => {
      const T = 1.4;
      const partials: [number, number, number][] = [[1, 1, 2.6], [2, 0.3, 4], [2.76, 0.45, 5], [5.4, 0.2, 8]];
      return mix(T, ...partials.map(([r, a, d]) => [env(osc(T, () => 1318 * r), perc(0.002, d)), a] as [Sig, number]));
    },
  },
  {
    id: "buzzer",
    gain: 0.5,
    tags: ["wrong", "fail"],
    make: () => filter(mix(0.7, [osc(0.7, () => 120, "square")], [osc(0.7, () => 127, "square")]), "lp", () => 1800),
  },
  {
    id: "crickets",
    gain: 0.6,
    tags: ["silence", "awkward"],
    make: () => {
      const T = 2.4;
      const cricket = (hz: number, period: number, offset: number, seed: number) =>
        env(osc(T, () => hz), (t) => {
          const c = (t - offset) % period;
          if (t < offset || c > 0.1) return 0;
          const p = c % 0.032;
          return p < 0.02 ? Math.sin((Math.PI * p) / 0.02) * (0.85 + 0.15 * Math.sin(seed + t)) : 0;
        });
      return mix(T, [cricket(4700, 0.55, 0.05, 1)], [cricket(4350, 0.63, 0.3, 2), 0.6], [filter(noise(T, 7), "lp", () => 500), 0.05]);
    },
  },
  {
    id: "rimshot",
    gain: 0.75,
    tags: ["joke", "punchline"],
    make: () => {
      const T = 1.4;
      const tom = (hi: number, lo: number) =>
        mix(0.3, [env(osc(0.3, (t) => lo + (hi - lo) * Math.exp(-t * 20)), perc(0.001, 14))], [env(noise(0.02, 8), perc(0.0005, 300)), 0.3]);
      const metal = mix(T, ...[205, 304, 369, 522, 540, 800].map((f) => [osc(T, () => f * 4.1, "square"), 0.15] as [Sig, number]));
      const cym = env(filter(mix(T, [filter(noise(T, 9), "hp", () => 6500)], [metal, 0.6]), "hp", () => 5000), perc(0.002, 2.4));
      return mix(T, [tom(210, 140)], [tom(160, 100), 1, 0.17], [cym, 0.5, 0.42]);
    },
  },
  ...(["up", "down"] as const).map(
    (dir): Sound => ({
      id: `slide-${dir}`,
      gain: 0.55,
      tags: ["silly", dir === "up" ? "rise" : "fall"],
      make: () => {
        const T = 0.6;
        const f = (t: number) => 520 * Math.pow(2, 1.8 * (dir === "up" ? ease(t / T) : 1 - ease(t / T))) * (1 + 0.015 * Math.sin(2 * Math.PI * 6 * t));
        return env(mix(T, [osc(T, f)], [filter(noise(T, 10), "bp", f, 6), 0.3]), (t) => Math.min(1, t / 0.03, (T - t) / 0.08));
      },
    }),
  ),
  {
    id: "sad-trombone",
    gain: 0.6,
    tags: ["fail", "sad"],
    make: () => {
      const notes: [number, number, number][] = [[0, 0.42, 293.66], [0.45, 0.42, 277.18], [0.9, 0.42, 261.63], [1.35, 1.0, 246.94]];
      const T = 2.4;
      const parts = notes.map(([at, len, hz], k): [Sig, number, number] => {
        const last = k === notes.length - 1;
        const tone = osc(len, (t) => hz * (1 + (last ? 0.02 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t / 0.3) : 0)), "saw");
        const wah = filter(tone, "lp", (t) => 300 + 1200 * Math.sin(Math.PI * Math.min(1, t / (last ? 0.5 : len))), 2.5);
        return [env(wah, (t) => Math.min(1, t / 0.03, (len - t) / 0.06)), 1, at];
      });
      return mix(T, ...parts);
    },
  },
  {
    id: "thud",
    gain: 0.8,
    tags: ["fall", "hit"],
    make: () => mix(0.35, [env(osc(0.35, (t) => 45 + 45 * Math.exp(-t * 25)), perc(0.002, 12))], [env(filter(noise(0.1, 11), "lp", () => 600), perc(0.001, 40)), 0.5]),
  },
  {
    id: "laugh",
    gain: 0.55,
    tags: ["sitcom", "punchline"],
    make: () => {
      const bursts: [number, number][] = [[0, 220], [0.18, 196], [0.36, 247], [0.52, 185]];
      const T = 0.75;
      const parts = bursts.map(([at, hz]) => {
        const tone = env(osc(0.16, () => hz), perc(0.012, 12));
        const air = env(filter(noise(0.14, 4), "bp", () => 1200, 1.4), perc(0.004, 16));
        return [mix(0.16, [tone, 0.65], [air, 0.4]), 0.8, at] as [Sig, number, number];
      });
      return mix(T, ...parts);
    },
  },
  {
    id: "sparkle",
    gain: 0.45,
    tags: ["idea", "magic"],
    make: () => {
      const T = 0.9;
      const bell = (hz: number) => mix(0.5, [env(osc(0.5, () => hz), perc(0.002, 7))], [env(osc(0.5, () => hz * 2.76), perc(0.002, 12)), 0.3]);
      return mix(T, ...[1568, 1976, 2349, 3136].map((hz, i) => [bell(hz), 1, i * 0.07] as [Sig, number, number]));
    },
  },
  ...SCIENCE_SOUNDS,
];

const outDir = path.join(ROOT, "public/sfx");
const manifestPath = path.join(ROOT, "src/data/sfx.json");
fs.mkdirSync(outDir, { recursive: true });
const old: SfxManifest = fs.existsSync(manifestPath)
  ? SfxManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")))
  : { schemaVersion: 1, sounds: [] };

const made = SOUNDS.map((s) => {
  const file = `sfx/${s.id}.wav`;
  const durationMs = writeWav(path.join(ROOT, "public", file), s.make());
  return { id: s.id, file, durationMs, gain: s.gain, license: LICENSE, source: SOURCE, tags: s.tags };
});
const kept = old.sounds.filter((s) => s.source !== SOURCE && !made.some((m) => m.id === s.id));
const manifest: SfxManifest = { schemaVersion: 1, sounds: [...made, ...kept] };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`sfx: ${made.length} synthesized, ${kept.length} kept → public/sfx/, src/data/sfx.json`);
