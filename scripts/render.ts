/**
 * Render: pnpm render <skitId> [out.mp4] [--frames=a-b] [--debug]
 *   prepare (voice → mouths + word timings, cached) → compile (diagnostics) → render MP4.
 *   Default output: out/<skitId>.mp4 (`--debug` burns in beat/shot labels: out/<skitId>-debug.mp4).
 * Anything that isn't a skit id is passed through to `remotion render` (labs):
 *   pnpm render TalkLabClean out/TalkLabClean.mp4
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { prepIfVoiced, renderSkitMp4 } from "./lib/render";
import { compileSkitDir, isSkit, summarize } from "./lib/skit";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const [id, outArg] = args.filter((a) => !a.startsWith("--"));
const flag = (k: string) => args.find((a) => a === `--${k}` || a.startsWith(`--${k}=`))?.split("=")[1] ?? (args.includes(`--${k}`) ? "true" : undefined);

if (!id || !isSkit(id)) {
  execFileSync(path.join(ROOT, "node_modules/.bin/remotion"), ["render", "src/app/index.ts", ...args], { stdio: "inherit", cwd: ROOT });
  process.exit(0);
}

for (const w of prepIfVoiced(id)) console.warn(`WARNING: ${w}`);
console.log(summarize(compileSkitDir(id).program));
const frames = flag("frames")?.split("-").map(Number) as [number, number] | undefined;
const out = await renderSkitMp4(id, { debug: flag("debug") !== undefined, frames: frames?.length === 2 ? frames : undefined, out: outArg });
console.log(path.relative(ROOT, out));
