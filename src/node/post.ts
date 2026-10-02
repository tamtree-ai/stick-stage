/** Post-ready files next to a rendered MP4: subtitles, the post caption and a manifest of what was rendered. */
import fs from "node:fs";
import path from "node:path";
import { approvalStatus, contentHash, imagesOfSkit, isScienceSkit, postText, programSrt, sourcesText, type CheckReport, type ImageDef, type Library, type Program, type SkitDoc } from "../engine/core";

export type PostManifest = {
  skit: string;
  title: string;
  hash?: string;
  durationSec: number;
  scenes: number;
  check?: { ok: boolean; errors: number; warnings: number };
  syntheticVoices?: boolean;
  reminder?: string;
  /** Present when the skit names a season and episode. The harness can pass these to YouTube. */
  series?: { id: string; season: number; episode: number };
  /** Science skits: who approved it, and whether the content still matches that approval. */
  approval?: { approvedBy?: string; contentHash: string; current: boolean };
};

export const postManifest = (o: { skit: string; doc: SkitDoc; program: Program; report?: CheckReport; hash?: string; raw?: unknown }): PostManifest => ({
  skit: o.skit,
  title: o.doc.meta.title,
  hash: o.hash,
  durationSec: +(o.program.durationInFrames / o.program.fps).toFixed(2),
  scenes: o.program.scenes.length,
  check: o.report && { ok: o.report.ok, errors: o.report.errors, warnings: o.report.warnings },
  syntheticVoices: o.doc.meta.syntheticVoices,
  reminder: o.doc.meta.syntheticVoices ? "Tick the platform's AI-generated / synthetic-media label when posting." : undefined,
  ...(o.doc.meta.series ? { series: o.doc.meta.series } : {}),
  ...(isScienceSkit(o.doc) && o.raw !== undefined
    ? { approval: { approvedBy: o.doc.approval?.approvedBy, contentHash: contentHash(o.raw), current: approvalStatus(o.raw).ok } }
    : {}),
});

/**
 * Writes `<base>.txt` (post caption), `<base>.srt` (script-exact subtitles), `<base>.json` (manifest)
 * and, for a skit with claims or images, `<base>.sources.txt` (sources, simplifications, credits).
 */
export const writePostFiles = (
  base: string,
  o: Parameters<typeof postManifest>[0] & { lib: Library; images?: Readonly<Record<string, ImageDef>> },
): { txt: string; srt: string; json: string; sources?: string } => {
  fs.mkdirSync(path.dirname(base), { recursive: true });
  const files: { txt: string; srt: string; json: string; sources?: string } = { txt: `${base}.txt`, srt: `${base}.srt`, json: `${base}.json` };
  const used = imagesOfSkit(o.doc).flatMap((id) => (o.images?.[id] ? [o.images[id]] : []));
  const sources = sourcesText(o.doc, used);
  if (sources) {
    files.sources = `${base}.sources.txt`;
    fs.writeFileSync(files.sources, sources);
  }
  fs.writeFileSync(files.txt, postText(o.doc, o.lib));
  fs.writeFileSync(files.srt, programSrt(o.program, o.doc.narrator?.name));
  fs.writeFileSync(files.json, JSON.stringify(postManifest(o), null, 2) + "\n");
  return files;
};
