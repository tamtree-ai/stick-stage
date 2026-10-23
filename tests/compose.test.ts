import { describe, expect, it } from "vitest";
import { composePlace, FEATURES, PART_INFO, SETTINGS, TIMES, SetSchema, seatHeightAt } from "../src/engine";

describe("composePlace", () => {
  it("every setting × time composes to a valid story-kit set with known parts", () => {
    for (const setting of SETTINGS)
      for (const time of TIMES)
        for (const aspect of ["16:9", "9:16"] as const) {
          const set = composePlace(`${setting}-${time}`, { setting, time }, aspect);
          expect(SetSchema.safeParse(set).success).toBe(true);
          expect(set.kit).toBe("story");
          expect(set.aspect).toBe(aspect);
          for (const p of set.layers) expect(PART_INFO[p.part], p.part).toBeDefined();
        }
  });

  it("same description, same layout; another seed re-rolls it", () => {
    const a = composePlace("p", { setting: "park", features: ["pond", "rock"] });
    expect(composePlace("p", { setting: "park", features: ["pond", "rock"] })).toEqual(a);
    expect(composePlace("p", { setting: "park", features: ["pond", "rock"], seed: 7 }).layers).not.toEqual(a.layers);
  });

  it("asked-for features appear", () => {
    for (const f of FEATURES) {
      if (f === "path") continue;
      const set = composePlace("x", { setting: "meadow", features: [f] });
      const part = { "apple-tree": "story-tree", "tall-tree": "story-tree" }[f as string] ?? `story-${f}`;
      expect(set.layers.some((l) => l.part === part), f).toBe(true);
    }
  });

  it("seats outdoors add a bench under the marks; a bedroom uses the bed", () => {
    const park = composePlace("x", { setting: "park", seats: ["left", "right"] });
    expect(seatHeightAt(park, "left")).toBeGreaterThan(0);
    expect(seatHeightAt(park, "right")).toBeGreaterThan(0);
    expect(seatHeightAt(composePlace("y", { setting: "bedroom", seats: ["left"] }), "left")).toBeGreaterThan(0);
  });

  it("tall things keep clear of the marks and of each other", () => {
    for (const setting of SETTINGS)
      for (const seed of [1, 2, 3]) {
        const set = composePlace("x", { setting, seed, features: ["tree", "door", "window"] });
        const tall = set.layers.filter((l) => ["story-tree", "story-window", "story-door", "story-shelf"].includes(l.part) && l.x !== undefined);
        for (const a of tall) for (const b of tall) if (a !== b) expect(Math.abs(a.x! - b.x!), `${setting} ${a.part}/${b.part}`).toBeGreaterThan(0.08);
        for (const t of set.layers.filter((l) => l.part === "story-tree")) for (const m of [set.marks.left!, set.marks.right!]) expect(Math.abs(t.x! - m)).toBeGreaterThan(0.08);
      }
  });

  it("an unknown feature is refused with the list", () => {
    expect(() => composePlace("x", { setting: "park", features: ["volcano" as never] })).toThrow(/tree/);
  });
});
