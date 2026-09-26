import path from "node:path";
import type { SheetOptions } from "../../src/node";
import { BACKEND, ROOT } from "./tools";

/** Contact sheet PNG (default `out/<id>-sheet-<from>-<to>.png`). */
export const renderSheet = (o: Omit<SheetOptions, "out"> & { out?: string }): Promise<string> =>
  BACKEND.renderSheet({ ...o, out: path.resolve(o.out ?? path.join(ROOT, "out", `${o.id}-sheet-${o.from ?? 0}-${o.to ?? "end"}.png`)) });
