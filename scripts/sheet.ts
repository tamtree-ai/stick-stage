/**
 * Contact sheet: pnpm sheet <composition> <from> <to> <step> [--cols=6] [--scale=0.25] [--out=path] [--props=json]
 * Renders every `step`-th frame of a composition and tiles them into one PNG.
 * A skit id instead of a composition renders that skit (`pnpm sheet fine`), ≤ 48 tiles by default.
 */
import { renderSheet } from "./lib/sheet";
import { isSkit } from "./lib/skit";

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const i = a.indexOf("=");
    return i < 0 ? [a.slice(2), "true"] : [a.slice(2, i), a.slice(i + 1)];
  }),
);
const [id, fromS, toS, stepS] = args.filter((a) => !a.startsWith("--"));
if (!id) {
  console.error("usage: pnpm sheet <composition|skitId> [from] [to] [step] [--cols=6] [--scale=0.25] [--out=path] [--props=json]");
  process.exit(1);
}
const num = (s: string | undefined) => (s === undefined ? undefined : Number(s));
const skit = isSkit(id);
const out = await renderSheet({
  id: skit ? "Skit" : id,
  inputProps: skit ? { skit: id, showLabels: flags.debug === "true" } : flags.props ? JSON.parse(flags.props) : undefined,
  from: num(fromS),
  to: num(toS),
  step: num(stepS) ?? (skit ? undefined : 2),
  cols: num(flags.cols),
  scale: num(flags.scale) ?? (skit ? 0.2 : undefined),
  out: flags.out ?? (skit ? `out/${id}-sheet.png` : undefined),
  title: skit ? `${id}` : undefined,
});
console.log(out);
