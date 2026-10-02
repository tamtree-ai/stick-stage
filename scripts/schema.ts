/**
 * JSON Schemas for every document kind: pnpm schema → schemas/<kind>.schema.json.
 * Point an editor at them (e.g. "$schema": "../../../schemas/skit.schema.json" in skit.json)
 * for completion and validation while writing skits.
 */
import fs from "node:fs";
import path from "node:path";
import { DOC_KINDS, jsonSchemaFor, writerReplyJsonSchema } from "../src/engine/schemas";
import { ROOT } from "./lib/tools";

const dir = path.join(ROOT, "schemas");
fs.mkdirSync(dir, { recursive: true });
for (const kind of DOC_KINDS) {
  const schema = { ...jsonSchemaFor(kind), $id: `https://stickstage.dev/schemas/${kind}.schema.json`, title: `StickStage ${kind}` };
  fs.writeFileSync(path.join(dir, `${kind}.schema.json`), JSON.stringify(schema, null, 2) + "\n");
}
// A model's reply to the writer prompts: not a stored document, but the one file any caller needs to constrain a model.
const reply = { ...writerReplyJsonSchema(), $id: "https://stickstage.dev/schemas/writer-reply.schema.json", title: "StickStage writer reply" };
fs.writeFileSync(path.join(dir, "writer-reply.schema.json"), JSON.stringify(reply, null, 2) + "\n");
console.log(`wrote ${DOC_KINDS.length + 1} schemas to ${path.relative(ROOT, dir)}/`);
