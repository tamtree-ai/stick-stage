import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { Actor, evalActor, KIT_BACKDROP, PART_INFO, seatHeightAt, SEAT_PARTS, SetLayers, type Kit, type SetDef } from "../../engine";
import { library } from "../../data";

export const setLabSchema = z.object({
  /** Only these kits (empty = all). */
  kits: z.array(z.string()),
  tileWidth: z.number(),
});

const W = 1080;
const H = 1920;
const FIG = 720;
const GROUND = 1480;
const SEEDS = [1, 2, 3];
const LABEL_W = 170;
const HEADER_H = 60;

/** Palettes each kit is reviewed in (3 per kit). */
export const LAB_PALETTES: Record<Kit, string[]> = {
  plain: ["mint", "lilac", "peach"],
  interior: ["lilac", "mint", "peach"],
  office: ["mint", "lilac", "peach"],
  park: ["meadow", "autumn", "mint"],
  street: ["city", "dusk", "night"],
  beach: ["coast", "peach", "mint"],
  abstract: ["void", "blueprint", "deep-space"],
  space: ["deep-space", "void", "blueprint"],
  lab: ["lab-white", "mint", "void"],
};

type Row = { part: string; kit: Kit };

export const setLabRows = (kits: readonly string[]): Row[] =>
  Object.entries(PART_INFO)
    .map(([part, info]) => ({ part, kit: info.kits[0]! }))
    .filter((r) => kits.length === 0 || kits.includes(r.kit))
    .sort((a, b) => Object.keys(LAB_PALETTES).indexOf(a.kit) - Object.keys(LAB_PALETTES).indexOf(b.kit));

export const setLabSize = (props: z.infer<typeof setLabSchema>) => {
  const th = Math.round((props.tileWidth * H) / W);
  return {
    width: LABEL_W + props.tileWidth * 9 + 8 * 6,
    height: HEADER_H + setLabRows(props.kits).length * (th + 6),
  };
};

const base = (part: string, extra: Partial<SetDef["layers"][number]> = {}): SetDef["layers"][number] => ({
  part,
  size: 1,
  flip: false,
  dx: 0,
  seatFor: [],
  ...extra,
});

/** A one-part set: the kit backdrop plus the part (seeded), with the lab marks. */
const tileSet = (row: Row, palette: string, seed: number): SetDef => {
  const info = PART_INFO[row.part]!;
  const backdrop = KIT_BACKDROP[row.kit].map((p) => (p.part === row.part ? { ...p, seed } : { ...p, seed }));
  const seat = SEAT_PARTS[row.part];
  const own = info.backdrop
    ? []
    : row.part === "desk"
      ? [base("desk", { seed, mark: "left", dx: 0.17 })]
      : seat === "chair"
        ? [base(row.part, { seed, mark: "left", seatFor: ["left"] })]
        : seat
          ? [base(row.part, { seed, x: 0.5, seatFor: ["left"] })]
          : [base(row.part, { seed, x: 0.64 })];
  // The desk tile seats Milo on a chair behind it.
  const chair = row.part === "desk" ? [base("chair", { seed, mark: "left", seatFor: ["left"] })] : [];
  return {
    schemaVersion: 1,
    id: `lab-${row.part}-${palette}-${seed}`,
    aspect: "9:16",
    kit: row.kit,
    tags: [],
    palette,
    groundY: GROUND,
    figureHeightPx: FIG,
    layers: [...backdrop, ...chair, ...(info.foreground ? [] : own)],
    foreground: info.foreground ? own : [],
    marks: { left: seat || row.part === "desk" ? 0.3 : 0.22, center: 0.5, right: 0.64 },
  };
};

/** Milo for scale: standing, or seated when the tile's part seats the left mark. */
const scaleActor = (set: SetDef) => {
  const seatPx = seatHeightAt(set, "left");
  return evalActor(
    library,
    {
      character: "milo",
      poseKeys: [{ frame: 0, pose: seatPx === undefined ? "idle" : "sit" }],
      expressionKeys: [{ frame: 0, expression: "neutral" }],
      seatKeys: seatPx === undefined ? undefined : [{ frame: 0, seatPx }],
      idle: 0,
    },
    0,
    30,
    FIG,
  );
};

const Tile: React.FC<{ set: SetDef; width: number }> = ({ set, width }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width * H) / W} style={{ display: "block", borderRadius: 6 }}>
    <SetLayers set={set} width={W} height={H} layer="background" />
    <Actor state={scaleActor(set)} x={set.marks.left! * W} groundY={set.groundY} facing="right" frame={0} />
    <SetLayers set={set} width={W} height={H} layer="foreground" />
  </svg>
);

/**
 * Every set part × 3 palettes × 3 seeds, each on its kit backdrop with Milo standing for
 * scale. This is the sheet the team reviews against reference backgrounds (M3 gate).
 */
export const SetLab: React.FC<z.infer<typeof setLabSchema>> = ({ kits, tileWidth }) => {
  const rows = setLabRows(kits);
  const th = Math.round((tileWidth * H) / W);
  const font = { fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, color: "#1b1b1f" } as const;
  return (
    <AbsoluteFill style={{ background: "#f4f4f6", padding: 0 }}>
      <div style={{ display: "flex", height: HEADER_H, alignItems: "center", paddingLeft: LABEL_W, gap: 6 }}>
        {[0, 1, 2].map((p) => (
          <div key={p} style={{ ...font, width: tileWidth * 3 + 12, fontSize: 22, textAlign: "center" }}>
            palette {p + 1} · seeds {SEEDS.join("/")}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.part} style={{ display: "flex", gap: 6, marginBottom: 6, height: th }}>
          <div style={{ ...font, width: LABEL_W - 6, fontSize: 22, paddingTop: 12, paddingLeft: 10 }}>
            {row.part}
            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 4 }}>{row.kit}</div>
            <div style={{ fontSize: 14, fontWeight: 400, marginTop: 4, whiteSpace: "pre" }}>{LAB_PALETTES[row.kit].join("\n")}</div>
          </div>
          {LAB_PALETTES[row.kit].flatMap((palette) => SEEDS.map((seed) => <Tile key={`${palette}-${seed}`} set={tileSet(row, palette, seed)} width={tileWidth} />))}
        </div>
      ))}
    </AbsoluteFill>
  );
};
