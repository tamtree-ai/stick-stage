import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library, reactions, safeArea, sets, sfxLibrary } from "../src/data";
import { checkSkit, compileSkit, parseSkit, skitLines } from "../src/engine";
import { fakeVoice } from "./director-fixtures";

/** Drop `//` comments outside strings. */
const stripComments = (src: string): string =>
  src
    .split("\n")
    .map((line) => {
      let inStr = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' && line[i - 1] !== "\\") inStr = !inStr;
        if (!inStr && c === "/" && line[i + 1] === "/") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");

const skill = fs.readFileSync(path.join(import.meta.dirname, "../skills/skit-director/SKILL.md"), "utf8");
const examples = [...skill.matchAll(/```jsonc\n([\s\S]*?)```/g)].map((m) => JSON.parse(stripComments(m[1]!)));

describe("skit-director skill examples", () => {
  it("has three annotated examples", () => expect(examples).toHaveLength(3));
  examples.forEach((skit, i) =>
    it(`example ${i + 1} ("${skit.meta.title}") compiles and passes the self-check`, () => {
      const lines = skitLines(parseSkit(skit)).map((l) => ({ id: l.id, text: l.text, durationMs: 500 + l.text.split(/\s+/).length * 300 }));
      const result = compileSkit({ skit, voice: fakeVoice(lines), lib: library, sets, sfx: sfxLibrary, reactions });
      const report = checkSkit({ result, lib: library, sets, safeArea });
      expect(report.findings.filter((f) => f.level === "error")).toEqual([]);
    }),
  );
});
