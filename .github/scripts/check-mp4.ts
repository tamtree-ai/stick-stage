/**
 * CI: the quickstart's video exists and runs as long as the skit says (within 10%).
 *   npx tsx .github/scripts/check-mp4.ts <skitId> [out/<skitId>.mp4]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { compileSkitDir } from "../../scripts/lib/skit";
import { ROOT } from "../../scripts/lib/tools";

const id = process.argv[2]!;
const file = path.resolve(ROOT, process.argv[3] ?? `out/${id}.mp4`);
if (!fs.existsSync(file)) throw new Error(`${file} was not written`);
const { program } = compileSkitDir(id);
const want = program.durationInFrames / program.fps;
const got = Number(execFileSync(path.join(ROOT, "node_modules/.bin/remotion"), ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
console.log(`${path.relative(ROOT, file)}: ${got.toFixed(2)} s, skit ${want.toFixed(2)} s, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
if (!(Math.abs(got - want) <= want * 0.1)) throw new Error(`duration ${got} s is not within 10% of ${want} s`);
