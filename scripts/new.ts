/**
 * New skit from a template (plan M6): pnpm new <skitId> [--template=exchange] [--force]
 *   Without public/skits/<skitId>/premise.json: writes a placeholder premise for the template
 *   (exchange, interview, me-vs-me, pov-monologue, text-slam) for a human to fill in.
 *   With premise.json: stages it into a draft skit.json (never overwrites without --force).
 * Then: pnpm direct <skitId> (--say for dev voices), or hand the skit to the skit-director skill.
 */
import fs from "node:fs";
import path from "node:path";
import { formatDiagnostics, fromPremise, SkitError, TEMPLATES } from "../src/engine";
import { library, sets } from "../src/data";
import { skitDir } from "./lib/skit";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
if (!id || !/^[a-z0-9_-]+$/.test(id)) {
  console.error(`usage: pnpm new <skitId> [--template=${TEMPLATES.join("|")}] [--force]   (skitId: lowercase, digits, - and _)`);
  process.exit(1);
}
const dir = skitDir(id);
const premisePath = path.join(dir, "premise.json");
const skitPath = path.join(dir, "skit.json");
const rel = (p: string) => path.relative(ROOT, p);

if (!fs.existsSync(premisePath)) {
  const template = flag("template") ?? "exchange";
  if (!(TEMPLATES as readonly string[]).includes(template)) {
    console.error(`unknown template "${template}"; one of ${TEMPLATES.join(", ")}`);
    process.exit(1);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "src/data/templates", `${template}.json`), premisePath);
  console.log(`wrote ${rel(premisePath)} (${template}). Write the lines (humans write the jokes), then run: pnpm new ${id}`);
  process.exit(0);
}
if (fs.existsSync(skitPath) && !args.includes("--force")) {
  console.error(`${rel(skitPath)} exists; pass --force to re-stage it from the premise (this discards edits to skit.json)`);
  process.exit(1);
}
try {
  const skit = fromPremise(JSON.parse(fs.readFileSync(premisePath, "utf8")), library, sets);
  fs.writeFileSync(skitPath, JSON.stringify(skit, null, 2) + "\n");
  console.log(`wrote ${rel(skitPath)} (${skit.beats?.length} beats). Next: pnpm direct ${id} [--say]`);
} catch (e) {
  console.error(`${rel(premisePath)}: ${e instanceof SkitError ? formatDiagnostics(e.diagnostics) : e}`);
  process.exit(1);
}
