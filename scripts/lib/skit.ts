/** Skits in this repo (`public/skits/<id>/`): compile / check with printed diagnostics. */
import { formatDiagnostics, formatReport, SkitError, type CheckReport, type CompileResult } from "../../src/engine";
import { checkSkitIn, compileSkitIn, isSkit as isSkitIn } from "../../src/node";
import path from "node:path";
import { PROJECT, ROOT, WS } from "./tools";

export { summarize } from "../../src/node";
export const skitDir = (id: string) => WS.skitDir(id);
export const isSkit = (id: string) => isSkitIn(PROJECT, id);

/** Compile, printing diagnostics. Exits the process on errors (or rethrows, with `exitOnError: false`). */
export const compileSkitDir = (id: string, { exitOnError = true, lang }: { exitOnError?: boolean; lang?: string } = {}): CompileResult => {
  try {
    const r = compileSkitIn(PROJECT, id, { lang });
    if (r.warnings.length) console.warn(formatDiagnostics(r.warnings));
    return r;
  } catch (e) {
    if (!(e instanceof SkitError) || !exitOnError) throw e;
    console.error(`${path.relative(ROOT, path.join(skitDir(id), "skit.json"))}: ${formatDiagnostics(e.diagnostics)}`);
    process.exit(1);
  }
};

/** M5 self-check on a compiled skit; writes `generated/check.json` and prints the report. */
export const checkSkitDir = (id: string, result: CompileResult, quiet = false): CheckReport => {
  const r = checkSkitIn(PROJECT, id, result);
  if (!quiet) console.log(formatReport(r, result.program.fps));
  return r;
};
