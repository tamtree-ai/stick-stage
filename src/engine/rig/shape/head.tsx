import React from "react";
import { f2 } from "../../lib/math";
import { backTone, type Look } from "./look";

/**
 * Head parts in head-local px (origin = head centre, facing +x), radius `R`. No outlines: parts
 * separate by tone, the far side one step darker.
 */

/** Where the face sits: a three-quarter view, shifted toward facing. */
export const faceLayout = (R: number, spacing = 1) => {
  const fx = R * 0.24;
  const gap = R * 0.46 * spacing;
  return { fx, eyeY: -R * 0.08, gap, exL: fx - gap / 2, exR: fx + gap / 2, mouthX: fx + R * 0.06, mouthY: R * 0.4 };
};

export const headPath = (R: number, kind: Look["s"]["head"]["kind"]): string => {
  const e = (rx: number, ry: number) => `M${f2(-rx)},0 A${f2(rx)},${f2(ry)} 0 1 0 ${f2(rx)},0 A${f2(rx)},${f2(ry)} 0 1 0 ${f2(-rx)},0 Z`;
  switch (kind) {
    case "oval":
      return e(R * 0.92, R * 1.08);
    case "wide":
      return e(R * 1.15, R * 0.9);
    case "pear":
      return `M0,${f2(-R)} C${f2(R * 0.7)},${f2(-R)} ${f2(R * 0.8)},${f2(-R * 0.3)} ${f2(R * 1.02)},${f2(R * 0.3)} C${f2(R * 1.1)},${f2(R * 0.9)} ${f2(R * 0.5)},${f2(R)} 0,${f2(R)} C${f2(-R * 0.5)},${f2(R)} ${f2(-R * 1.1)},${f2(R * 0.9)} ${f2(-R * 1.02)},${f2(R * 0.3)} C${f2(-R * 0.8)},${f2(-R * 0.3)} ${f2(-R * 0.7)},${f2(-R)} 0,${f2(-R)} Z`;
    default:
      return e(R, R);
  }
};

const tri = (bx: number, by: number, w: number, h: number, rot: number, fill: string, key?: string) => (
  <path
    key={key}
    transform={`translate(${f2(bx)} ${f2(by)}) rotate(${f2(rot)})`}
    d={`M${f2(-w / 2)},0 Q${f2(-w * 0.1)},${f2(-h * 1.05)} 0,${f2(-h)} Q${f2(w * 0.1)},${f2(-h * 1.05)} ${f2(w / 2)},0 Z`}
    fill={fill}
  />
);

/** One ear. `back` is the far ear: darker, further round the head. */
const Ear: React.FC<{ R: number; look: Look; back: boolean; wiggle: number }> = ({ R, look, back, wiggle }) => {
  const { kind, size: k } = look.s.ears;
  const fill = back ? backTone(look.ears) : look.ears;
  const inner = look.earInner;
  const x = back ? -0.42 * R : 0.3 * R;
  const y = back ? -0.78 * R : -0.88 * R;
  const tilt = (back ? -14 : 8) + wiggle;
  switch (kind) {
    case "round":
    case "small": {
      const r = (kind === "round" ? 0.34 : 0.2) * R * k;
      return (
        <g>
          <circle cx={x} cy={y} r={r} fill={fill} />
          {inner ? <circle cx={x} cy={y + r * 0.1} r={r * 0.58} fill={back ? backTone(inner) : inner} /> : null}
        </g>
      );
    }
    case "long": {
      const rx = 0.2 * R * k;
      const ry = 0.72 * R * k;
      return (
        <g transform={`translate(${f2(x)} ${f2(y + 0.2 * R)}) rotate(${f2(tilt)})`}>
          <ellipse cx={0} cy={-ry * 0.85} rx={rx} ry={ry} fill={fill} />
          {inner ? <ellipse cx={0} cy={-ry * 0.82} rx={rx * 0.5} ry={ry * 0.72} fill={back ? backTone(inner) : inner} /> : null}
        </g>
      );
    }
    case "floppy": {
      const rx = 0.24 * R * k;
      const ry = 0.56 * R * k;
      const fx = back ? -0.95 * R : -0.38 * R;
      return (
        <g transform={`translate(${f2(fx)} ${f2(-0.45 * R)}) rotate(${f2((back ? 22 : 12) + wiggle * 0.5)})`}>
          <ellipse cx={0} cy={ry * 0.75} rx={rx} ry={ry} fill={back ? backTone(look.ears) : look.ears} />
        </g>
      );
    }
    case "pointed": {
      const w = 0.5 * R * k;
      const h = 0.6 * R * k;
      return (
        <g>
          {tri(x, y + 0.12 * R, w, h, tilt, fill)}
          {inner ? tri(x, y + 0.08 * R, w * 0.5, h * 0.62, tilt, back ? backTone(inner) : inner) : null}
        </g>
      );
    }
    case "antennae": {
      const len = 0.55 * R * k;
      const a = ((tilt - 90) * Math.PI) / 180;
      const tx = x + Math.cos(a) * len;
      const ty = y + Math.sin(a) * len;
      return (
        <g>
          <path d={`M${f2(x)},${f2(y + 0.1 * R)} L${f2(tx)},${f2(ty)}`} stroke={fill} strokeWidth={R * 0.07} strokeLinecap="round" />
          <circle cx={tx} cy={ty} r={R * 0.12} fill={inner ?? fill} />
        </g>
      );
    }
    default:
      return null;
  }
};

/** Ears behind the head (both), except a floppy front ear, which lies over it (`EarFront`). */
export const EarsBack: React.FC<{ R: number; look: Look; frame: number }> = ({ R, look, frame }) => {
  if (look.s.ears.kind === "none") return null;
  const w = Math.sin(frame * 0.07) * 2;
  return (
    <g>
      <Ear R={R} look={look} back wiggle={w} />
      {look.s.ears.kind === "floppy" ? null : <Ear R={R} look={look} back={false} wiggle={-w} />}
    </g>
  );
};

export const EarFront: React.FC<{ R: number; look: Look; frame: number }> = ({ R, look, frame }) =>
  look.s.ears.kind === "floppy" ? <Ear R={R} look={look} back={false} wiggle={-Math.sin(frame * 0.07) * 2} /> : null;

/** Hair behind the head: pigtails. */
export const HairBack: React.FC<{ R: number; look: Look }> = ({ R, look }) => {
  const h = look.s.hair;
  if (h?.kind !== "pigtails") return null;
  const c = backTone(look.hair ?? look.main);
  return (
    <g fill={c}>
      <circle cx={-1.0 * R} cy={0.05 * R} r={0.3 * R} />
      <circle cx={-0.7 * R} cy={-0.75 * R} r={0.26 * R} />
    </g>
  );
};

/** Hair over the head. */
export const HairFront: React.FC<{ R: number; look: Look }> = ({ R, look }) => {
  const h = look.s.hair;
  if (!h || h.kind === "none") return null;
  const c = look.hair ?? look.main;
  const P = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f2(x * R)},${f2(y * R)}`).join(" ") + " Z";
  switch (h.kind) {
    case "tuft":
    case "pigtails":
      return (
        <g fill="none" stroke={c} strokeWidth={R * 0.09} strokeLinecap="round">
          <path d={`M${f2(-0.1 * R)},${f2(-0.96 * R)} q${f2(-0.05 * R)},${f2(-0.28 * R)} ${f2(-0.22 * R)},${f2(-0.34 * R)}`} />
          <path d={`M${f2(0.05 * R)},${f2(-0.98 * R)} q${f2(0.05 * R)},${f2(-0.3 * R)} ${f2(0.2 * R)},${f2(-0.36 * R)}`} />
        </g>
      );
    case "bob":
      return (
        <path
          fill={c}
          d={`M${f2(-1.06 * R)},${f2(0.4 * R)} C${f2(-1.18 * R)},${f2(-0.6 * R)} ${f2(-0.5 * R)},${f2(-1.14 * R)} ${f2(0.1 * R)},${f2(-1.1 * R)} C${f2(0.7 * R)},${f2(-1.08 * R)} ${f2(1.06 * R)},${f2(-0.62 * R)} ${f2(1.02 * R)},${f2(-0.28 * R)} C${f2(0.62 * R)},${f2(-0.48 * R)} ${f2(0.1 * R)},${f2(-0.52 * R)} ${f2(-0.28 * R)},${f2(-0.38 * R)} C${f2(-0.48 * R)},${f2(-0.12 * R)} ${f2(-0.62 * R)},${f2(0.2 * R)} ${f2(-0.76 * R)},${f2(0.44 * R)} Z`}
        />
      );
    case "bun":
      return (
        <g fill={c}>
          <circle cx={-0.3 * R} cy={-1.1 * R} r={0.32 * R} />
          <path d={`M${f2(-0.95 * R)},${f2(-0.2 * R)} C${f2(-0.9 * R)},${f2(-0.9 * R)} ${f2(0.5 * R)},${f2(-1.2 * R)} ${f2(0.95 * R)},${f2(-0.35 * R)} C${f2(0.4 * R)},${f2(-0.6 * R)} ${f2(-0.4 * R)},${f2(-0.6 * R)} ${f2(-0.95 * R)},${f2(-0.2 * R)} Z`} />
        </g>
      );
    case "spikes":
      return <path fill={c} d={P([[-0.85, -0.45], [-0.75, -1.15], [-0.45, -0.85], [-0.25, -1.35], [0.0, -0.92], [0.3, -1.3], [0.42, -0.86], [0.8, -1.05], [0.78, -0.55], [0.2, -0.75]])} />;
    case "curls":
      return (
        <g fill={c}>
          {[[-0.7, -0.62], [-0.42, -0.92], [-0.05, -1.04], [0.32, -0.96], [0.62, -0.72], [-0.85, -0.2]].map(([x, y], i) => (
            <circle key={i} cx={x! * R} cy={y! * R} r={0.27 * R} />
          ))}
        </g>
      );
    default:
      return null;
  }
};
