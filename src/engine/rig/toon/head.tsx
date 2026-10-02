import React from "react";
import { f2 } from "../../lib/math";
import { detailColor } from "./clothes";
import { shadeOf, Star, type Pen } from "./kit";

/**
 * Head parts in head-local toon units (origin = head centre, facing +x), radius `R`.
 * The face layout every part shares: eyes either side of `fx`, a little above the centre.
 */
export const faceLayout = (R: number) => {
  const fx = R * 0.2;
  const gap = R * 0.42;
  return { fx, eyeY: R * 0.02, gap, exL: fx - gap / 2 - 2, exR: fx + gap / 2 + 4, mouthX: fx + 6, mouthY: R * 0.6 };
};

/** Outline drawn under the fill, so overlapping shapes merge into one silhouette. */
const Union: React.FC<{ shapes: readonly React.ReactElement[]; fill: string; pen: Pen }> = ({ shapes, fill, pen }) => (
  <g strokeLinejoin="round">
    {shapes.map((s, i) => React.cloneElement(s as React.ReactElement<React.SVGProps<SVGElement>>, { key: `o${i}`, fill: pen.ink, stroke: pen.ink, strokeWidth: 2 * pen.t.outline }))}
    {shapes.map((s, i) => React.cloneElement(s as React.ReactElement<React.SVGProps<SVGElement>>, { key: `f${i}`, fill }))}
  </g>
);

export const HeadShape: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  const jaw = pen.t.head.jaw;
  const d = `M0,${-R * 1.02} C${R * 0.62},${-R * 1.02} ${R * 1.04},${-R * 0.6} ${R * 1.02},${R * 0.05} C${R * 1.0},${R * 0.6} ${R * 0.62 * jaw},${R * 1.05} ${R * 0.08},${R * 1.05} C${-R * 0.6},${R * 1.04} ${-R * 0.98},${R * 0.6} ${-R * 0.98},${R * 0.02} C${-R * 0.98},${-R * 0.6} ${-R * 0.6},${-R * 1.02} 0,${-R * 1.02} Z`;
  return <path d={d} fill={pen.t.skin} stroke={pen.ink} strokeWidth={pen.t.outline} />;
};

/** Hair behind the head and body (long hair). */
export const HairBack: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  const h = pen.t.hair;
  if (h.kind !== "long-streak") return null;
  const d = `M${-R * 0.1},${-R * 1.05} C${-R * 0.9},${-R * 1.12} ${-R * 1.3},${-R * 0.4} ${-R * 1.2},${R * 0.5} C${-R * 1.12},${R * 1.1} ${-R * 1.3},${R * 1.6} ${-R * 1.05},${R * 2.05} Q${-R * 0.85},${R * 1.85} ${-R * 0.7},${R * 2.1} Q${-R * 0.5},${R * 1.85} ${-R * 0.3},${R * 2.0} Q${-R * 0.1},${R * 1.6} ${R * 0.1},${R * 1.75} C${R * 0.2},${R * 1.3} ${R * 0.1},${R * 0.9} ${R * 0.2},${R * 0.6} Z`;
  const strands = `M${-R * 0.95},${R * 0.3} C${-R * 0.9},${R * 0.9} ${-R * 1.05},${R * 1.4} ${-R * 0.85},${R * 1.8} M${-R * 0.5},${R * 0.9} C${-R * 0.55},${R * 1.3} ${-R * 0.45},${R * 1.6} ${-R * 0.35},${R * 1.85}`;
  return (
    <g>
      <Union shapes={[<path d={d} />]} fill={h.fill} pen={pen} />
      <path d={strands} fill="none" stroke={shadeOf(h)} strokeWidth={6} strokeLinecap="round" />
    </g>
  );
};

/** Hair over the head: a side-swept fringe, or a mop of curls. */
export const HairFront: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  const h = pen.t.hair;
  const shade = shadeOf(h);
  if (h.kind === "curly-mop") {
    const blobs: [number, number, number][] = [
      [-0.75, -0.55, 0.38], [-0.5, -0.88, 0.4], [-0.1, -1.05, 0.42], [0.32, -0.98, 0.4], [0.68, -0.8, 0.32], [0.9, -0.5, 0.22],
      [-0.9, -0.15, 0.26], [0.1, -0.86, 0.4], [-0.5, -0.6, 0.4], [-0.25, -1.25, 0.22], [0.5, -1.18, 0.2],
    ];
    const curls: [number, number][] = [[-0.5, -1.0], [0.0, -1.18], [0.4, -1.05], [0.75, -0.75], [-0.85, -0.5], [-0.2, -0.85]];
    return (
      <g>
        <Union shapes={blobs.map(([x, y, r]) => <circle cx={x * R} cy={y * R} r={r * R} />)} fill={h.fill} pen={pen} />
        {curls.map(([x, y], i) => (
          <path key={i} d={`M${f2(x * R - 10)},${f2(y * R + 4)} q10,-12 20,0`} fill="none" stroke={shade} strokeWidth={5} strokeLinecap="round" />
        ))}
      </g>
    );
  }
  const d = `M${-R * 1.02},${R * 0.3} C${-R * 1.12},${-R * 0.85} ${-R * 0.35},${-R * 1.22} ${R * 0.3},${-R * 1.07} C${R * 0.86},${-R * 0.94} ${R * 1.1},${-R * 0.5} ${R * 1.02},${-R * 0.02} C${R * 0.92},${-R * 0.32} ${R * 0.75},${-R * 0.5} ${R * 0.5},${-R * 0.55} C${R * 0.15},${-R * 0.45} ${-R * 0.2},${-R * 0.66} ${-R * 0.45},${-R * 0.52} C${-R * 0.66},${-R * 0.38} ${-R * 0.72},${-R * 0.05} ${-R * 0.7},${R * 0.4} Z`;
  return (
    <g fill="none" strokeLinecap="round">
      <Union shapes={[<path d={d} />]} fill={h.fill} pen={pen} />
      {h.streak ? (
        <path d={`M${-R * 0.55},${-R * 0.95} C${-R * 0.1},${-R * 1.05} ${R * 0.35},${-R * 0.85} ${R * 0.62},${-R * 0.55}`} stroke={h.streak} strokeWidth={9} />
      ) : null}
      <path d={`M${R * 0.1},${-R * 0.98} C${R * 0.55},${-R * 0.9} ${R * 0.85},${-R * 0.6} ${R * 0.95},${-R * 0.25}`} stroke={shade} strokeWidth={5} />
      <path d={`M${R * 0.98},${-R * 0.05} q${R * 0.12},${R * 0.2} ${-R * 0.05},${R * 0.32} q${-R * 0.1},${-R * 0.1} 0,${-R * 0.16}`} stroke={pen.ink} strokeWidth={5} />
    </g>
  );
};

/** The ear at the back of the head, with an earring if the character wears one. */
export const Ear: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  if (!pen.t.ears) return null;
  const ring = detailColor(pen, "star-earring");
  const sx = -R * 0.82;
  const sy = R * 0.42;
  return (
    <g>
      <ellipse cx={-R * 0.8} cy={R * 0.12} rx={R * 0.16} ry={R * 0.21} fill={pen.t.skin} stroke={pen.ink} strokeWidth={pen.t.outline} />
      <path d={`M${f2(-R * 0.82)},${f2(R * 0.05)} q8,4 2,14`} fill="none" stroke={pen.ink} strokeWidth={3.5} strokeLinecap="round" />
      {ring ? (
        <>
          <path d={`M${f2(sx)},${f2(R * 0.3)} V${f2(sy - 8)}`} stroke={pen.ink} strokeWidth={3} />
          <Star x={sx} y={sy + 4} r={11} fill={ring} pen={pen} sw={3.5} />
        </>
      ) : null}
    </g>
  );
};

export const Nose: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  const { exR } = faceLayout(R);
  if (pen.t.nose === "none") return null;
  if (pen.t.nose === "button") return <circle cx={exR + 6} cy={R * 0.36} r={5} fill={shadeOf({ fill: pen.t.skin })} />;
  return <path d={`M${f2(exR + 8)},${f2(R * 0.3)} q11,7 -3,13`} fill="none" stroke={pen.ink} strokeWidth={4.5} strokeLinecap="round" />;
};

/** Cat-eye frames around both eyes, with the arm back to the ear. */
export const Glasses: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  const g = pen.t.glasses;
  if (!g) return null;
  const { eyeY, exL, exR } = faceLayout(R);
  const cat = (x: number, s: 1 | -1) =>
    `M${x - 16 * s},${eyeY - 10} Q${x},${eyeY - 17} ${x + 19 * s},${eyeY - 19} Q${x + 18 * s},${eyeY + 12} ${x},${eyeY + 14} Q${x - 16 * s},${eyeY + 12} ${x - 16 * s},${eyeY - 10} Z`;
  const rims = cat(exL, -1) + " " + cat(exR, 1);
  return (
    <g fill="none" strokeLinecap="round">
      <path d={rims} stroke={pen.ink} strokeWidth={7} />
      <path d={rims} stroke={g.fill} strokeWidth={3} />
      <path d={`M${exL + 16},${eyeY - 6} q${(exR - exL - 32) / 2},-6 ${exR - exL - 32},0`} stroke={pen.ink} strokeWidth={5} />
      <path d={`M${exL - 19},${eyeY - 14} L${-R * 0.66},${eyeY - 10}`} stroke={pen.ink} strokeWidth={5} />
    </g>
  );
};

/** Cheek tint and freckles. */
export const Cheeks: React.FC<{ R: number; pen: Pen }> = ({ R, pen }) => {
  const { fx, gap } = faceLayout(R);
  const c = pen.t.cheeks;
  const freckles = detailColor(pen, "freckles");
  return (
    <g>
      <ellipse cx={fx - gap * 0.8} cy={R * 0.44} rx={14} ry={8} fill={c.color} opacity={c.opacity} />
      <ellipse cx={fx + gap * 1.05} cy={R * 0.44} rx={11} ry={7} fill={c.color} opacity={c.opacity} />
      {freckles
        ? [[0.42, 0.3], [0.52, 0.36], [0.62, 0.29], [0.06, 0.32], [-0.02, 0.38]].map(([x, y], i) => (
            <circle key={i} cx={x! * R} cy={y! * R} r={2.6} fill={freckles} />
          ))
        : null}
    </g>
  );
};
