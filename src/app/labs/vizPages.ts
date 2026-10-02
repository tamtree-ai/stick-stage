/** VizLab pages: every v1 figure primitive with its cues, in the band above the cast's heads. */
import type { FigureCue, FigureInput } from "../../engine";

export type VizPage = {
  note: string;
  figures: FigureInput[];
  cues: { at: number; cue: FigureCue }[];
};

export const PAGE_FRAMES = 150;

/** The band above the cast's heads (9:16, figure height ≤ 720 px). */
const BAND = { x: 0.5, y: 0.285, w: 0.88, h: 0.22 };
const LEFT = { x: 0.27, y: 0.285, w: 0.42, h: 0.2 };
const RIGHT = { x: 0.73, y: 0.285, w: 0.42, h: 0.2 };

const cue = (at: number, c: Record<string, unknown>) => ({ at, cue: c as FigureCue });

export const VIZ_TEX = [
  "a = \\frac{F}{m} = \\frac{\\class{t-m1}{m}\\,g}{\\class{t-m2}{m}} = \\class{t-g}{g}",
  "E = \\class{t-mass}{m}\\class{t-c}{c^2}",
];

export const PAGES: VizPage[] = [
  {
    note: "plot draws on, a marker rides it",
    figures: [
      {
        id: "fall",
        kind: "plot",
        at: BAND,
        label: "Distance fallen",
        params: {
          x: [0, 3],
          y: [0, 45],
          xLabel: "t (s)",
          yLabel: "d (m)",
          vars: { t: 0 },
          series: [{ fn: "0.5*9.8*x^2", label: "d = ½gt²", labelAt: 0.7 }],
          markers: [{ x: "t", guides: true }],
        },
      },
    ],
    cues: [cue(40, { do: "set", id: "fall", params: { vars: { t: 3 } }, durationMs: 3000 })],
  },
  {
    note: "vectors tip to tail · a callout",
    figures: [
      {
        id: "forces",
        kind: "vector",
        at: LEFT,
        label: "Forces add",
        params: {
          x: [-1, 4],
          y: [-3, 1],
          vectors: [
            { v: [3, 0], label: "push" },
            { v: [0, -2], label: "weight" },
          ],
          sum: { label: "net" },
        },
      },
      {
        id: "comp",
        kind: "vector",
        at: RIGHT,
        label: "Components",
        params: {
          x: [-1, 4],
          y: [-1, 4],
          vectors: [{ v: [3, 2.5], components: true, label: "v" }],
        },
      },
    ],
    cues: [],
  },
  {
    note: "two waves and their sum",
    figures: [
      {
        id: "sum",
        kind: "wave",
        at: BAND,
        label: "Two waves add up",
        params: {
          mode: "sum",
          components: [
            { amp: 0.8, wavelength: 2, period: 1.6 },
            { amp: 0.6, wavelength: 1.4, period: 1.1 },
          ],
        },
      },
    ],
    cues: [],
  },
  {
    note: "a standing wave · a wave packet",
    figures: [
      {
        id: "standing",
        kind: "wave",
        at: LEFT,
        label: "Standing",
        params: { mode: "standing", components: [{ amp: 0.9, wavelength: 3, period: 1.4 }] },
      },
      {
        id: "packet",
        kind: "wave",
        at: RIGHT,
        label: "Packet",
        params: {
          mode: "packet",
          components: [{ amp: 1.6, wavelength: 0.5, period: 0.6 }],
          packetWidth: 0.5,
        },
      },
    ],
    cues: [],
  },
  {
    note: "Kepler orbit e=0.6, equal-time sectors, a callout to perihelion",
    figures: [
      {
        id: "orbit",
        kind: "orbit",
        at: BAND,
        label: "Equal areas, equal times",
        params: { e: 0.6, period: 4, sweep: 4, highlight: "perihelion", velocity: true },
      },
      {
        id: "fast",
        kind: "callout",
        hidden: true,
        layer: "front",
        at: { x: 0.24, y: 0.14, w: 0.34, h: 0.04 },
        params: { text: "speeds up here", target: "orbit.perihelion" },
      },
    ],
    cues: [cue(60, { do: "show", id: "fast" })],
  },
  {
    note: "powers-of-ten scale with a moving pointer",
    figures: [
      {
        id: "scale",
        kind: "scale",
        at: { x: 0.5, y: 0.3, w: 0.9, h: 0.14 },
        label: "Sizes, in metres",
        params: {
          min: -15,
          max: 21,
          step: 3,
          marks: [
            { value: -15, label: "proton" },
            { value: 0, label: "you" },
            { value: 7, label: "Earth" },
            { value: 21, label: "galaxy" },
          ],
          pointer: -15,
          pointerLabel: "here",
        },
      },
    ],
    cues: [cue(40, { do: "set", id: "scale", params: { pointer: 21 }, durationMs: 3200 })],
  },
  {
    note: "a charged gas bouncing in a box · 1000 dice rolled",
    figures: [
      {
        id: "gas",
        kind: "particles",
        at: LEFT,
        tag: "cartoon model",
        params: { count: 24, speed: 0.5, charged: true, colors: ["a1", "a2"], trail: 0.3 },
      },
      {
        id: "dice",
        kind: "histogram",
        at: RIGHT,
        label: "Fair die",
        params: { source: "dice", n: 0 },
      },
    ],
    cues: [cue(30, { do: "set", id: "dice", params: { n: 1000 }, durationMs: 4000 })],
  },
  {
    note: "myth → truth with a strike",
    figures: [
      {
        id: "drop",
        kind: "plot",
        at: BAND,
        params: { x: [0, 2], y: [0, 20], xLabel: "t (s)", yLabel: "d (m)" },
        state: "myth",
        states: {
          myth: {
            label: "Heavy falls faster",
            series: [
              { fn: "0.5*14*x^2", color: "myth", label: "heavy" },
              { fn: "0.5*5*x^2", color: "a1", label: "light", labelAt: 0.95 },
            ],
          },
          truth: {
            label: "Same rate",
            series: [{ fn: "0.5*9.8*x^2", color: "truth", label: "both" }],
          },
        },
      },
    ],
    cues: [cue(50, { do: "state", id: "drop", state: "truth", style: "strike" })],
  },
  {
    note: "an equation built term by term, terms lit and cancelled",
    figures: [
      {
        id: "eq",
        kind: "equation",
        hidden: true,
        at: { x: 0.5, y: 0.28, w: 0.84, h: 0.14 },
        params: { tex: VIZ_TEX[0] },
      },
    ],
    cues: [
      cue(10, { do: "show", id: "eq" }),
      cue(70, { do: "set", id: "eq", params: { highlight: ["t-m1", "t-m2"] } }),
      cue(105, { do: "set", id: "eq", params: { strike: ["t-m1", "t-m2"], highlight: ["t-g"] } }),
    ],
  },
  {
    note: "a credited Webb image in an eyepiece, slow zoom",
    figures: [
      {
        id: "pillars",
        kind: "image",
        at: { x: 0.5, y: 0.27, w: 0.5, h: 0.28 },
        reveal: "fade",
        label: "Pillars of Creation",
        params: { image: "pillars-webb", frame: "eyepiece", to: { x: 0.45, y: 0.4, zoom: 1.5 } },
      },
    ],
    cues: [],
  },
];
