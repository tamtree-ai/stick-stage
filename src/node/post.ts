/** Post-ready files next to a rendered MP4: subtitles, the post caption and a manifest of what was rendered. */
import fs from "node:fs";
import path from "node:path";
import { postText, programSrt, type CheckReport, type Library, type Program, type SkitDoc } from "../engine/core";

export type PostManifest = {
  skit: string;
  title: string;
  hash?: string;
  durationSec: number;
  scenes: number;
  check?: { ok: boolean; errors: number; warnings: number };
  syntheticVoices?: boolean;
  reminder?: string;
};

export const postManifest = (o: { skit: string; doc: SkitDoc; program: Program; report?: CheckReport; hash?: string }): PostManifest => ({
  skit: o.skit,
  title: o.doc.meta.title,
  hash: o.hash,
  durationSec: +(o.program.durationInFrames / o.program.fps).toFixed(2),
  scenes: o.program.scenes.length,
  check: o.report && { ok: o.report.ok, errors: o.report.errors, warnings: o.report.warnings },
  syntheticVoices: o.doc.meta.syntheticVoices,
  reminder: o.doc.meta.syntheticVoices ? "Tick the platform's AI-generated / synthetic-media label when posting." : undefined,
});

/** Writes `<base>.txt` (post caption), `<base>.srt` (script-exact subtitles) and `<base>.json` (manifest). */
export const writePostFiles = (base: string, o: Parameters<typeof postManifest>[0] & { lib: Library }): { txt: string; srt: string; json: string } => {
  fs.mkdirSync(path.dirname(base), { recursive: true });
  const files = { txt: `${base}.txt`, srt: `${base}.srt`, json: `${base}.json` };
  fs.writeFileSync(files.txt, postText(o.doc, o.lib));
  fs.writeFileSync(files.srt, programSrt(o.program));
  fs.writeFileSync(files.json, JSON.stringify(postManifest(o), null, 2) + "\n");
  return files;
};
