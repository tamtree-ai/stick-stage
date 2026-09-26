/**
 * Self-check a skit (plan M5): pnpm check <skitId> [--json]
 * Preps (cached), compiles, then checks the story rules (punchline camera event, reaction after the punchline,
 * emotion close-ups within budget, one thing at a time) and visual QA (faces in the safe area,
 * overlays not covering faces, contrast). Writes `generated/check.json`. Exits 1 on errors.
 */
import { prepIfVoiced } from "./lib/render";
import { checkSkitDir, compileSkitDir, isSkit } from "./lib/skit";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id || !isSkit(id)) {
  console.error(`usage: pnpm check <skitId> [--json]${id ? `  (no public/skits/${id}/skit.json)` : ""}`);
  process.exit(1);
}
const json = args.includes("--json");
for (const w of prepIfVoiced(id, json ? () => undefined : console.log)) console.warn(`WARNING: ${w}`);
const r = checkSkitDir(id, compileSkitDir(id), json);
if (json) console.log(JSON.stringify(r, null, 1));
process.exit(r.ok ? 0 : 1);
