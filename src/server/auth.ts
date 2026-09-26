/** Bearer-token auth: one shared token per deployment (`STICKSTAGE_API_TOKEN`). */
import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import { HttpError } from "./http";

const digest = (s: string) => crypto.createHash("sha256").update(s).digest();

/** Throws 401 unless the request carries `Authorization: Bearer <token>`. `token: undefined` disables auth. */
export const requireBearer = (token: string | undefined) => {
  const want = token === undefined ? undefined : digest(token);
  return (req: IncomingMessage) => {
    if (!want) return;
    const m = /^Bearer (.+)$/.exec(String(req.headers.authorization ?? ""));
    // Compare fixed-length digests so neither length nor content leaks through timing.
    if (!m || !crypto.timingSafeEqual(digest(m[1]!), want)) throw new HttpError(401, "unauthorized", "missing or wrong bearer token");
  };
};
