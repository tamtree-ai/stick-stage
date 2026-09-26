import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JobFailure, jobQueue, type JobRun } from "../src/server/jobs";
import { tmpDir } from "./server-fixtures";

const quiet = { log: () => undefined };
const newJob = (q: ReturnType<typeof jobQueue>) => q.enqueue(q.reserve().id);

describe("job queue", () => {
  it("runs one job at a time, in order", async () => {
    const order: string[] = [];
    let concurrent = 0;
    const run: JobRun = async (job) => {
      concurrent++;
      expect(concurrent).toBe(1);
      await new Promise((r) => setTimeout(r, 5));
      order.push(job.id);
      concurrent--;
      return {};
    };
    const q = jobQueue({ jobsDir: tmpDir(), run, ...quiet });
    const ids = [newJob(q), newJob(q), newJob(q)].map((j) => j.id);
    await q.drain();
    expect(order).toEqual(ids);
    expect(ids.map((id) => q.get(id)!.status)).toEqual(["succeeded", "succeeded", "succeeded"]);
  });

  it("records failures with their code and patch; crashes become internal", async () => {
    let n = 0;
    const run: JobRun = async () => {
      if (n++ === 0) throw new JobFailure("check-failed", "self-check found 1 error(s)", { title: "x" });
      throw new Error("boom");
    };
    const q = jobQueue({ jobsDir: tmpDir(), run, ...quiet });
    const [a, b] = [newJob(q), newJob(q)];
    await q.drain();
    expect(q.get(a.id)).toMatchObject({ status: "failed", title: "x", error: { code: "check-failed" } });
    expect(q.get(b.id)).toMatchObject({ status: "failed", error: { code: "internal", message: "boom" } });
  });

  it("persists progress to job.json", async () => {
    const jobsDir = tmpDir();
    const q = jobQueue({ jobsDir, run: async (_, { update }) => (update({ stage: "render", progress: 0.5 }), { durationSec: 12 }), ...quiet });
    const job = newJob(q);
    await q.drain();
    expect(JSON.parse(fs.readFileSync(path.join(jobsDir, job.id, "job.json"), "utf8"))).toMatchObject({ status: "succeeded", durationSec: 12, progress: 1 });
  });

  it("cancels queued and running jobs and removes their files", async () => {
    let started!: () => void;
    const running = new Promise<void>((r) => (started = r));
    const run: JobRun = (_, { signal, dir }) =>
      new Promise((_, reject) => {
        fs.writeFileSync(path.join(dir, "partial.mp4"), "x");
        started();
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const q = jobQueue({ jobsDir: tmpDir(), run, ...quiet });
    const [a, b] = [newJob(q), newJob(q)];
    await running;
    expect((await q.cancel(b.id))!.status).toBe("cancelled");
    expect((await q.cancel(a.id))!.status).toBe("cancelled");
    expect(fs.readdirSync(q.dirOf(a.id))).toEqual(["job.json"]);
    await q.drain();
    expect(q.depth()).toBe(0);
  });

  it("re-queues unfinished jobs after a restart", async () => {
    const jobsDir = tmpDir();
    const first = jobQueue({ jobsDir, run: () => new Promise(() => undefined), ...quiet });
    const [a, b] = [newJob(first), newJob(first)];
    await new Promise((r) => setTimeout(r, 5));
    expect(first.get(a.id)!.status).toBe("running");
    const ran: string[] = [];
    const second = jobQueue({ jobsDir, run: async (j) => (ran.push(j.id), {}), ...quiet });
    second.recover();
    await second.drain();
    expect(ran).toEqual([a.id, b.id]);
  });

  it("sweeps finished jobs past the TTL", async () => {
    let t = Date.parse("2026-09-26T00:00:00Z");
    const q = jobQueue({ jobsDir: tmpDir(), run: async () => ({}), ttlMs: 3600_000, now: () => new Date(t), ...quiet });
    const job = newJob(q);
    await q.drain();
    t += 1800_000;
    expect(q.sweep()).toBe(0);
    t += 3600_000;
    expect(q.sweep()).toBe(1);
    expect(q.get(job.id)).toBeUndefined();
    expect(fs.existsSync(q.dirOf(job.id))).toBe(false);
  });
});
