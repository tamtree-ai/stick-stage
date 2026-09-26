/**
 * Validate + compile a skit: pnpm compile <skitId>
 * Prints actionable diagnostics (path, expected, example) or a summary of the director's
 * choices, and writes `generated/timeline.json`. Needs `pnpm prep <skitId>` for spoken beats.
 */
import { compileSkitDir, isSkit, summarize } from "./lib/skit";

const id = process.argv[2];
if (!id || !isSkit(id)) {
  console.error(`usage: pnpm compile <skitId>   (public/skits/<skitId>/skit.json${id ? ` not found for "${id}"` : ""})`);
  process.exit(1);
}
console.log(summarize(compileSkitDir(id).program));
