import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fineParts, formOf, ROOT, startService } from "./server-fixtures";

type Svc = Awaited<ReturnType<typeof startService>>;
let svc: Svc;
beforeAll(async () => {
  svc = await startService({ limits: { uploadBytes: 5 * 1024 * 1024 } });
});
afterAll(() => svc.close());

const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const codes = async (res: Response) => ((await res.json()) as { error: { diagnostics: { code: string }[] } }).error.diagnostics.map((d) => d.code);

describe("auth", () => {
  it("healthz is open", async () => {
    const res = await svc.call("/healthz", {}, null);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, queue: 0 });
  });
  it("everything else needs the bearer token", async () => {
    expect((await svc.call("/validate", json({ skit: {} }), null)).status).toBe(401);
    expect((await svc.call("/validate", json({ skit: {} }), "wrong")).status).toBe(401);
    expect((await svc.call("/jobs/00000000-0000-0000-0000-000000000000", {}, null)).status).toBe(401);
  });
  it("GET /sets lists the catalog with seated marks", async () => {
    const res = await svc.call("/sets");
    expect(res.status).toBe(200);
    const { sets } = (await res.json()) as { sets: { id: string; description: string; tags: string[]; seated: string[] }[] };
    expect(sets.length).toBeGreaterThanOrEqual(16);
    expect(sets.find((s) => s.id === "bedroom-1")).toMatchObject({ seated: ["left", "right"] });
    expect(sets.find((s) => s.id === "cafe-1")?.tags).toContain("coffee");
  });
  it("GET /catalog reports the same version as the shipped data and /healthz", async () => {
    const { catalog } = await import("../src/data");
    const res = await svc.call("/catalog");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string; characters: { id: string }[]; templates: { id: string; cast: number }[]; sets: unknown[] };
    expect(body.version).toMatch(/^c1-[0-9a-f]{16}$/);
    expect(body.version).toBe(catalog.version);
    expect(body.characters.map((c) => c.id)).toEqual(expect.arrayContaining(["milo", "june"]));
    expect(body.templates.find((t) => t.id === "pov-monologue")).toMatchObject({ cast: 1 });
    expect(body.sets.length).toBeGreaterThanOrEqual(16);
    expect(await (await svc.call("/healthz", {}, null)).json()).toMatchObject({ catalogVersion: catalog.version });
  });
  it("unknown routes and methods", async () => {
    expect((await svc.call("/nope")).status).toBe(404);
    expect((await svc.call("/validate")).status).toBe(405);
  });
});

describe("POST /validate", () => {
  it("stages a premise and lists the lines to voice with voice hints", async () => {
    const premise = JSON.parse(fs.readFileSync(path.join(ROOT, "public/skits/exchange-lab/premise.json"), "utf8"));
    const res = await svc.call("/validate", json({ premise }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skit: { beats: unknown[] }; lines: { id: string; speaker: string; text: string }[]; estimatedDurationSec: number; check: { ran: string[] } };
    expect(body.lines.map((l) => l.text)).toEqual(premise.lines.map((l: { text: string }) => l.text));
    expect(body.lines[0]).toHaveProperty("voice");
    expect(body.skit.beats.length).toBeGreaterThanOrEqual(premise.lines.length);
    expect(body.estimatedDurationSec).toBeGreaterThan(3);
    expect(body.check.ran.length).toBeGreaterThan(0);
  });
  it("takes a skit as-is", async () => {
    const res = await svc.call("/validate", json({ skit: fineParts().skit }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { lines: { id: string }[] }).lines.map((l) => l.id)).toEqual(["b1", "b2", "b4"]);
  });
  it("422 with the compiler's diagnostics", async () => {
    const skit = { ...fineParts().skit, set: "no-such-set" };
    const res = await svc.call("/validate", json({ skit }));
    expect(res.status).toBe(422);
    expect((await codes(res)).length).toBeGreaterThan(0);
  });
  it("checks a pinned catalog_version before anything else", async () => {
    const { catalog } = await import("../src/data");
    const ok = await svc.call("/validate", json({ skit: fineParts().skit, catalog_version: catalog.version }));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { catalogVersion: string }).catalogVersion).toBe(catalog.version);
    const stale = await svc.call("/validate", json({ skit: fineParts().skit, catalog_version: "c1-0000000000000000" }));
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { error: { code: string; expected: string } }).error).toMatchObject({ code: "catalog-mismatch", expected: catalog.version });
  });
  it("400 unless exactly one of premise / skit", async () => {
    expect((await svc.call("/validate", json({}))).status).toBe(400);
    expect((await svc.call("/validate", json({ skit: {}, premise: {} }))).status).toBe(400);
    expect((await svc.call("/validate", { method: "POST", headers: { "content-type": "application/json" }, body: "{" })).status).toBe(400);
  });
  it("turns a draft reply into a staged skit and corrects a made-up mood", async () => {
    const brief = { topic: "returning a gift", template: "exchange", set: "cafe-1", cast: [{ id: "milo", character: "milo" }, { id: "june", character: "june" }] };
    const reply = JSON.stringify({
      title: "The receipt",
      description: "It comes back.",
      hashtags: ["gift"],
      scenes: [{ lines: [
        { who: "milo", text: "I brought the gift back.", expression: "earnest" },
        { who: "june", text: "The receipt is the point.", expression: "smug", slam: "POINT" },
      ] }],
    });
    const res = await svc.call("/validate", json({ reply, brief }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { premise: { set: string; lines: { expression?: string }[] }; skit: { beats: { punchline?: boolean }[] }; warnings: { code: string }[] };
    expect(body.premise.set).toBe("cafe-1");
    expect(body.premise.lines[0]?.expression).toBe("neutral");
    expect(body.skit.beats.at(-1)?.punchline).toBe(true);
    expect(body.warnings.map((w) => w.code)).toContain("mood");
  });
  it("422 invalid-reply carries one repair prompt", async () => {
    const brief = { topic: "gifts", cast: [{ id: "milo", character: "milo" }, { id: "june", character: "june" }] };
    const res = await svc.call("/validate", json({ reply: "not json", brief }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; repair: { prompt: string } } };
    expect(body.error.code).toBe("invalid-reply");
    expect(body.error.repair.prompt).toContain("not JSON");
  });
});

describe("POST /write/prompt", () => {
  it("needs the bearer token", async () => {
    expect((await svc.call("/write/prompt", json({ mode: "draft", brief: { topic: "x", cast: [{ id: "milo", character: "milo" }] } }), null)).status).toBe(401);
  });
  it("builds a draft prompt and a lines-only change prompt", async () => {
    const { catalog } = await import("../src/data");
    const brief = { topic: "group chats", cast: [{ id: "milo", character: "milo" }, { id: "june", character: "june" }] };
    const draft = await svc.call("/write/prompt", json({ mode: "draft", brief, catalog_version: catalog.version }));
    expect(draft.status).toBe(200);
    const body = (await draft.json()) as { writer: string; system: string; prompt: string; catalogVersion: string };
    expect(body.writer).toBe("w2");
    expect(body.catalogVersion).toBe(catalog.version);
    expect(body.system).toContain("milo");
    expect(body.prompt).toContain("group chats");
    const skit = JSON.parse(fs.readFileSync(path.join(ROOT, "public/skits/exchange-lab/skit.json"), "utf8"));
    const revise = await svc.call("/write/prompt", json({ mode: "revise", skit, note: "Shorter ending." }));
    expect(revise.status).toBe(200);
    const change = (await revise.json()) as { prompt: string };
    expect(change.prompt).toContain("Shorter ending.");
    expect(change.prompt).not.toContain("pauseBeforeMs");
    const stale = await svc.call("/write/prompt", json({ mode: "draft", brief, catalog_version: "c1-0000000000000000" }));
    expect(stale.status).toBe(409);
  });
});

describe("POST /render", () => {
  it("queues a job, runs it, serves its files", async () => {
    const res = await svc.call("/render", { method: "POST", body: formOf(fineParts()) });
    expect(res.status).toBe(202);
    const job = (await res.json()) as { id: string; status: string };
    expect(job.status).toBe("queued");
    const dir = svc.queue.dirOf(job.id);
    expect(fs.readdirSync(path.join(dir, "voice")).sort()).toEqual(["b1.wav", "b2.wav", "b4.wav"]);
    await svc.queue.drain();
    const done = (await (await svc.call(`/jobs/${job.id}`)).json()) as { status: string; outputs: { mp4: { url: string } } };
    expect(done.status).toBe("succeeded");
    const file = await svc.call(done.outputs.mp4.url);
    expect(file.headers.get("content-type")).toBe("video/mp4");
    expect(await file.text()).toBe(`mp4 for ${job.id}`);
    expect((await svc.call(`/jobs/${job.id}/files/srt`)).status).toBe(404);
  });

  const rejects = async (mutate: (p: ReturnType<typeof fineParts>) => void) => {
    const p = fineParts();
    mutate(p);
    const res = await svc.call("/render", { method: "POST", body: formOf(p) });
    expect(res.status).toBe(422);
    return codes(res);
  };
  it("a spoken line without voice", async () => expect(await rejects((p) => (p.voice.lines = p.voice.lines.slice(1)))).toEqual(["voice-missing"]));
  it("voice text that isn't the script", async () => expect(await rejects((p) => (p.voice.lines[0]!.text = "Hey."))).toEqual(["voice-stale"]));
  it("audio paths outside voice/", async () => expect(await rejects((p) => (p.voice.lines[0]!.audio = "../../skit.json"))).toEqual(["audio-path"]));
  it("a missing upload", async () => expect(await rejects((p) => delete p.files["b2.wav"])).toEqual(["audio-missing"]));
  it("an upload that isn't audio", async () => expect(await rejects((p) => (p.files["b4.wav"] = new TextEncoder().encode('{"error":"quota"}')))).toEqual(["audio-format"]));
  it("an invalid skit, with paths under skit.", async () => {
    const p = fineParts();
    delete p.skit.cast;
    const res = await svc.call("/render", { method: "POST", body: formOf(p) });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { diagnostics: { path: string }[] } };
    expect(body.error.diagnostics[0]!.path).toMatch(/^skit\./);
  });
  it("oversized uploads get 413", async () => {
    const p = fineParts();
    p.files["big.wav"] = new Uint8Array(6 * 1024 * 1024);
    expect((await svc.call("/render", { method: "POST", body: formOf(p) })).status).toBe(413);
  });
  it("not multipart → 415", async () => expect((await svc.call("/render", json({}))).status).toBe(415));
  it("unknown jobs → 404", async () => {
    expect((await svc.call("/jobs/00000000-0000-0000-0000-000000000000")).status).toBe(404);
    expect((await svc.call("/jobs/..%2F..%2Fetc")).status).toBe(404);
  });
});
