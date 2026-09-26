import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library } from "../src/data";

const dir = path.join(import.meta.dirname, "../src/data/characters");
const SECTIONS = ["Look", "Voice", "Personality", "Wants", "Physical comedy", "Catchphrases", "Never"];

describe("cast bible", () => {
  for (const id of Object.keys(library.characters))
    it(`${id} has a bible with every section (the skit-director skill reads it)`, () => {
      const file = path.join(dir, `${id}.md`);
      expect(fs.existsSync(file), `missing src/data/characters/${id}.md`).toBe(true);
      const md = fs.readFileSync(file, "utf8");
      for (const s of SECTIONS) expect(md, `section "## ${s}"`).toContain(`## ${s}\n`);
    });
});
