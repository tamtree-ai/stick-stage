import { prepSkit as prep, type PrepResult } from "../../src/node";
import { WS } from "./tools";

export type { PrepResult };
export const prepSkit = (skitId: string, opts: { requireRhubarb?: boolean } = {}): PrepResult => prep(WS, skitId, { requireLipSync: opts.requireRhubarb });
