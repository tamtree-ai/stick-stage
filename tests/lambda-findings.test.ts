import { describe, expect, it } from "vitest";
import { toFindings } from "../lambda/findings";

describe("toFindings: the Lambda reply's findings for Tamtree 2.7.0", () => {
  it("maps a self-check finding, frame and scene into `at`", () => {
    expect(
      toFindings([
        { check: "faces-safe", level: "error", frame: 940, message: "june's face leaves the safe area" },
        { check: "length", level: "info", message: "35.0 s long", scene: "s2" },
      ]),
    ).toEqual([
      { level: "error", message: "june's face leaves the safe area", check: "faces-safe", at: { frame: 940 } },
      { level: "info", message: "35.0 s long", check: "length", at: { scene: "s2" } },
    ]);
  });

  it("maps a request diagnostic's path into the item it came in", () => {
    expect(
      toFindings([{ level: "error", code: "unknown-pose", path: "skit.beats[2].actions[0].pose", message: "no such pose" }]),
    ).toEqual([
      { level: "error", message: "no such pose", check: "unknown-pose", path: "items[0].json.skit.beats[2].actions[0].pose" },
    ]);
  });

  it("skips what it can't read, and reads an unknown level as info", () => {
    expect(toFindings([null, "text", { level: "error" }, { level: "fatal", message: "m" }])).toEqual([
      { level: "info", message: "m" },
    ]);
  });
});
