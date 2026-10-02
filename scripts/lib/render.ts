/** Render helpers for the scripts (`pnpm render`, `pnpm direct`, `pnpm batch`). */
import path from "node:path";
import { needsPrep, prepSkit as prepIn, remotionFfmpeg, rhubarb, wavProbe } from "../../src/node";
import { DOCTOR_HINT, rhubarbStatus } from "./doctor";
import { prepSkit } from "./prep";
import { BACKEND, ROOT, WS } from "./tools";

/** Prep the voice / clips if there are any (cached). Returns warnings. */
export const prepIfVoiced = (id: string, log: (s: string) => void = console.log): string[] => {
  if (!needsPrep(WS, id)) return [];
  const r = prepSkit(id);
  log(`prep: ${r.voice.lines.length} lines, cache ${r.hits}/${r.voice.lines.length} hits, mouths: ${r.mouthTool}`);
  return r.warnings;
};

/**
 * Prep for the first-run commands (`pnpm demo`, `pnpm try`): Rhubarb when it runs, else
 * estimated mouths with one line saying so. Never fails because of Rhubarb.
 */
export const prepLocal = (id: string, log: (s: string) => void = console.log) => {
  const lip = rhubarbStatus();
  if (!lip.runs) log(`Rhubarb isn't available here, so the mouths are estimated from the words. ${DOCTOR_HINT}`);
  const r = prepIn(WS, id, { adapters: { normalizer: remotionFfmpeg(WS), probe: wavProbe, lipSync: lip.runs && lip.bin ? rhubarb(lip.bin) : undefined } });
  log(`voices: ${r.voice.lines.length} lines, mouths: ${r.mouthTool}`);
  return r;
};

export type RenderOptions = { debug?: boolean; frames?: [number, number]; out?: string; quiet?: boolean; lang?: string; quality?: "draft" };

export const renderSkitMp4 = async (id: string, o: RenderOptions = {}): Promise<string> => {
  const out = path.resolve(o.out ?? path.join(ROOT, "out", `${id}${o.debug ? "-debug" : ""}.mp4`));
  let last = -1;
  await BACKEND.renderSkit(id, out, {
    debug: o.debug,
    frames: o.frames,
    lang: o.lang,
    ...(o.quality === "draft" ? { scale: 0.5, x264Preset: "ultrafast" as const } : {}),
    onProgress: (p) => {
      const pct = Math.floor(p * 10) * 10;
      if (!o.quiet && pct !== last) process.stdout.write(`${(last = pct)}% `);
    },
  });
  if (!o.quiet) process.stdout.write("\n");
  return out;
};
