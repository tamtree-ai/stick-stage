/**
 * "Your own model" for the scripts (`pnpm write draft --model`, `pnpm try`), through the
 * Vercel AI SDK. One setting covers Ollama, LM Studio, OpenRouter and OpenAI (any
 * OpenAI-compatible server) and Anthropic:
 *   LOCAL_LLM_BASE_URL   e.g. http://localhost:11434/v1 (Ollama), https://openrouter.ai/api/v1
 *   LOCAL_LLM_MODEL      e.g. qwen3:8b, anthropic/claude-sonnet-4.5
 *   LOCAL_LLM_API_KEY    when the server wants one
 *   LOCAL_LLM_PROVIDER   "anthropic" for Anthropic's own API (also picked when the URL is anthropic.com)
 *
 * The reply is constrained to `WriterReply` where the server supports it; the parsers and their
 * one repair prompt still judge the content (the engine and the render service never call a model).
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { draftPrompt, premiseFromReply, ReplyError, type Brief, type PremiseInput, type WriterWorld } from "../../src/engine";
import { DraftReplySchema } from "../../src/engine/schemas";

export type ModelChoice = { model: LanguageModel; label: string; /** Set once a server refused the schema. */ plainJson?: boolean };

export const modelFromEnv = (env: NodeJS.ProcessEnv = process.env): ModelChoice | undefined => {
  const baseURL = env.LOCAL_LLM_BASE_URL?.trim();
  const id = env.LOCAL_LLM_MODEL?.trim();
  if (!baseURL || !id) return undefined;
  const apiKey = env.LOCAL_LLM_API_KEY?.trim() || undefined;
  if (env.LOCAL_LLM_PROVIDER === "anthropic" || /(^|\.)anthropic\.com/.test(new URL(baseURL).hostname)) {
    return { model: createAnthropic({ baseURL, apiKey })(id), label: `${id} (Anthropic)` };
  }
  const provider = createOpenAICompatible({ name: "local", baseURL, apiKey, supportsStructuredOutputs: env.LOCAL_LLM_STRUCTURED !== "0" });
  return { model: provider.chatModel(id), label: `${id} at ${baseURL}`, plainJson: env.LOCAL_LLM_STRUCTURED === "0" };
};

/**
 * One model call for a writer prompt. Returns the reply as text for the parsers: the
 * schema-shaped object when the model kept to it, else whatever it wrote (the parsers are
 * more forgiving than the schema, and a bad reply gets the repair prompt).
 */
export const askModel = async (m: ModelChoice, msg: { system: string; prompt: string }, schema: z.ZodType, log: (s: string) => void = console.error): Promise<string> => {
  if (m.plainJson) return (await generateText({ model: m.model, instructions: msg.system, prompt: msg.prompt })).text;
  try {
    const { output } = await generateText({ model: m.model, instructions: msg.system, prompt: msg.prompt, output: Output.object({ schema }) });
    return JSON.stringify(output);
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e) && e.text) return e.text;
    // Some servers (Ollama's grammar, older LM Studio) refuse a JSON Schema they can't compile.
    // The prompt already asks for the JSON shape, so ask again without the constraint.
    if (APICallError.isInstance(e) && e.statusCode === 400) {
      log("this server can't hold the reply to the schema, so it was asked for plain JSON (LOCAL_LLM_STRUCTURED=0 skips the first try)");
      m.plainJson = true;
      return (await generateText({ model: m.model, instructions: msg.system, prompt: msg.prompt })).text;
    }
    throw e;
  }
};

const REPAIR_SYSTEM = "Reply with ONE JSON object only. No commentary.";

/** Brief → premise with the user's model: one call, and one repair when the reply can't be used. */
export const draftWithModel = async (m: ModelChoice, brief: Brief, world: WriterWorld, log: (s: string) => void = console.log): Promise<{ premise: PremiseInput; reply: string }> => {
  log(`writing with ${m.label}…`);
  const reply = await askModel(m, draftPrompt(brief, world), DraftReplySchema, log);
  try {
    return { premise: premiseFromReply(reply, brief, world).premise, reply };
  } catch (e) {
    if (!(e instanceof ReplyError)) throw e;
    log(`the reply could not be used (${e.message}); asking once more…`);
    const again = await askModel(m, { system: REPAIR_SYSTEM, prompt: e.prompt }, DraftReplySchema, log);
    return { premise: premiseFromReply(again, brief, world).premise, reply: again };
  }
};
