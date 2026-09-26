/**
 * Runs the prepare step in its own process (`node [loader] prep-child.ts <root> <skitId> [--require-lipsync]`).
 * Prep shells out to ffmpeg and Rhubarb synchronously; in a child it can't stall the HTTP server.
 * Prints one JSON line: `{ ok, lines, hits, mouthTool, warnings }` or `{ ok: false, message }`.
 */
import { prepSkit, workspace } from "../node";

const [root, skitId, ...flags] = process.argv.slice(2);
try {
  if (!root || !skitId) throw new Error("usage: prep-child <root> <skitId> [--require-lipsync]");
  const r = prepSkit(workspace(root), skitId, { requireLipSync: flags.includes("--require-lipsync") });
  console.log(JSON.stringify({ ok: true, lines: r.voice.lines.length, hits: r.hits, mouthTool: r.mouthTool, warnings: r.warnings }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, message: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
