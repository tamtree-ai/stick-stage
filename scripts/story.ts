/**
 * Story episodes (shape tier), from the repo root.
 *
 *   pnpm story prompt "<idea>" [--seconds=60] [--cast=tofu,pim]   system + prompt as JSON
 *   pnpm story draft <id> --reply=<file>                           reply → public/skits/<id>/skit.json
 *   pnpm story draft <id> "<idea>" --model [--seconds=60]          your own model writes it (LOCAL_LLM_*)
 *   pnpm story assets <id>                                         the missing-asset report for a skit
 *
 * A draft is checked like any skit (schema, missing assets, compile with placeholder voices). It
 * is written even when assets are missing, so you can fix it by hand; exit 2 when it can't be used.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkDraft, missingAssets, parseLoose, parseSkit, SkitError, storyPrompt, type MissingAsset, type StoryBrief } from "../src/engine";
import { askModel, modelFromEnv } from "./lib/llm";
import { ROOT } from "./lib/tools";

const catalogSource = { lib: library, sets, sfx: sfxLibrary, reactions, safeArea };
const args = process.argv.slice(2);
const [cmd, ...rest] = args;
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const positional = rest.filter((a) => !a.startsWith("--"));

const briefFrom = (idea: string | undefined): StoryBrief => {
  if (!idea) throw new Error('give the idea in quotes, e.g. pnpm story prompt "Pim learns to swim"');
  const seconds = flag("seconds");
  return { idea, ...(seconds ? { seconds: Number(seconds) } : {}), ...(flag("cast") ? { cast: flag("cast")!.split(",") } : {}), ...(flag("audience") ? { audience: flag("audience") } : {}) };
};

const printAssets = (missing: MissingAsset[]) => {
  if (!missing.length) return console.log("missing assets: none");
  console.log(`missing assets: ${missing.length}`);
  for (const m of missing) console.log(`  ${m.rung.padEnd(5)} ${m.kind} "${m.id}" at ${m.path}: ${m.note}${m.suggestion ? ` → ${m.suggestion}` : ""}`);
};

/** Check a reply and write it. Returns false when it can't be used. */
const land = (id: string, reply: string): boolean => {
  let doc;
  try {
    doc = parseSkit(parseLoose(reply));
  } catch (e) {
    if (e instanceof SkitError) {
      console.error("the reply is not a usable skit:");
      for (const d of e.diagnostics) console.error(`  ✗ ${d.path}: ${d.message}${d.expected ? ` (expected ${d.expected})` : ""}`);
      return false;
    }
    console.error(`the reply is not JSON: ${(e as Error).message}`);
    return false;
  }
  const dir = path.join(ROOT, "public/skits", id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "skit.json"), JSON.stringify(parseLoose(reply), null, 2) + "\n");
  console.log(`wrote public/skits/${id}/skit.json: "${doc.meta.title}", ${doc.scenes?.length ?? 1} scene(s)`);
  printAssets(missingAssets(doc, { lib: library, sets }));
  try {
    const d = checkDraft(parseLoose(reply), catalogSource);
    console.log(`compiles: ~${d.estimatedDurationSec}s with placeholder voices; self-check ${d.check.ok ? "passed" : "has errors"}`);
    for (const f of d.check.findings) console.log(`  ${f.level === "error" ? "✗" : "!"} [${f.check}] ${f.message}`);
    console.log(`next: pnpm voice:tts ${id} && pnpm direct ${id}`);
  } catch (e) {
    if (!(e instanceof SkitError)) throw e;
    console.log("does not compile yet:");
    for (const d of e.diagnostics.filter((x) => x.code !== "voice-missing")) console.log(`  ✗ ${d.path}: ${d.message}${d.expected ? ` (expected ${d.expected})` : ""}`);
  }
  return true;
};

const main = async () => {
  if (cmd === "prompt") return console.log(JSON.stringify(storyPrompt(library, briefFrom(positional[0])), null, 2));
  if (cmd === "assets") {
    const id = positional[0]!;
    const doc = parseSkit(JSON.parse(fs.readFileSync(path.join(ROOT, "public/skits", id, "skit.json"), "utf8")));
    return printAssets(missingAssets(doc, { lib: library, sets }));
  }
  if (cmd === "draft") {
    const id = positional[0];
    if (!id) throw new Error("pnpm story draft <id> --reply=<file> | <id> \"<idea>\" --model");
    if (flag("reply")) return process.exit(land(id, fs.readFileSync(flag("reply")!, "utf8")) ? 0 : 2);
    if (!args.includes("--model")) throw new Error("give --reply=<file>, or --model with an idea");
    const m = modelFromEnv();
    if (!m) throw new Error("set LOCAL_LLM_BASE_URL and LOCAL_LLM_MODEL (see scripts/lib/llm.ts)");
    console.log(`asking ${m.label}…`);
    const reply = await askModel(m, storyPrompt(library, briefFrom(positional[1])), z.record(z.string(), z.unknown()));
    return process.exit(land(id, reply) ? 0 : 2);
  }
  console.error("usage: pnpm story prompt|draft|assets (see scripts/story.ts)");
  process.exit(1);
};

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
