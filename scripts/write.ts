/**
 * The writer, from the repo root (plan: writer contract).
 *
 *   pnpm write prompt --brief=<file>                  system + prompt as JSON
 *   pnpm write draft  --brief=<file> --reply=<file>   premise JSON; exit 2 if unusable
 *   pnpm write revise --skit=<file> --note="…"        lines-only change prompt
 *   pnpm write apply  --skit=<file> --reply=<file>    restaged skit JSON; exit 2 if unusable
 *
 * With your own model (LOCAL_LLM_BASE_URL + LOCAL_LLM_MODEL, see scripts/lib/llm.ts), the
 * model writes the reply, with one repair when it can't be used:
 *   pnpm write draft  --brief=<file> --model          premise JSON
 *   pnpm write apply  --skit=<file> --note="…" --model restaged skit JSON
 *
 * An unusable reply prints one repair prompt on stderr and exits 2.
 */
import fs from "node:fs";
import { catalog, castNotes } from "../src/data";
import { draftPrompt, parseBrief, parseSkit, premiseFromReply, ReplyError, revisePrompt, SkitError, skitFromReply, writerWorld, WRITER, type SkitDoc } from "../src/engine";
import { ReviseReplySchema } from "../src/engine/schemas";
import { askModel, draftWithModel, modelFromEnv } from "./lib/llm";

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (k: string) => {
  const hit = args.find((a) => a.startsWith(`--${k}=`));
  return hit?.slice(k.length + 3);
};
const read = (p: string | undefined, name: string): string => {
  if (!p) {
    console.error(`missing --${name}`);
    process.exit(1);
  }
  return fs.readFileSync(p, "utf8");
};
const json = (p: string | undefined, name: string): unknown => {
  try {
    return JSON.parse(read(p, name));
  } catch (e) {
    console.error(`${name} is not JSON: ${(e as Error).message}`);
    process.exit(1);
  }
};

const world = writerWorld(catalog, castNotes);
const fail = (e: unknown): never => {
  if (e instanceof ReplyError) {
    console.error(e.prompt);
    process.exit(2);
  }
  if (e instanceof SkitError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
};

const warn = (warnings: { code: string; message: string }[]) => {
  for (const w of warnings) console.error(`${w.code}: ${w.message}`);
};

const useModel = args.includes("--model");
const model = () => {
  const m = modelFromEnv();
  if (!m) {
    console.error("--model needs LOCAL_LLM_BASE_URL and LOCAL_LLM_MODEL (e.g. http://localhost:11434/v1 and qwen3:8b). Run pnpm diagnose.");
    process.exit(1);
  }
  return m;
};
const log = (s: string) => console.error(s);

/** A change with the user's model: the revise prompt, one call, and one repair. */
const reviseWithModel = async (doc: SkitDoc, note: string) => {
  const m = model();
  log(`writing with ${m.label}…`);
  const reply = await askModel(m, revisePrompt(doc, note, world), ReviseReplySchema, log);
  try {
    return skitFromReply(reply, doc, world);
  } catch (e) {
    if (!(e instanceof ReplyError)) throw e;
    log(`the reply could not be used (${e.message}); asking once more…`);
    return skitFromReply(await askModel(m, { system: "Reply with ONE JSON object only. No commentary.", prompt: e.prompt }, ReviseReplySchema, log), doc, world);
  }
};

if (cmd === "prompt" || cmd === "draft") {
  const brief = (() => {
    try {
      return parseBrief(json(flag("brief"), "brief"), world);
    } catch (e) {
      return fail(e);
    }
  })();
  if (cmd === "prompt") {
    const built = draftPrompt(brief, world);
    console.log(JSON.stringify({ writer: WRITER, ...built }, null, 2));
  } else if (useModel && !flag("reply")) {
    try {
      console.log(JSON.stringify((await draftWithModel(model(), brief, world, log)).premise, null, 2));
    } catch (e) {
      fail(e);
    }
  } else {
    try {
      const { premise, warnings } = premiseFromReply(read(flag("reply"), "reply"), brief, world);
      warn(warnings);
      console.log(JSON.stringify(premise, null, 2));
    } catch (e) {
      fail(e);
    }
  }
} else if (cmd === "revise" || cmd === "apply") {
  const doc = (() => {
    try {
      return parseSkit(json(flag("skit"), "skit"));
    } catch (e) {
      return fail(e);
    }
  })();
  if (cmd === "revise") {
    const note = flag("note")?.trim();
    if (!note) {
      console.error("missing --note");
      process.exit(1);
    }
    const built = revisePrompt(doc, note, world);
    console.log(JSON.stringify({ writer: WRITER, ...built }, null, 2));
  } else if (useModel && !flag("reply")) {
    const note = flag("note")?.trim();
    if (!note) {
      console.error("missing --note");
      process.exit(1);
    }
    try {
      const { skit, warnings } = await reviseWithModel(doc, note);
      warn(warnings);
      console.log(JSON.stringify(skit, null, 2));
    } catch (e) {
      fail(e);
    }
  } else {
    try {
      const { skit, warnings } = skitFromReply(read(flag("reply"), "reply"), doc, world);
      warn(warnings);
      console.log(JSON.stringify(skit, null, 2));
    } catch (e) {
      fail(e);
    }
  }
} else {
  console.error("usage: pnpm write prompt|draft|revise|apply  --brief=<file> | --skit=<file>  [--reply=<file> | --model] [--note=…]");
  process.exit(1);
}
