import { DrawnPropSchema, type DrawnProp, type PropDef } from "../props/schema";
import { SkitError } from "../director/diagnostics";
import { parseLoose } from "./parse";

/**
 * The "draw it" rung: a model draws one missing prop as a JSON-drawn prop (`kind: "drawn"`), the
 * same format as the catalog's drawn props (`docs/creating-props.md`). The reply is held to the
 * schema (bounds ±0.6, at most 24 parts, no arcs) before it can join a story's `props`; the owner
 * approves it on video before `pnpm story promote` puts it in the catalog.
 */
export const PROP_WRITER = "prop-1";

export const propPrompt = (noun: string, examples: readonly PropDef[]): { system: string; prompt: string; writer: string } => {
  const system = [
    "You draw one small object as data for StickStage, a code-drawn cartoon engine. Reply with one JSON object only.",
    'Shape: { "schemaVersion": 1, "id", "kind": "drawn", "name", "category", "rank": 50, "align": "upright" | "forearm", "angle", "size", "colors": { "body", "accent", "screen" }, "parts": [...] }.',
    "The origin (0, 0) is where the hand grips it. Up is negative y. Every coordinate stays within ±0.6; a hand-held object is about 0.05–0.25 across. Build it upward from the grip for \"upright\".",
    'Parts (at most 24, drawn in order): { "shape": "rect", "x", "y", "w", "h", "rx"? } (x, y = top-left) · { "shape": "circle", "x", "y", "r" } · { "shape": "ellipse", "x", "y", "rx", "ry" } · { "shape": "poly", "points": [[x, y], ...] } · { "shape": "line", "x1", "y1", "x2", "y2" } · { "shape": "path", "d" } (M L H V C Q Z only).',
    'Each part: "fill" = body | accent | screen | body-dark | body-light | accent-dark | accent-light | none | a hex; optional "angle", "opacity".',
    "Flat cartoon style: few big simple shapes, bright colours, one or two details. No text.",
    "",
    "Examples from the catalog:",
    ...examples.slice(0, 3).map((e) => JSON.stringify(e)),
  ].join("\n");
  const id = noun.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { system, prompt: `Draw: ${noun}. Use the id "${id}".`, writer: PROP_WRITER };
};

/** A model's reply → a drawn prop, or `SkitError` with what to fix. */
export const propFromReply = (reply: string): DrawnProp => {
  const r = DrawnPropSchema.safeParse(parseLoose(reply));
  if (r.success) return r.data;
  throw new SkitError(r.error.issues.map((i) => ({ level: "error" as const, code: "prop", path: i.path.join(".") || "(root)", message: i.message })));
};
