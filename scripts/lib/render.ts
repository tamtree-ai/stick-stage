/** Render helpers for the scripts (`pnpm render`, `pnpm direct`, `pnpm batch`). */
import path from "node:path";
import { needsPrep } from "../../src/node";
import { prepSkit } from "./prep";
import { BACKEND, ROOT, WS } from "./tools";

/** Prep the voice / clips if there are any (cached). Returns warnings. */
export const prepIfVoiced = (id: string, log: (s: string) => void = console.log): string[] => {
  if (!needsPrep(WS, id)) return [];
  const r = prepSkit(id);
  log(`prep: ${r.voice.lines.length} lines, cache ${r.hits}/${r.voice.lines.length} hits, mouths: ${r.mouthTool}`);
  return r.warnings;
};

export type RenderOptions = { debug?: boolean; frames?: [number, number]; out?: string; quiet?: boolean };

export const renderSkitMp4 = async (id: string, o: RenderOptions = {}): Promise<string> => {
  const out = path.resolve(o.out ?? path.join(ROOT, "out", `${id}${o.debug ? "-debug" : ""}.mp4`));
  let last = -1;
  await BACKEND.renderSkit(id, out, {
    debug: o.debug,
    frames: o.frames,
    onProgress: (p) => {
      const pct = Math.floor(p * 10) * 10;
      if (!o.quiet && pct !== last) process.stdout.write(`${(last = pct)}% `);
    },
  });
  if (!o.quiet) process.stdout.write("\n");
  return out;
};
