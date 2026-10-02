/**
 * Your own skit, end to end: pnpm try "<topic>" [--id=<skitId>] [--premise=<file>] [--force]
 *
 *   1. The words. With your own model (LOCAL_LLM_BASE_URL + LOCAL_LLM_MODEL) it writes them.
 *      Without one, a two-person premise is staged for you to fill in, as `pnpm new` does,
 *      along with the prompt to paste into any chatbot. Then run `pnpm try <skitId>` again.
 *      `--premise=<file>` uses a premise you already have.
 *   2. Staging: premise.json → skit.json (kept if you edited skit.json since; --force restages).
 *   3. Voices: Kokoro on this computer (scripts/lib/tts.ts). Weights download once, ~90 MB.
 *   4. Render: out/<skitId>.mp4, with Rhubarb mouths when it runs, else estimated ones.
 */
import fs from "node:fs";
import path from "node:path";
import { formatDiagnostics, fromPremise, parseBrief, ReplyError, SkitError, writerWorld } from "../src/engine";
import { castNotes, catalog, library, sets } from "../src/data";
import { DOCTOR_HINT } from "./lib/doctor";
import { draftWithModel, modelFromEnv } from "./lib/llm";
import { prepLocal, renderSkitMp4 } from "./lib/render";
import { compileSkitDir, skitDir } from "./lib/skit";
import { ROOT } from "./lib/tools";
import { ttsFromEnv } from "./lib/tts";
import { voiceSkitDir } from "./lib/voice-tts";

const args = process.argv.slice(2);
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const topic = args.filter((a) => !a.startsWith("--")).join(" ").trim();
if (!topic && !flag("id")) {
  console.error('usage: pnpm try "<a topic>" [--id=<skitId>] [--premise=<file>] [--force]');
  process.exit(1);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "my-skit";
const id = flag("id") ?? slug(topic);
if (!/^[a-z0-9_-]+$/.test(id)) {
  console.error(`"${id}" can't be a skit id: use lowercase letters, digits, - and _`);
  process.exit(1);
}
const dir = skitDir(id);
const premisePath = path.join(dir, "premise.json");
const skitPath = path.join(dir, "skit.json");
const rel = (p: string) => path.relative(ROOT, p);
const TEMPLATE = path.join(ROOT, "src/data/templates/exchange.json");
const brief = { topic: topic || id, cast: [{ id: "milo", character: "milo" }, { id: "june", character: "june" }], template: "exchange" as const };
const world = writerWorld(catalog, castNotes);

/** A premise is still the template while any of its lines is the template's own words. */
const placeholderLines = new Set((JSON.parse(fs.readFileSync(TEMPLATE, "utf8")) as { lines: { text: string }[] }).lines.map((l) => l.text));
const unwritten = (premise: { lines?: { text?: string }[]; scenes?: { lines?: { text?: string }[] }[] }) =>
  [...(premise.lines ?? []), ...(premise.scenes ?? []).flatMap((s) => s.lines ?? [])].some((l) => placeholderLines.has(l.text ?? ""));

const fail = (e: unknown): never => {
  if (e instanceof SkitError) console.error(formatDiagnostics(e.diagnostics));
  else if (e instanceof ReplyError) console.error(`The model's reply could not be used, even after one repair: ${e.message}`);
  else console.error(e instanceof Error ? e.message : e);
  console.error(DOCTOR_HINT);
  process.exit(1);
};

fs.mkdirSync(dir, { recursive: true });
const given = flag("premise");
if (given) fs.copyFileSync(given, premisePath);

if (!fs.existsSync(premisePath)) {
  const model = modelFromEnv();
  if (model) {
    try {
      const { premise } = await draftWithModel(model, parseBrief(brief, world), world);
      fs.writeFileSync(premisePath, JSON.stringify(premise, null, 2) + "\n");
      console.log(`wrote ${rel(premisePath)}: read it, change any line you like, and run pnpm try ${id} to re-render.`);
    } catch (e) {
      fail(e);
    }
  } else {
    const premise = { ...JSON.parse(fs.readFileSync(TEMPLATE, "utf8")), title: topic.slice(0, 80) || "Working title" };
    fs.writeFileSync(premisePath, JSON.stringify(premise, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "brief.json"), JSON.stringify(brief, null, 2) + "\n");
    console.log(`wrote ${rel(premisePath)}. Write the lines there (setup, escalation, punchline last), then run:

  pnpm try ${id}

Or let a chatbot draft them: pnpm write prompt --brief=${rel(path.join(dir, "brief.json"))} prints a prompt to paste
into ChatGPT, Claude or Gemini; save its reply and run pnpm write draft --brief=… --reply=<file> > ${rel(premisePath)}.
To have your own model write it, set LOCAL_LLM_BASE_URL and LOCAL_LLM_MODEL (README, "Your own model").`);
    process.exit(0);
  }
}

const premise = JSON.parse(fs.readFileSync(premisePath, "utf8"));
if (unwritten(premise)) {
  console.error(`${rel(premisePath)} still has the template's placeholder lines. Write your own, then run pnpm try ${id}.`);
  process.exit(1);
}
const restage = args.includes("--force") || given || !fs.existsSync(skitPath) || fs.statSync(premisePath).mtimeMs > fs.statSync(skitPath).mtimeMs;
if (restage) {
  try {
    fs.writeFileSync(skitPath, JSON.stringify(fromPremise(premise, library, sets), null, 2) + "\n");
    console.log(`staged ${rel(skitPath)}`);
  } catch (e) {
    fail(e);
  }
} else console.log(`kept ${rel(skitPath)} (newer than the premise; --force restages it)`);

const started = Date.now();
try {
  await voiceSkitDir(dir, ttsFromEnv());
  prepLocal(id);
  const { program } = compileSkitDir(id);
  console.log(`rendering "${id}" (${(program.durationInFrames / program.fps).toFixed(1)} s of video)…`);
  const out = await renderSkitMp4(id);
  console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)} s: ${rel(out)}`);
  console.log(`Change a line in ${rel(premisePath)} and run pnpm try ${id} again; only changed lines are re-voiced.`);
} catch (e) {
  fail(e);
}
