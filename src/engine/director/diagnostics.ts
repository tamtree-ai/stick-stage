import type { z } from "zod";

/** One problem in a skit, phrased so a person (or the M5 skill) can fix the JSON directly. */
export type Diagnostic = {
  level: "error" | "warning";
  /** Stable machine-readable id (e.g. `unknown-pose`, `voice-stale`, `schema/invalid_type`). */
  code: string;
  /** JSON path, e.g. `beats[2].actions[0].pose`. */
  path: string;
  message: string;
  expected?: string;
  example?: string;
};

export class SkitError extends Error {
  constructor(readonly diagnostics: Diagnostic[]) {
    super(formatDiagnostics(diagnostics));
    this.name = "SkitError";
  }
}

export const pathString = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : s ? `${s}.${String(k)}` : String(k)), "") || "(root)";

/** Example snippets by the last key of the path (then by the containing key). */
const EXAMPLES: Record<string, string> = {
  schemaVersion: `"schemaVersion": 1`,
  meta: `"meta": { "title": "Not being sarcastic" }`,
  title: `"meta": { "title": "Not being sarcastic" }`,
  set: `"set": "office-1"`,
  cast: `"cast": [{ "id": "milo", "character": "milo", "mark": "left" }, { "id": "june", "character": "june", "mark": "right" }]`,
  character: `{ "id": "milo", "character": "milo", "mark": "left" }`,
  mark: `"mark": "left"`,
  facing: `"facing": "left"`,
  beats: `"beats": [{ "id": "b1", "speaker": "june", "line": "I'm fine. Totally fine." }]`,
  id: `"id": "b1"`,
  speaker: `{ "id": "b1", "speaker": "june", "line": "I'm fine." }`,
  line: `{ "id": "b1", "speaker": "june", "line": "I'm fine." }`,
  silent: `{ "id": "b2", "silent": true, "durationMs": 900 }`,
  durationMs: `{ "id": "b2", "silent": true, "durationMs": 900 }`,
  expression: `"expression": "deadpan"`,
  reaction: `"reaction": "cringe"`,
  audio: `"audio": { "source": "tts" }`,
  shot: `"shot": { "framing": "close", "on": "milo" }`,
  framing: `"shot": { "framing": "close", "on": "milo" }`,
  on: `"shot": { "framing": "close", "on": "milo" }`,
  punchIn: `"punchIn": { "on": "june", "at": { "word": "Sure" } }`,
  shake: `"shake": { "at": { "ms": 0 }, "durationMs": 400 }`,
  at: `"at": { "word": "fine", "occurrence": 2 }  or  { "ms": 400 }  or  { "fraction": 0.5 }`,
  word: `"at": { "word": "fine", "occurrence": 2 }`,
  occurrence: `"at": { "word": "fine", "occurrence": 2 }`,
  actions: `"actions": [{ "who": "june", "do": "pose", "pose": "arms-crossed", "at": { "word": "fine" } }]`,
  do: `{ "who": "milo", "do": "expression", "expression": "cringe", "at": { "ms": 0 } }`,
  who: `{ "who": "milo", "do": "pose", "pose": "shrug" }`,
  pose: `{ "who": "june", "do": "pose", "pose": "arms-crossed" }`,
  to: `{ "who": "milo", "do": "look", "to": "june" }`,
  prop: `{ "who": "milo", "do": "hold", "prop": "phone", "hand": "R" }`,
  hand: `"hand": "R"`,
  speed: `{ "who": "milo", "do": "walkTo", "mark": "center", "speed": "run" }`,
  with: `{ "who": "milo", "do": "highFive", "with": "june", "at": { "word": "yes" } }`,
  target: `{ "who": "june", "do": "shove", "target": "milo", "at": { "word": "out" } }`,
  distance: `{ "who": "june", "do": "shove", "target": "milo", "distance": 0.14 }`,
  symbol: `{ "who": "milo", "do": "symbol", "symbol": "sweat" }`,
  sfx: `"sfx": [{ "id": "record-scratch", "at": { "ms": 0 } }]`,
  text: `"text": [{ "type": "slam", "value": "SURE.", "at": { "word": "Sure" } }]`,
  value: `{ "type": "slam", "value": "SURE.", "at": { "word": "Sure" } }`,
  overlay: `"overlay": { "pov": "POV: your coworker says they're fine" }`,
  pov: `"overlay": { "pov": "POV: your coworker says they're fine" }`,
  timing: `"timing": { "leadInMs": 300, "gapMs": 250, "tailMs": 700 }`,
};

export const exampleFor = (path: readonly PropertyKey[]): string | undefined => {
  for (let i = path.length - 1; i >= 0; i--) {
    const k = path[i];
    if (typeof k === "string" && EXAMPLES[k]) return EXAMPLES[k];
  }
  return undefined;
};

/** Zod issues → diagnostics with the path, what was expected and an example. */
export const fromZodIssues = (issues: readonly z.core.$ZodIssue[]): Diagnostic[] =>
  issues.map((i) => {
    const d: Diagnostic = { level: "error", code: `schema/${i.code}`, path: pathString(i.path), message: i.message, example: exampleFor(i.path) };
    if (i.code === "invalid_value") d.expected = `one of ${i.values.map((v) => JSON.stringify(v)).join(" | ")}`;
    if (i.code === "invalid_union" && "note" in i && i.note === "No matching discriminator")
      d.message = `unknown "${i.discriminator}" value`;
    if (i.code === "unrecognized_keys") d.message = `unknown field${i.keys.length > 1 ? "s" : ""} ${i.keys.map((k) => `"${k}"`).join(", ")}`;
    return d;
  });

const editDistance = (a: string, b: string): number => {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
};

/** Closest known id, if it's close enough to be a typo. */
export const didYouMean = (got: string, known: readonly string[]): string | undefined => {
  let best: string | undefined;
  let bestD = Infinity;
  for (const k of known) {
    const d = editDistance(got.toLowerCase(), k.toLowerCase());
    if (d < bestD) [best, bestD] = [k, d];
  }
  return best !== undefined && bestD <= Math.max(2, Math.floor(got.length / 3)) ? best : undefined;
};

/** Diagnostic for an id that isn't in a library table. */
export const unknownId = (kind: string, got: string, known: readonly string[], path: readonly PropertyKey[]): Diagnostic => {
  const guess = didYouMean(got, known);
  return {
    level: "error",
    code: `unknown-${kind.replace(/\s+/g, "-")}`,
    path: pathString(path),
    message: `unknown ${kind} "${got}"${guess ? ` (did you mean "${guess}"?)` : ""}`,
    expected: `one of ${known.join(", ")}`,
    example: exampleFor(path),
  };
};

export const formatDiagnostics = (ds: readonly Diagnostic[]): string => {
  const errors = ds.filter((d) => d.level === "error").length;
  const head = `skit has ${errors} error${errors === 1 ? "" : "s"}${ds.length > errors ? ` and ${ds.length - errors} warning(s)` : ""}:`;
  const body = ds.map((d) => {
    const lines = [`  ${d.level === "error" ? "✗" : "!"} ${d.path}: ${d.message}  [${d.code}]`];
    if (d.expected) lines.push(`      expected: ${d.expected}`);
    if (d.example) lines.push(`      example:  ${d.example}`);
    return lines.join("\n");
  });
  return [head, ...body].join("\n");
};
