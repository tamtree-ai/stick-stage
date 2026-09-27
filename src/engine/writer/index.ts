/** The writer: StickStage builds the prompt and turns the model's words into a premise or a skit. */

export const WRITER = "w1";

export { BriefSchema, parseBrief, scenePlan, type Brief, type ScenePlan } from "./brief";
export { ReplyError, premiseFromReply } from "./draft";
export { parseLoose } from "./parse";
export { draftPrompt, revisePrompt, skitWriterLines, type WriterLine } from "./prompt";
export { repairPrompt } from "./repair";
export { skitFromReply } from "./revise";
export { writerWorld, type WriterWorld } from "./world";
