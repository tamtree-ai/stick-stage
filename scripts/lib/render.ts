/** Render a compiled skit to MP4 (shared by `pnpm render`, `pnpm direct` and `pnpm batch`). */
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { prepSkit } from "./prep";
import { serveUrl } from "./sheet";
import { skitDir } from "./skit";
import { ROOT } from "./tools";

/** Prep the voice if there is any (cached). Returns warnings. */
export const prepIfVoiced = (id: string, log = console.log): string[] => {
  const dir = skitDir(id);
  const skit = JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8"));
  const needsFileAudio = JSON.stringify(skit).includes('"source":"file"') || JSON.stringify(skit).includes('"source": "file"');
  if (!fs.existsSync(path.join(dir, "voice.json")) && !needsFileAudio) return [];
  const r = prepSkit(id);
  log(`prep: ${r.voice.lines.length} lines, cache ${r.hits}/${r.voice.lines.length} hits, mouths: ${r.mouthTool}`);
  return r.warnings;
};

export type RenderOptions = { debug?: boolean; frames?: [number, number]; out?: string; quiet?: boolean };

export const renderSkitMp4 = async (id: string, o: RenderOptions = {}): Promise<string> => {
  const out = path.resolve(o.out ?? path.join(ROOT, "out", `${id}${o.debug ? "-debug" : ""}.mp4`));
  const url = await serveUrl();
  const inputProps = { skit: id, showLabels: !!o.debug };
  const composition = await selectComposition({ serveUrl: url, id: o.debug ? "SkitDebug" : "Skit", inputProps });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let last = -1;
  await renderMedia({
    serveUrl: url,
    composition,
    inputProps,
    codec: "h264",
    outputLocation: out,
    frameRange: o.frames ?? null,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (!o.quiet && pct !== last) process.stdout.write(`${(last = pct)}% `);
    },
  });
  if (!o.quiet) process.stdout.write("\n");
  return out;
};
