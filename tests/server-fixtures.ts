import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { library, reactions, safeArea, series, sets, sfxLibrary } from "../src/data";
import { workspace, type Project } from "../src/node";
import { createService } from "../src/server/app";
import { jobQueue, type JobRun } from "../src/server/jobs";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const PROJECT: Project = { ws: workspace(ROOT), lib: library, sets, sfx: sfxLibrary, reactions, safeArea, series };
export const TOKEN = "test-token";
export const FINE = path.join(ROOT, "public/skits/fine");

export const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "stickstage-server-"));

/** A pipeline that writes a fake MP4 instead of rendering. */
export const fakeRun: JobRun = async (job, { dir }) => {
  fs.mkdirSync(path.join(dir, "out"), { recursive: true });
  fs.writeFileSync(path.join(dir, "out/skit.mp4"), `mp4 for ${job.id}`);
  return { title: "fake", outputs: { mp4: { file: "out/skit.mp4", type: "video/mp4", bytes: fs.statSync(path.join(dir, "out/skit.mp4")).size } } };
};

export const startService = async (o: { run?: JobRun; limits?: { uploadBytes?: number } } = {}) => {
  const jobsDir = tmpDir();
  const queue = jobQueue({ jobsDir, run: o.run ?? fakeRun, log: () => undefined });
  queue.recover();
  const server = createService({ project: PROJECT, queue, token: TOKEN, limits: o.limits });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (p: string, init: RequestInit = {}, token: string | null = TOKEN) =>
    fetch(base + p, { ...init, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers as Record<string, string>) } });
  const close = () => new Promise<void>((r) => server.close(() => r()));
  return { base, call, queue, jobsDir, close };
};

/** `fine` as a render request: skit.json, voice.json and its WAVs. Mutate the parts to break it. */
export const fineParts = () => ({
  skit: JSON.parse(fs.readFileSync(path.join(FINE, "skit.json"), "utf8")),
  voice: JSON.parse(fs.readFileSync(path.join(FINE, "voice.json"), "utf8")) as { schemaVersion: 1; lines: { id: string; text: string; audio: string }[] },
  files: Object.fromEntries(fs.readdirSync(path.join(FINE, "voice")).map((f) => [f, new Uint8Array(fs.readFileSync(path.join(FINE, "voice", f)))])) as Record<string, Uint8Array>,
  options: undefined as Record<string, unknown> | undefined,
});

export const formOf = (p: ReturnType<typeof fineParts>) => {
  const form = new FormData();
  form.set("skit", JSON.stringify(p.skit));
  form.set("voice", JSON.stringify(p.voice));
  if (p.options) form.set("options", JSON.stringify(p.options));
  for (const [name, bytes] of Object.entries(p.files)) form.append("audio", new Blob([bytes as BlobPart]), name);
  return form;
};
