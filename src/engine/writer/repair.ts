import type { Diagnostic } from "../director/diagnostics";

/** The one message to send the model again when a reply cannot be used. */
export const repairPrompt = (diagnostics: readonly Diagnostic[], reply: string): string => {
  const lines = diagnostics.map((d) => `- ${d.path}: ${d.message}${d.expected ? ` Expected ${d.expected}.` : ""}`);
  const previous = reply.trim().slice(0, 2500);
  return `That reply could not be used.\n${lines.join("\n")}\n\nReply with ONE JSON object only, fixing those problems. Do not add commentary.\n\nYour reply was:\n${previous}`;
};
