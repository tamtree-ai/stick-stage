/**
 * Owner sign-off for a science skit: pnpm approve <skitId> --by=<name> [--check]
 *   Lists the claims and simplifications to check. With every claim's `checkedBy` filled in, writes
 *   `approval` (who, today, and the content hash) into skit.json. Any later edit to what the viewer
 *   sees or hears changes the hash, and posting renders refuse the skit until it is approved again.
 *   --check: only report whether the skit is cleared.
 */
import fs from "node:fs";
import path from "node:path";
import { approvalStatus, contentHash, parseSkit, skitLines } from "../src/engine/core";
import { ROOT } from "./lib/tools";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
if (!id) {
  console.error("usage: pnpm approve <skitId> --by=<name> [--check]");
  process.exit(1);
}
const file = path.join(ROOT, "public/skits", id, "skit.json");
const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
const doc = parseSkit(raw);

console.log(`"${doc.meta.title}"\n`);
for (const l of skitLines(doc)) console.log(`  ${l.id.padEnd(5)} ${l.speaker}: ${l.text}${l.spoken ? `  (says: ${l.spoken})` : ""}`);
console.log(`\nClaims:`);
for (const c of doc.claims ?? []) console.log(`  [${c.checkedBy ? `checked by ${c.checkedBy}` : "NOT CHECKED"}] ${c.text}\n      source: ${c.source}${c.beats.length ? `\n      lines: ${c.beats.join(", ")}` : ""}`);
if (!doc.claims?.length) console.log("  (none)");
if (doc.simplifications?.length) console.log(`\nSimplifications:\n${doc.simplifications.map((s) => `  • ${s}`).join("\n")}`);

const status = approvalStatus(raw);
if (args.includes("--check")) {
  console.log(`\n${status.ok ? `cleared: approved by ${status.approvedBy}` : `NOT cleared: ${status.message}`}`);
  process.exit(status.ok ? 0 : 1);
}
const by = flag("by");
if (!by) {
  console.error("\n--by=<name> is required to approve");
  process.exit(1);
}
const unchecked = (doc.claims ?? []).filter((c) => !c.checkedBy);
if (unchecked.length) {
  console.error(`\n${unchecked.length} claim(s) have no "checkedBy". Check each against its source, fill "checkedBy" in skit.json, then approve.`);
  process.exit(1);
}
const approval = { approvedBy: by, hash: contentHash(raw), at: new Date().toISOString().slice(0, 10) };
fs.writeFileSync(file, JSON.stringify({ ...raw, approval }, null, 2) + "\n");
console.log(`\napproved by ${by} (${approval.hash.slice(0, 12)}…). A posting render may now use this skit.`);
