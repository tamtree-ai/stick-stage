import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ENGINE = path.resolve(import.meta.dirname, "../src/engine");
const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]));

const FORBIDDEN: [RegExp, string][] = [
  [/\bprocess\./, "process"],
  [/registerRoot/, "registerRoot"],
  [/from ["'](node:|fs|path|child_process)/, "node built-in"],
  [/Math\.random/, "Math.random"],
  [/\bnew Date\b|Date\.now/, "Date"],
  [/\buse(State|Effect|LayoutEffect|Reducer)\b/, "state hook"],
];

describe("engine stays app-agnostic and frame-pure", () => {
  for (const f of files(ENGINE).filter((x) => /\.tsx?$/.test(x))) {
    it(path.relative(ENGINE, f), () => {
      const src = fs.readFileSync(f, "utf8");
      for (const [re, name] of FORBIDDEN) expect(re.test(src), `${name} in ${f}`).toBe(false);
      expect(src.split("\n").length, "file over ~300 lines").toBeLessThanOrEqual(320);
    });
  }
});
