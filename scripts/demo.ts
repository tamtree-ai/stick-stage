/**
 * pnpm demo: render the example skit (public/skits/fine, voices committed) to out/fine.mp4.
 *
 * Needs no TTS, no key and no network after `pnpm bootstrap`. It never fails because of
 * Rhubarb: when Rhubarb is missing or will not run, the mouths are estimated from the words
 * and it says so in one line.
 */
import path from "node:path";
import { DOCTOR_HINT } from "./lib/doctor";
import { prepLocal, renderSkitMp4 } from "./lib/render";
import { compileSkitDir } from "./lib/skit";
import { ROOT } from "./lib/tools";

const ID = "fine";
const started = Date.now();
try {
  prepLocal(ID);
  const { program } = compileSkitDir(ID);
  console.log(`rendering "${ID}" (${(program.durationInFrames / program.fps).toFixed(1)} s of video)…`);
  const out = await renderSkitMp4(ID);
  console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)} s: ${path.relative(ROOT, out)}`);
  console.log(`Next: make your own with pnpm try "<a topic>"`);
} catch (e) {
  console.error(`\nThe demo did not render: ${e instanceof Error ? e.message : e}\n${DOCTOR_HINT}`);
  process.exit(1);
}
