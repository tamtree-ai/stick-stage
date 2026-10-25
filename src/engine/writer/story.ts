import { shapeOf } from "../rig/build";
import type { Library } from "../rig/actorState";
import { BODY_KINDS, EAR_KINDS, EYE_KINDS, HAIR_KINDS, HEAD_KINDS, MARKING_KINDS, MUZZLE_KINDS, SHAPE_BUILDS, SHAPE_DETAILS, TAIL_KINDS } from "../rig/shape/schema";
import { SHAPE_COLOR_TOKENS } from "../rig/shape/palette";
import { FEATURES, SETTINGS, TIMES } from "../set/compose";
import { ACTION_KINDS } from "../director/schema";
import { propMeta } from "../catalog";

/**
 * The story writer's prompt: a brief ("Pim learns to swim") → one complete skit JSON in the story
 * format: 16:9, `style: "story"`, a narrator, scenes with described `place`s, the shape cast. New
 * characters are written as shape specs in `characters`. The reply is checked by `parseSkit`,
 * `missingAssets` and the compiler like any skit.
 */
export type StoryBrief = {
  idea: string;
  /** Target length in seconds. Default 60. */
  seconds?: number;
  /** Cast to use; default any shape characters. At most 4 per story. */
  cast?: string[];
  /** Who the story is for ("children 3–6", "adults winding down"). */
  audience?: string;
};

export const STORY_WRITER = "story-1";

const list = (xs: readonly string[]) => xs.join(", ");

export const storyPrompt = (lib: Library, brief: StoryBrief): { system: string; prompt: string; writer: string } => {
  const shapeCast = Object.values(lib.characters).filter((c) => shapeOf(c));
  const castLines = shapeCast.map((c) => `- ${c.id} (${shapeOf(c)!.species ?? "creature"}, ${shapeOf(c)!.build}): ${c.personality ?? ""}`).join("\n");
  const props = Object.values(lib.props).map((d) => propMeta(d).id);
  const system = [
    "You write short narrated cartoon stories for StickStage, a code-drawn animation engine. Nothing is generated as pictures: you can only use what the catalog below can draw.",
    "Reply with one JSON object only: a StickStage skit, schemaVersion 2. No prose, no code fences.",
    "",
    "Format rules:",
    '- "meta": { "title", "aspect": "16:9", "description" }. "style": "story".',
    '- "narrator": { "id": "narrator", "captionStyle": "italic" }. The narrator carries the story; characters speak short lines.',
    '- "cast": up to 4 entries { "id", "character", "mark" }. Marks: far-left, left, center, right, far-right, and off-left / off-right (offstage).',
    '- "scenes": each { "id", "place": { "setting", "time", "features", "seats" }, "cast": [ who is in it ], "beats": [...] }. Put a "transition" ({ "type": "fade" | "slide" | "cut" }) on every scene after the first.',
    `- settings: ${list(SETTINGS)}. times: ${list(TIMES)}. features: ${list(FEATURES)}. "seats": marks whose cast member sits.`,
    '- A beat: { "id" (unique across the story), "speaker" (a cast id or "narrator"), "line", optional "expression" (the speaker\'s; never on narrator beats), "focus" (narrator beats: who the camera watches), "actions" }.',
    `- actions ("do"): ${list(ACTION_KINDS)}. Common: { "who", "do": "walkTo", "mark", "at": { "word": "…" } } to enter or leave; { "do": "pose", "pose" }; { "do": "expression", "expression" }; { "do": "hold", "prop" }; { "do": "sit" } / { "do": "stand" }.`,
    `- poses: ${list(Object.keys(lib.poses))}.`,
    `- expressions: ${list(Object.keys(lib.expressions))}.`,
    `- props (held): ${list(props)}.`,
    "",
    "The shape cast (use these first):",
    castLines,
    "",
    'A new character: add it to "characters" as a spec and use its id in "cast":',
    '{ "schemaVersion": 1, "id": "…", "displayName": "…", "aspect": "16:9", "style": { "build": "shape" }, "personality": "…", "shape": { "species": "…", "build": "kid", "color": "<token>", "belly": "<token>", "ears": { "kind": "…" }, "muzzle": { "kind": "…" }, "tail": { "kind": "…" }, "details": [ { "id": "…" } ] } }',
    `  builds: ${list(SHAPE_BUILDS)}. head: ${list(HEAD_KINDS)}. body: ${list(BODY_KINDS)}. ears: ${list(EAR_KINDS)}. muzzle: ${list(MUZZLE_KINDS)}. eyes: ${list(EYE_KINDS)}. tail: ${list(TAIL_KINDS)}. hair: ${list(HAIR_KINDS)}. markings: ${list(MARKING_KINDS)}. details: ${list(SHAPE_DETAILS)}.`,
    `  colour tokens: ${list(SHAPE_COLOR_TOKENS)}. Pick a body colour unlike the others in the story and unlike the place (no green figure in a green park).`,
    "",
    'A small hand-held object the props list lacks (a shell, a kite): add it to "props" as a drawn prop and hold it by its id: { "schemaVersion": 1, "id", "kind": "drawn", "name", "category": "story", "align": "upright", "colors": { "body", "accent" }, "parts": [ { "shape": "circle" | "ellipse" | "rect" | "poly", ... , "fill": "body" | "accent" } ] }. The grip is (0, 0), up is negative y, every coordinate within ±0.6. At most two per story; an owner approves them.',
    "Anything bigger the catalog can't draw (a bicycle, a rocket, a crowd): don't name it as a prop or pose. Let the narrator say it while the camera stays on a reaction, or cut to the next scene.",
    "Keep each spoken line under 15 words. Show feelings with expressions and actions, not by naming them.",
  ].join("\n");
  const seconds = brief.seconds ?? 60;
  const prompt = [
    `Story idea: ${brief.idea}`,
    `Length: about ${seconds} seconds (roughly ${Math.round(seconds / 3.5)} beats).`,
    brief.audience ? `Audience: ${brief.audience}.` : "",
    brief.cast?.length ? `Cast: ${list(brief.cast)}.` : "Cast: pick 2–4 from the shape cast, or add one new character if the idea needs it.",
    "Two to four scenes, each in a different place. End on a warm, quiet beat.",
  ]
    .filter(Boolean)
    .join("\n");
  return { system, prompt, writer: STORY_WRITER };
};
