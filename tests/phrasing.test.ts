import { describe, expect, it } from "vitest";
import { deliveryFor, phrasesOf } from "../src/engine";

describe("phrasing (how a line is performed)", () => {
  it("splits at punctuation with a pause after each phrase but the last", () => {
    expect(phrasesOf("A shell! A real one! It's mine!")).toEqual([
      { text: "A shell!", pauseMs: 380 },
      { text: "A real one!", pauseMs: 380 },
      { text: "It's mine!", pauseMs: 0 },
    ]);
  });
  it("pauses longer for a question or an ellipsis than for a comma", () => {
    const [comma] = phrasesOf("Wow, Pim");
    const [question] = phrasesOf("Why? Because.");
    const [dots] = phrasesOf("Well... maybe.");
    expect(comma!.pauseMs).toBeLessThan(question!.pauseMs);
    expect(question!.pauseMs).toBeLessThan(dots!.pauseMs);
  });
  it("keeps decimals whole and ends a phrase on a spaced dash", () => {
    expect(phrasesOf("It costs 3.5 coins").map((p) => p.text)).toEqual(["It costs 3.5 coins"]);
    expect(phrasesOf("Well — that was odd").map((p) => p.text)).toEqual(["Well—", "that was odd"]);
  });
  it("reads mood from the expression and the delivery hint", () => {
    expect(deliveryFor({ expression: "sad" }).speed).toBeLessThan(1);
    expect(deliveryFor({ expression: "excited" }).speed).toBeGreaterThan(1);
    expect(deliveryFor({ delivery: "dramatic" }).pauseScale).toBeGreaterThan(1.4);
    expect(deliveryFor({}).speed).toBe(1);
    const narrator = deliveryFor({ narrator: true });
    expect(narrator.speed).toBeLessThan(1);
    expect(narrator.pauseScale).toBeGreaterThan(1);
  });
  it("scales the pauses by the delivery", () => {
    expect(phrasesOf("No. Never.", { speed: 1, pauseScale: 2 })[0]!.pauseMs).toBe(840);
  });
});
