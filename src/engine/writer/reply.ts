/**
 * The shape the writer prompts ask a model for, as zod. `pnpm schema` exports it as
 * `schemas/writer-reply.schema.json`, so any caller can constrain a model to it
 * (structured output, `generateObject`, Outlines).
 *
 * The parsers (`premiseFromReply`, `skitFromReply`) stay more forgiving than this: they
 * also take a bare `lines` list, `speaker` for `who`, or a whole skit. A reply that passes
 * this schema is always one they can read; a reply that fails it may still be usable.
 * Content rules a schema can't hold (an unknown set, a slam that isn't last) stay with the
 * parsers and their repair prompt.
 */
import { z } from "zod";

export const ReplyLineSchema = z.object({
  who: z.string().min(1).describe("a cast id from the prompt"),
  text: z.string().min(1).describe("the spoken words, at most 12"),
  expression: z.string().optional().describe("one of the expressions the prompt lists"),
  slam: z.string().max(40).optional().describe("one or two words, last line only"),
  gag: z.string().optional(),
  prop: z.string().optional().describe('a prop id from the prompt, or "none"'),
  delivery: z.string().optional().describe('"flat", "whispered", …'),
});

export const ReplySceneSchema = z.object({
  set: z.string().optional().describe("only when the prompt leaves this scene's set open"),
  pov: z.string().max(80).optional(),
  lines: z.array(ReplyLineSchema).min(1),
});

/** `draftPrompt`'s reply: a titled skit in scenes. */
export const DraftReplySchema = z.object({
  title: z.string().min(1),
  template: z.string().optional().describe("only when the prompt asks for one"),
  description: z.string().max(2000).optional(),
  hashtags: z.array(z.string()).max(12).optional(),
  scenes: z.array(ReplySceneSchema).min(1).max(4),
});

/** `revisePrompt`'s reply: every kept line, in play order. A new line takes a new id. */
export const ReviseReplySchema = z.object({
  lines: z.array(ReplyLineSchema.extend({ id: z.string().min(1) })).min(1),
});

export const WriterReplySchema = z.union([DraftReplySchema, ReviseReplySchema]);

export type DraftReply = z.infer<typeof DraftReplySchema>;
export type ReviseReply = z.infer<typeof ReviseReplySchema>;
export type WriterReply = z.infer<typeof WriterReplySchema>;
