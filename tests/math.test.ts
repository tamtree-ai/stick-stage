import { describe, expect, it } from "vitest";
import { lerpAngle, wrapDeg } from "../src/engine/lib/math";
import { easeOutBack } from "../src/engine/lib/easing";

describe("wrapDeg", () => {
  it("wraps into (-180, 180]", () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(180)).toBe(180);
    expect(wrapDeg(-180)).toBe(180);
    expect(wrapDeg(720 + 45)).toBe(45);
  });
});

describe("lerpAngle (shortest arc)", () => {
  it("crosses the ±180 seam the short way", () => {
    expect(lerpAngle(170, -170, 0.5)).toBeCloseTo(180);
    expect(lerpAngle(-170, 170, 0.5)).toBeCloseTo(-180);
  });
  it("goes the short way around 0", () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(360);
    expect(lerpAngle(10, 350, 0.25)).toBeCloseTo(5);
  });
  it("hits the endpoints and supports overshoot", () => {
    expect(lerpAngle(20, 80, 0)).toBe(20);
    expect(lerpAngle(20, 80, 1)).toBe(80);
    expect(lerpAngle(20, 80, 1.1)).toBeCloseTo(86);
  });
});

describe("easeOutBack", () => {
  it("starts at 0, ends at 1, overshoots in between", () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
    const peak = Math.max(...[0.5, 0.6, 0.7, 0.8, 0.9].map((t) => easeOutBack(t)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.15);
  });
});
