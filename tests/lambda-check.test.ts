import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkOnly, DESCRIPTION } from "../lambda/check";
import { PROJECT, WS } from "../scripts/lib/tools";

const sample = (name: string) => JSON.parse(fs.readFileSync(path.join(WS.publicDir, "skits", "fine", name), "utf8"));

describe("checkOnly: Tamtree's check-only call, before any voice exists", () => {
  it("passes a good skit without audio, and confirms the check", async () => {
    const reply = await checkOnly(PROJECT, { skit: sample("skit.json"), voice: sample("voice.json") });
    expect(reply.checked).toBe(true);
    expect(reply.items).toEqual([]);
    // The self-check runs on estimated timings, so it can warn but never block.
    expect(reply.findings.filter((f) => f.level === "error")).toEqual([]);
  });

  it("blocks on a voice line that no longer matches the skit", async () => {
    const voice = sample("voice.json");
    voice.lines[0].text = `${voice.lines[0].text} (edited)`;
    const reply = await checkOnly(PROJECT, { skit: sample("skit.json"), voice });
    const errors = reply.findings.filter((f) => f.level === "error");
    expect(errors.map((f) => f.check)).toContain("voice-stale");
    expect(errors.every((f) => f.check !== "audio-missing")).toBe(true);
  });

  it("blocks on a skit that does not parse, pointing into item 0", async () => {
    const reply = await checkOnly(PROJECT, { skit: { beats: "nope" }, voice: sample("voice.json") });
    const errors = reply.findings.filter((f) => f.level === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((f) => f.path?.startsWith("items[0].json.skit"))).toBe(true);
  });

  it("asks for the parts it needs", async () => {
    const reply = await checkOnly(PROJECT, {});
    expect(reply.findings).toEqual([expect.objectContaining({ level: "error", check: "bad-request" })]);
  });
});

describe("DESCRIPTION", () => {
  it("declares only the returned item, in Tamtree's contract dialect", () => {
    expect(Object.keys(DESCRIPTION)).toEqual(["output_schema"]);
    expect(JSON.stringify(DESCRIPTION)).not.toContain("$ref");
  });
});
