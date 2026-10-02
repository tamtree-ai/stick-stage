import type { SetDef } from "../schema";
import { Floor, PlainWall, Wall } from "./room";
import { Plant, PictureFrame, Shelf, Window } from "./decor";
import { Cabinet, Clock, Desk, Door, OfficeChair, Whiteboard } from "./office";
import { Bench, Couch } from "./furniture";
import { Bush, Grass, Hills, Sky, StreetLamp, Tree } from "./outdoor";
import { Buildings, Hydrant, Shopfront, Sidewalk } from "./street";
import { Bed, Counter, FloorLamp, Fridge, Tv } from "./home";
import { Board, Curtain, Sand, Sea, Umbrella } from "./venue";
import type { PartComponent } from "./types";
import { Blueprint, FumeHood, GridFloor, LabBench, Nebula, Planet, Starfield, VoidBackdrop, WallChart } from "./science";

export const KITS = ["plain", "interior", "office", "park", "street", "beach", "abstract", "space", "lab"] as const;
export type Kit = (typeof KITS)[number];

export type PartInfo = {
  draw: PartComponent;
  /** Kits this part belongs to (SetLab groups by the first). */
  kits: readonly Kit[];
  /** Fills the frame (wall, floor, sky…) rather than standing in it. */
  backdrop?: boolean;
  /** Normally placed in the set's `foreground` list (draws over characters). */
  foreground?: boolean;
};

export const PART_INFO: Record<string, PartInfo> = {
  "plain-wall": { draw: PlainWall, kits: ["plain"], backdrop: true },
  wall: { draw: Wall, kits: ["interior", "office"], backdrop: true },
  floor: { draw: Floor, kits: ["interior", "office", "plain"], backdrop: true },
  window: { draw: Window, kits: ["interior", "office"] },
  shelf: { draw: Shelf, kits: ["interior", "office"] },
  frame: { draw: PictureFrame, kits: ["interior", "office"] },
  plant: { draw: Plant, kits: ["interior", "office"] },
  door: { draw: Door, kits: ["interior", "office"] },
  couch: { draw: Couch, kits: ["interior"] },
  clock: { draw: Clock, kits: ["office", "interior"] },
  whiteboard: { draw: Whiteboard, kits: ["office"] },
  cabinet: { draw: Cabinet, kits: ["office"] },
  chair: { draw: OfficeChair, kits: ["office"] },
  desk: { draw: Desk, kits: ["office"], foreground: true },
  sky: { draw: Sky, kits: ["park", "street"], backdrop: true },
  hills: { draw: Hills, kits: ["park"], backdrop: true },
  grass: { draw: Grass, kits: ["park"], backdrop: true },
  tree: { draw: Tree, kits: ["park", "street"] },
  bush: { draw: Bush, kits: ["park"] },
  bench: { draw: Bench, kits: ["park", "street"] },
  lamp: { draw: StreetLamp, kits: ["park", "street"] },
  buildings: { draw: Buildings, kits: ["street"], backdrop: true },
  sidewalk: { draw: Sidewalk, kits: ["street"], backdrop: true },
  shopfront: { draw: Shopfront, kits: ["street"] },
  hydrant: { draw: Hydrant, kits: ["street"] },
  curtain: { draw: Curtain, kits: ["plain"], backdrop: true },
  counter: { draw: Counter, kits: ["interior"] },
  fridge: { draw: Fridge, kits: ["interior"] },
  bed: { draw: Bed, kits: ["interior"] },
  tv: { draw: Tv, kits: ["interior"] },
  "floor-lamp": { draw: FloorLamp, kits: ["interior"] },
  board: { draw: Board, kits: ["office", "interior"] },
  sea: { draw: Sea, kits: ["beach"], backdrop: true },
  sand: { draw: Sand, kits: ["beach"], backdrop: true },
  umbrella: { draw: Umbrella, kits: ["beach"] },
  void: { draw: VoidBackdrop, kits: ["abstract", "space"], backdrop: true },
  "grid-floor": { draw: GridFloor, kits: ["abstract", "space"], backdrop: true },
  blueprint: { draw: Blueprint, kits: ["abstract"], backdrop: true },
  starfield: { draw: Starfield, kits: ["space"], backdrop: true },
  nebula: { draw: Nebula, kits: ["space"] },
  planet: { draw: Planet, kits: ["space"] },
  "lab-bench": { draw: LabBench, kits: ["lab"] },
  "fume-hood": { draw: FumeHood, kits: ["lab"] },
  "wall-chart": { draw: WallChart, kits: ["lab"] },
};

export const PARTS: Record<string, PartComponent> = Object.fromEntries(Object.entries(PART_INFO).map(([id, p]) => [id, p.draw]));

/** The minimal backdrop each kit needs, used by labs and as a starting point for new sets. */
export const KIT_BACKDROP: Record<Kit, SetDef["layers"]> = {
  plain: [part("plain-wall"), part("floor")],
  interior: [part("wall"), part("floor")],
  office: [part("wall", { pattern: "stripes" }), part("floor")],
  park: [part("sky"), part("hills"), part("grass")],
  street: [part("sky"), part("buildings"), part("sidewalk")],
  beach: [part("sky"), part("sea"), part("sand")],
  abstract: [part("void"), part("grid-floor")],
  space: [part("starfield"), part("grid-floor")],
  lab: [part("wall", { pattern: "none" }), part("floor")],
};

function part(id: string, extra: Partial<SetDef["layers"][number]> = {}): SetDef["layers"][number] {
  return { part: id, size: 1, flip: false, dx: 0, seatFor: [], ...extra };
}
