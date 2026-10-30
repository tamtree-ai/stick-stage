/** VizLab pages for the explainer kinds: each kind's two variants side by side (`clean` left, `bold` right), placed by slot. */
import type { FigureCue } from "../../engine";
import type { VizPage } from "./vizPages";

const cue = (at: number, c: Record<string, unknown>) => ({ at, cue: c as FigureCue });
const years = (from: number, values: number[]) => values.map((v, i) => [from + i, v] as [number, number]);
const both = (id: string, kind: string, params: Record<string, unknown>, label: string) => [
  { id: `${id}-clean`, kind, slot: "left" as const, label, params: { ...params, variant: "clean" } },
  { id: `${id}-bold`, kind, slot: "right" as const, label, params: { ...params, variant: "bold" } },
];

export const DATA_PAGES: VizPage[] = [
  {
    note: "line: draws on, a shaded span, an event, a labelled point",
    figures: both(
      "fees",
      "line",
      {
        series: [{ data: years(2016, [2.6, 2.9, 3.1, 3.4, 3.5, 3.9, 4.2, 4.6, 4.7, 4.8]), label: "fees" }, { data: years(2016, [2.1, 2.2, 2.4, 2.3, 2.9, 3.2, 3.3, 3.6, 3.9, 4.1]), dashed: true }],
        unit: { prefix: "$", suffix: "bn", decimals: 1 },
        draw: 0,
        span: { from: 2019, to: 2021, label: "pandemic" },
        events: [{ at: 2022, label: "fee rise" }],
        points: [{ at: 2016 }],
      },
      "Fee income",
    ),
    cues: [cue(10, { do: "set", id: "fees-clean", params: { draw: 1 }, durationMs: 2500 }), cue(10, { do: "set", id: "fees-bold", params: { draw: 1 }, durationMs: 2500 })],
  },
  {
    note: "bars: sorted, then one highlighted; horizontal on the right",
    figures: [
      { id: "m-clean", kind: "bars", slot: "left", label: "Gross margin", params: { series: [{ data: [["Costco", 12.6], ["Kroger", 22.3], ["Walmart", 24.1], ["Target", 28]] }], sort: "desc", unit: { suffix: "¢" } } },
      { id: "m-bold", kind: "bars", slot: "right", label: "Gross margin", params: { series: [{ data: [["Costco", 12.6], ["Kroger", 22.3], ["Walmart", 24.1], ["Target", 28]] }], orientation: "horizontal", sort: "asc", unit: { suffix: "¢" }, variant: "bold" } },
    ],
    cues: [cue(80, { do: "set", id: "m-clean", params: { highlight: ["Costco"] } }), cue(80, { do: "set", id: "m-bold", params: { highlight: ["Costco"] } })],
  },
  {
    note: "counter: ticks up on the reveal, then to a new value",
    figures: both("price", "counter", { value: 4.99, from: 9.5, unit: { prefix: "$", decimals: 2 }, caption: "roast chicken", delta: { value: -47, unit: { suffix: "%" }, good: "down" } }, "Price"),
    cues: [cue(90, { do: "set", id: "price-clean", params: { value: 5.49 } }), cue(90, { do: "set", id: "price-bold", params: { value: 5.49 } })],
  },
  {
    note: "map: a choropleth, then a fly to Europe with a route and dots",
    figures: both(
      "world",
      "map",
      {
        data: [["USA", 620], ["CAN", 110], ["MEX", 42], ["JPN", 36], ["GBR", 29], ["KOR", 19], ["AUS", 16], ["ESP", 5], ["FRA", 2]],
        routes: [{ from: [-0.1, 51.5], to: [2.35, 48.9] }],
        points: [{ lon: -0.1, lat: 51.5, label: "London" }, { lon: 2.35, lat: 48.9, label: "Paris" }],
      },
      "Warehouses",
    ),
    cues: [cue(60, { do: "set", id: "world-clean", params: { zoom: ["GBR", "FRA", "ESP"] }, durationMs: 1500 }), cue(60, { do: "set", id: "world-bold", params: { zoom: ["GBR", "FRA", "ESP"] }, durationMs: 1500 })],
  },
];
