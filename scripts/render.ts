/**
 * Render: pnpm render <skitId> [out.mp4] [--frames=a-b] [--debug]
 *   prepare (voice → mouths + word timings, cached) → compile (diagnostics) → render MP4.
 *   Default output: out/<skitId>.mp4 (`--debug` burns in beat/shot labels: out/<skitId>-debug.mp4).
 * Anything that isn't a skit id is passed through to `remotion render` (labs):
 *   pnpm render TalkLabClean out/TalkLabClean.mp4
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { prepSkit } from "./lib/prep";
import { compileSkitDir, isSkit, skitDir, summarize } from "./lib/skit";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const [id, outArg] = args.filter((a) => !a.startsWith("--"));
const flag = (k: string) => args.find((a) => a === `--${k}` || a.startsWith(`--${k}=`))?.split("=")[1] ?? (args.includes(`--${k}`) ? "true" : undefined);

if (!id || !isSkit(id)) {
  execFileSync(path.join(ROOT, "node_modules/.bin/remotion"), ["render", "src/app/index.ts", ...args], { stdio: "inherit", cwd: ROOT });
  process.exit(0);
}

const debug = flag("debug") !== undefined;
if (fs.existsSync(path.join(skitDir(id), "voice.json"))) {
  const r = prepSkit(id);
  for (const w of r.warnings) console.warn(`WARNING: ${w}`);
  console.log(`prep: ${r.voice.lines.length} lines, cache ${r.hits}/${r.voice.lines.length} hits, mouths: ${r.mouthTool}`);
}
const { timeline } = compileSkitDir(id);
console.log(summarize(timeline));

const out = path.resolve(outArg ?? path.join(ROOT, "out", `${id}${debug ? "-debug" : ""}.mp4`));
const frames = flag("frames")?.split("-").map(Number) as [number, number] | undefined;
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/app/index.ts") });
const inputProps = { skit: id, showLabels: debug };
const composition = await selectComposition({ serveUrl, id: debug ? "SkitDebug" : "Skit", inputProps });
fs.mkdirSync(path.dirname(out), { recursive: true });
let last = -1;
await renderMedia({
  serveUrl,
  composition,
  inputProps,
  codec: "h264",
  outputLocation: out,
  frameRange: frames && frames.length === 2 ? frames : null,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== last) process.stdout.write(`${(last = pct)}% `);
  },
});
console.log(`\n${path.relative(ROOT, out)}`);
