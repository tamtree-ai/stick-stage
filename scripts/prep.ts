/**
 * Prepare step: pnpm prep <skitId> [--require-rhubarb]
 *
 * Reads `public/skits/<skitId>/voice.json` (audio + optional word timings, produced by the
 * tamtree harness or `pnpm voice:say`), then per line: aligns word timings to the script
 * text and runs Rhubarb for mouth cues. Results are cached by content hash in
 * `generated/cache/`, so a re-run with unchanged inputs does no work. No network.
 * Writes `generated/voice.prepared.json` for the render.
 */
import { prepSkit } from "./lib/prep";

const args = process.argv.slice(2);
const skitId = args.find((a) => !a.startsWith("--"));
if (!skitId) {
  console.error("usage: pnpm prep <skitId> [--require-rhubarb]");
  process.exit(1);
}
try {
  const r = prepSkit(skitId, { requireRhubarb: args.includes("--require-rhubarb") });
  for (const w of r.warnings) console.warn(`WARNING: ${w}`);
  const n = r.voice.lines.length;
  console.log(`prep ${skitId}: ${n} lines, cache ${r.hits}/${n} hits, mouths: ${r.mouthTool}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
