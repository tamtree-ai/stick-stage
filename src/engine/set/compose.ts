import { z } from "zod";
import type { Aspect } from "../format/aspect";
import { rand, randRange } from "../lib/seed";
import { SetSchema, type SetDef, type SetPart } from "./schema";

/**
 * Places from a description: `{ setting: "park", time: "sunset", features: ["pond", "bench"] }`
 * becomes a story-kit set, laid out the same way every time for the same seed. The cast stands
 * in the middle band; tall things go to the edges, buildings sit behind, and a bench goes under
 * the marks it seats.
 */
export const SETTINGS = ["park", "garden", "meadow", "forest", "beach", "village", "clubhouse", "bedroom", "living-room", "kitchen"] as const;
export const TIMES = ["day", "sunset", "night"] as const;
export const FEATURES = [
  "tree",
  "apple-tree",
  "tall-tree",
  "bush",
  "flowers",
  "pond",
  "rock",
  "fence",
  "house",
  "clubhouse",
  "bench",
  "path",
  "window",
  "door",
  "rug",
  "bed",
  "table",
  "shelf",
  "sofa",
] as const;
export type Setting = (typeof SETTINGS)[number];
export type Feature = (typeof FEATURES)[number];

export const PlaceSchema = z.strictObject({
  setting: z.enum(SETTINGS),
  time: z.enum(TIMES).default("day"),
  /** Autumn colours outdoors. */
  season: z.enum(["summer", "autumn"]).default("summer"),
  /** What else is there, on top of the setting's own features. */
  features: z.array(z.enum(FEATURES)).max(10).default([]),
  /** Marks whose cast member sits (adds a bench outdoors, uses the bed in a bedroom). */
  seats: z.array(z.string()).default([]),
  /** Another seed re-rolls the layout. */
  seed: z.union([z.string(), z.number()]).default(1),
  /** One line for whoever reads the catalog. */
  description: z.string().max(200).optional(),
});
export type Place = z.infer<typeof PlaceSchema>;
export type PlaceInput = z.input<typeof PlaceSchema>;

const INDOOR: readonly Setting[] = ["bedroom", "living-room", "kitchen"];

/** What each setting brings without being asked. */
const SETTING_FEATURES: Record<Setting, readonly Feature[]> = {
  park: ["tree", "tree", "bush", "flowers", "path"],
  garden: ["fence", "flowers", "flowers", "apple-tree", "bush"],
  meadow: ["flowers", "flowers", "rock", "tall-tree"],
  forest: ["tall-tree", "tall-tree", "tree", "tall-tree", "bush", "rock"],
  beach: ["rock"],
  village: ["house", "house", "tree", "path", "fence"],
  clubhouse: ["clubhouse", "tree", "flowers", "bush"],
  bedroom: ["window", "bed", "rug", "shelf"],
  "living-room": ["window", "rug", "door", "shelf"],
  kitchen: ["window", "table", "door", "shelf"],
};

const PART_OF: Record<Feature, { part: string; variant?: string }> = {
  tree: { part: "story-tree" },
  "apple-tree": { part: "story-tree", variant: "apple" },
  "tall-tree": { part: "story-tree", variant: "tall" },
  bush: { part: "story-bush" },
  flowers: { part: "story-flowers" },
  pond: { part: "story-pond" },
  rock: { part: "story-rock" },
  fence: { part: "story-fence" },
  house: { part: "story-house" },
  clubhouse: { part: "story-clubhouse" },
  bench: { part: "story-bench" },
  path: { part: "story-ground" },
  window: { part: "story-window" },
  door: { part: "story-door" },
  rug: { part: "story-rug" },
  bed: { part: "story-bed" },
  table: { part: "story-table" },
  shelf: { part: "story-shelf" },
  sofa: { part: "story-sofa" },
};

/** Where a feature may go: the edges (tall), anywhere behind (buildings), the ground at the edges, or fixed. */
type Lane = "edge" | "back" | "ground" | "wall" | "center";
const LANE: Record<Feature, Lane> = {
  tree: "edge",
  "apple-tree": "edge",
  "tall-tree": "edge",
  bush: "ground",
  flowers: "ground",
  pond: "ground",
  rock: "ground",
  fence: "center",
  house: "back",
  clubhouse: "back",
  bench: "center",
  path: "center",
  window: "wall",
  door: "edge",
  rug: "center",
  bed: "edge",
  table: "edge",
  shelf: "wall",
  sofa: "center",
};

/** Frame layout per aspect: ground line, figure scale, marks, and the slots each lane may use. */
const FRAMES: Record<Aspect, { groundY: number; fig: number; marks: Record<string, number>; edge: number[]; ground: number[]; back: number[]; wall: number[] }> = {
  "16:9": {
    groundY: 900,
    fig: 620,
    marks: { "far-left": 0.24, left: 0.37, center: 0.5, right: 0.63, "far-right": 0.76 },
    edge: [0.07, 0.93, 0.16, 0.85],
    ground: [0.12, 0.88, 0.2, 0.8, 0.04, 0.96],
    back: [0.8, 0.2, 0.62, 0.38],
    wall: [0.18, 0.82, 0.5],
  },
  "9:16": {
    groundY: 1500,
    fig: 760,
    marks: { left: 0.3, center: 0.5, right: 0.7 },
    edge: [0.06, 0.94, 0.14, 0.86],
    ground: [0.1, 0.9, 0.04, 0.96],
    back: [0.78, 0.22],
    wall: [0.25, 0.75],
  },
};

const paletteOf = (p: Place): string => {
  if (p.setting === "bedroom") return "story-bedroom";
  if (INDOOR.includes(p.setting)) return "story-indoor";
  if (p.time === "night") return "story-night";
  if (p.time === "sunset") return "story-sunset";
  if (p.setting === "beach") return "story-beach";
  return p.season === "autumn" ? "story-autumn" : "story-day";
};

const part = (id: string, extra: Partial<SetPart> = {}): SetPart => ({ part: id, size: 1, flip: false, dx: 0, seatFor: [], ...extra });

/** A seeded shuffle that never changes for the same seed and key. */
const shuffled = <T,>(xs: readonly T[], seed: string, key: string): T[] =>
  xs.map((x, i) => ({ x, k: rand(seed, `${key}${i}`) })).sort((a, b) => a.k - b.k).map((e) => e.x);

/** Compose a place into a story-kit set. `id` becomes the set id. */
export const composePlace = (id: string, input: PlaceInput, aspect: Aspect = "16:9"): SetDef => {
  const p = PlaceSchema.parse(input);
  const f = FRAMES[aspect];
  const seed = `${p.setting}:${p.seed}`;
  const indoor = INDOOR.includes(p.setting);
  const wants = [...SETTING_FEATURES[p.setting], ...p.features];
  // Seats: a bench outdoors, the bed in a bedroom, a sofa in other rooms.
  if (p.seats.length && !indoor && !wants.includes("bench")) wants.push("bench");
  if (p.seats.length && indoor && p.setting !== "bedroom" && !wants.includes("sofa")) wants.push("sofa");

  const layers: SetPart[] = indoor
    ? [part("story-wall"), part("story-floor")]
    : p.setting === "beach"
      ? [part("story-sky", { variant: p.time === "night" ? "moon" : "sun" }), part("story-sea")]
      : [part("story-sky", { variant: p.time === "night" ? "moon" : "sun" }), part("story-hills"), part("story-ground", { variant: wants.includes("path") ? "path" : undefined })];
  const back: SetPart[] = [];
  const front: SetPart[] = [];
  const pools: Record<Exclude<Lane, "center">, number[]> = {
    edge: shuffled(f.edge, seed, "edge"),
    ground: shuffled(f.ground, seed, "ground"),
    back: shuffled(f.back, seed, "back"),
    wall: shuffled(f.wall, seed, "wall"),
  };
  // Tall things never share a slot: a window over a door, a tree through a house.
  const used: number[] = [];
  const take = (lane: Exclude<Lane, "center">): number | undefined => {
    const pool = pools[lane];
    const i = lane === "ground" ? 0 : pool.findIndex((x) => used.every((u) => Math.abs(u - x) > 0.08));
    if (i < 0 || i >= pool.length) return undefined;
    const [x] = pool.splice(i, 1);
    if (lane !== "ground") used.push(x!);
    return x;
  };
  const placed = new Set<Feature>();

  wants.forEach((feat, i) => {
    const lane = LANE[feat];
    const { part: pid, variant } = PART_OF[feat];
    const jitter = (lo: number, hi: number) => randRange(seed, `${feat}${i}`, lo, hi);
    if (feat === "path") return;
    if (lane === "center") {
      if (placed.has(feat)) return;
      placed.add(feat);
      if (feat === "bench") back.push(part(pid, { mark: "center", size: 1.4, seatFor: p.seats }));
      else if (feat === "sofa") back.push(part(pid, { mark: p.seats.length === 1 ? p.seats[0] : "center", size: p.seats.length === 1 ? 0.9 : 1.4, seatFor: p.seats }));
      else if (feat === "rug") back.push(part(pid, { mark: "center", size: 1.2 }));
      else back.push(part(pid));
      return;
    }
    if (feat === "bed" && p.seats.length) {
      if (placed.has(feat)) return;
      placed.add(feat);
      back.push(part(pid, { mark: p.seats[0], size: 1.3, seatFor: p.seats }));
      return;
    }
    const x = take(lane);
    if (x === undefined) return;
    const flip = x > 0.5;
    const size = lane === "edge" ? jitter(0.95, 1.25) : lane === "back" ? jitter(0.9, 1.1) : jitter(0.8, 1.2);
    const seat = { x, size, flip, variant, seed: `${feat}${i}` };
    (lane === "back" || lane === "wall" || lane === "edge" ? back : front).push(part(pid, seat));
  });
  // Back first (buildings behind trees), then the rest.
  const order = (s: SetPart) => (s.part === "story-house" || s.part === "story-clubhouse" ? 0 : s.part === "story-fence" ? 1 : 2);
  back.sort((a, b) => order(a) - order(b));
  if (indoor && p.time === "night") for (const w of back) if (w.part === "story-window") w.variant = "night";

  const description = p.description ?? `${p.time === "day" ? "" : `${p.time} `}${p.setting.replace("-", " ")}${p.features.length ? ` with ${p.features.join(", ")}` : ""}`.trim();
  return SetSchema.parse({
    schemaVersion: 1,
    id,
    aspect,
    kit: "story",
    description,
    tags: ["story", p.setting, p.time, ...p.features],
    palette: paletteOf(p),
    groundY: f.groundY,
    figureHeightPx: f.fig,
    layers: [...layers, ...back, ...front],
    marks: f.marks,
  });
};

