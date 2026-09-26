/**
 * A tiny router over `node:http`: path params, JSON and multipart bodies with size limits, file
 * streaming, and errors as JSON (`{ error: { code, message, diagnostics? } }`). No dependencies:
 * multipart goes through the Web `Request.formData()` parser Node ships.
 */
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type Reply = { status?: number; json?: unknown; file?: { path: string; type: string; name?: string } };
export type Ctx = { req: IncomingMessage; url: URL; params: Record<string, string> };
export type Handler = (ctx: Ctx) => Promise<Reply> | Reply;
type Route = { method: string; parts: string[]; handler: Handler };

export const router = () => {
  const routes: Route[] = [];
  const add = (method: string, pattern: string, handler: Handler) => routes.push({ method, parts: pattern.split("/").filter(Boolean), handler });

  const match = (method: string, pathname: string): { route?: Route; params: Record<string, string>; pathMatched: boolean } => {
    const segs = pathname.split("/").filter(Boolean);
    let pathMatched = false;
    for (const r of routes) {
      if (r.parts.length !== segs.length) continue;
      const params: Record<string, string> = {};
      const ok = r.parts.every((p, i) => (p.startsWith(":") ? ((params[p.slice(1)] = decodeURIComponent(segs[i]!)), true) : p === segs[i]));
      if (!ok) continue;
      pathMatched = true;
      if (r.method === method) return { route: r, params, pathMatched };
    }
    return { params: {}, pathMatched };
  };

  const handle = async (req: IncomingMessage, res: ServerResponse, before?: (ctx: Ctx) => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      const { route, params, pathMatched } = match(req.method ?? "GET", url.pathname);
      if (!route) throw pathMatched ? new HttpError(405, "method-not-allowed", `${req.method} not allowed on ${url.pathname}`) : new HttpError(404, "not-found", `no route ${url.pathname}`);
      const ctx = { req, url, params };
      before?.(ctx);
      await send(res, await route.handler(ctx));
    } catch (e) {
      const err = e instanceof HttpError ? e : new HttpError(500, "internal", e instanceof Error ? e.message : String(e));
      if (err.status >= 500) console.error(e);
      // Drain what the client is still sending so it sees the error, not a reset.
      req.resume();
      if (!res.headersSent) await send(res, { status: err.status, json: { error: { code: err.code, message: err.message, ...err.details } } });
      else res.destroy();
    }
  };

  return {
    get: (p: string, h: Handler) => add("GET", p, h),
    post: (p: string, h: Handler) => add("POST", p, h),
    delete: (p: string, h: Handler) => add("DELETE", p, h),
    handle,
  };
};

const send = async (res: ServerResponse, r: Reply) => {
  if (r.file) {
    const { size } = fs.statSync(r.file.path);
    res.writeHead(r.status ?? 200, {
      "content-type": r.file.type,
      "content-length": size,
      ...(r.file.name ? { "content-disposition": `attachment; filename="${r.file.name}"` } : {}),
    });
    await new Promise<void>((resolve, reject) => fs.createReadStream(r.file!.path).on("error", reject).pipe(res).on("finish", resolve));
    return;
  }
  const body = JSON.stringify(r.json ?? {});
  res.writeHead(r.status ?? 200, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body) });
  res.end(body);
};

/** The raw body, or 413 once it passes `limit` bytes. */
export const readBody = (req: IncomingMessage, limit: number): Promise<Buffer> => {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > limit) return Promise.reject(new HttpError(413, "too-large", `body over ${limit} bytes`));
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, "too-large", `body over ${limit} bytes`));
        req.pause();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
};

export const readJson = async (req: IncomingMessage, limit: number): Promise<unknown> => {
  if (!String(req.headers["content-type"] ?? "").includes("application/json")) throw new HttpError(415, "unsupported-media-type", "send application/json");
  const buf = await readBody(req, limit);
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    throw new HttpError(400, "bad-json", "body is not valid JSON");
  }
};

export const readForm = async (req: IncomingMessage, limit: number): Promise<FormData> => {
  const type = String(req.headers["content-type"] ?? "");
  if (!type.startsWith("multipart/form-data")) throw new HttpError(415, "unsupported-media-type", "send multipart/form-data");
  const buf = await readBody(req, limit);
  try {
    return await new Request("http://localhost/", { method: "POST", headers: { "content-type": type }, body: buf }).formData();
  } catch {
    throw new HttpError(400, "bad-multipart", "body is not valid multipart/form-data");
  }
};
