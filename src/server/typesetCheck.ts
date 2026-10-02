/** `/validate` typesets a skit's equations in memory, so bad TeX is a 422 before any TTS is spent. */
import { SkitError, texOfSkit, type Typeset } from "../engine/core";
import { typeset } from "../node/equations";

const memo = new Map<string, Typeset>();

export const typesetForCheck = (skit: unknown): Record<string, Typeset> => {
  const out: Record<string, Typeset> = {};
  for (const tex of texOfSkit((skit ?? {}) as Parameters<typeof texOfSkit>[0])) {
    try {
      const t = memo.get(tex) ?? typeset(tex);
      if (memo.size > 500) memo.clear();
      memo.set(tex, t);
      out[tex] = t;
    } catch (e) {
      throw new SkitError([{ level: "error", code: "equation-tex", path: "figures", message: e instanceof Error ? e.message : String(e), expected: "TeX MathJax can read" }]);
    }
  }
  return out;
};
