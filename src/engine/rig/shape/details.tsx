import React from "react";
import { shade } from "../../lib/color";
import { f2 } from "../../lib/math";
import type { Look } from "./look";

/**
 * Worn details. Head ones are head-local px (radius R, facing +x); body ones are torso-local
 * (origin at the hip, the torso running up -y for `T` px, `W` px wide, front toward +x).
 */

/** One bow loop, from the knot (0,0) out to +x: a rounded lobe, with the fold inside it. */
const bowLoop = (R: number, side: 1 | -1) => {
  const p = (x: number, y: number) => `${f2(side * x * R)},${f2(y * R)}`;
  return {
    loop: `M0,0 C${p(0.06, -0.24)} ${p(0.36, -0.26)} ${p(0.34, -0.02)} C${p(0.33, 0.2)} ${p(0.08, 0.18)} 0,0 Z`,
    fold: `M0,0 C${p(0.05, -0.1)} ${p(0.16, -0.1)} ${p(0.17, -0.01)} C${p(0.16, 0.07)} ${p(0.05, 0.07)} 0,0 Z`,
  };
};

/** A tied ribbon: two rounded loops with their folds, short notched tails that flutter, a knot. */
const Bow: React.FC<{ R: number; color: string; frame: number }> = ({ R, color, frame }) => {
  const p = (n: number) => f2(n * R);
  return (
    <g transform={`translate(${p(-0.35)} ${p(-0.95)}) rotate(-15)`}>
      {([-1, 1] as const).map((side) => {
        const sway = Math.sin(frame * 0.09 + side) * 4;
        return (
          <path
            key={`t${side}`}
            transform={`rotate(${f2(sway + side * 18)})`}
            d={`M${p(-0.04)},${p(0.02)} L${p(-0.06)},${p(0.3)} L${p(0)},${p(0.25)} L${p(0.06)},${p(0.3)} L${p(0.04)},${p(0.02)} Z`}
            fill={shade(color, 0.12)}
          />
        );
      })}
      {([-1, 1] as const).map((side) => {
        const b = bowLoop(R, side);
        return (
          <g key={side}>
            <path d={b.loop} fill={color} />
            <path d={b.fold} fill={shade(color, 0.22)} />
          </g>
        );
      })}
      <ellipse rx={0.075 * R} ry={0.09 * R} fill={shade(color, 0.1)} />
    </g>
  );
};

export const DetailsOnHead: React.FC<{ R: number; look: Look; frame?: number }> = ({
  R,
  look,
  frame = 0,
}) => {
  const d = look.details;
  const p = (n: number) => f2(n * R);
  return (
    <g>
      {d.cap ? (
        <g fill={d.cap}>
          <path
            d={`M${p(-0.92)},${p(-0.3)} C${p(-0.95)},${p(-1.12)} ${p(0.85)},${p(-1.15)} ${p(0.92)},${p(-0.4)} Z`}
          />
          <path
            d={`M${p(0.55)},${p(-0.42)} Q${p(1.25)},${p(-0.5)} ${p(1.38)},${p(-0.3)} L${p(0.6)},${p(-0.26)} Z`}
            fill={shade(d.cap, 0.19)}
          />
        </g>
      ) : null}
      {d["bobble-hat"] ? (
        <g fill={d["bobble-hat"]}>
          <path
            d={`M${p(-0.95)},${p(-0.32)} C${p(-0.95)},${p(-1.2)} ${p(0.95)},${p(-1.2)} ${p(0.95)},${p(-0.32)} Z`}
          />
          <rect
            x={-0.98 * R}
            y={-0.42 * R}
            width={1.96 * R}
            height={0.2 * R}
            rx={0.1 * R}
            fill={shade(d["bobble-hat"], 0.22)}
          />
          <circle cx={0} cy={-1.12 * R} r={0.18 * R} fill="#fbf8f2" />
        </g>
      ) : null}
      {d.crown ? (
        <path
          fill={d.crown}
          d={`M${p(-0.5)},${p(-0.82)} L${p(-0.58)},${p(-1.3)} L${p(-0.28)},${p(-1.05)} L${p(0)},${p(-1.4)} L${p(0.28)},${p(-1.05)} L${p(0.58)},${p(-1.3)} L${p(0.5)},${p(-0.82)} Z`}
        />
      ) : null}
      {d.bow ? <Bow R={R} color={d.bow} frame={frame} /> : null}
      {d.flower ? (
        <g transform={`translate(${p(-0.5)} ${p(-0.78)})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={Math.cos((a * Math.PI) / 180) * 0.14 * R}
              cy={Math.sin((a * Math.PI) / 180) * 0.14 * R}
              r={0.11 * R}
              fill={d.flower}
            />
          ))}
          <circle r={0.09 * R} fill="#fbb954" />
        </g>
      ) : null}
      {d.glasses ? (
        <g fill="none" stroke={d.glasses} strokeWidth={R * 0.05}>
          <circle cx={0.01 * R} cy={-0.08 * R} r={0.17 * R} />
          <circle cx={0.47 * R} cy={-0.08 * R} r={0.17 * R} />
          <path d={`M${p(0.18)},${p(-0.1)} L${p(0.3)},${p(-0.1)}`} />
        </g>
      ) : null}
    </g>
  );
};

type BodyProps = { T: number; W: number; look: Look; frame?: number };

/** Around the neck and on the chest: scarf, necktie, badge. */
export const DetailsOnBody: React.FC<BodyProps> = ({ T, W, look, frame = 0 }) => {
  const d = look.details;
  return (
    <g>
      {d.necktie ? (
        <path
          fill={d.necktie}
          d={`M${f2(W * 0.12)},${f2(-T * 0.98)} L${f2(W * 0.22)},${f2(-T * 0.9)} L${f2(W * 0.2)},${f2(-T * 0.45)} L${f2(W * 0.12)},${f2(-T * 0.36)} L${f2(W * 0.04)},${f2(-T * 0.45)} L${f2(W * 0.02)},${f2(-T * 0.9)} Z`}
        />
      ) : null}
      {d.badge ? (
        <g>
          <circle cx={W * 0.2} cy={-T * 0.62} r={W * 0.11} fill={d.badge} />
          <circle cx={W * 0.2} cy={-T * 0.62} r={W * 0.055} fill={shade(d.badge, 0.29)} />
        </g>
      ) : null}
      {d.scarf ? <Scarf T={T} W={W} color={d.scarf} frame={frame} /> : null}
    </g>
  );
};

/** Behind the body: a backpack. */
export const DetailsBehind: React.FC<BodyProps> = ({ T, W, look }) =>
  look.details.backpack ? (
    <rect
      x={-W * 0.78}
      y={-T * 0.9}
      width={W * 0.5}
      height={T * 0.62}
      rx={W * 0.14}
      fill={look.details.backpack}
    />
  ) : null;

/**
 * A scarf wrapped round the neck: a band that curves with the body (lower at the front, the way
 * fabric sits on a round neck), a knot at the front and one fringed tail that swings a little.
 */
const Scarf: React.FC<{ T: number; W: number; color: string; frame: number }> = ({
  T,
  W,
  color,
  frame,
}) => {
  const p = (x: number, y: number) => `${f2(x * W)},${f2(y * T)}`;
  const swing = Math.sin(frame * 0.07) * 5;
  const kx = 0.2 * W;
  const ky = -0.86 * T;
  const tail = `M${p(0.13, -0.86)} C${p(0.12, -0.72)} ${p(0.08, -0.62)} ${p(0.06, -0.52)} L${p(0.1, -0.49)} L${p(0.14, -0.53)} L${p(0.18, -0.49)} L${p(0.22, -0.53)} L${p(0.26, -0.49)} C${p(0.25, -0.62)} ${p(0.27, -0.74)} ${p(0.27, -0.86)} Z`;
  return (
    <g>
      <path
        d={`M${p(-0.54, -1.02)} Q${p(0, -0.9)} ${p(0.54, -1.02)} L${p(0.52, -0.86)} Q${p(0, -0.72)} ${p(-0.52, -0.86)} Z`}
        fill={color}
      />
      <path
        d={`M${p(-0.52, -0.9)} Q${p(0, -0.77)} ${p(0.52, -0.9)} L${p(0.52, -0.86)} Q${p(0, -0.72)} ${p(-0.52, -0.86)} Z`}
        fill={shade(color, 0.14)}
      />
      <path
        d={tail}
        transform={`rotate(${f2(swing)} ${f2(kx)} ${f2(ky)})`}
        fill={shade(color, 0.08)}
      />
      <ellipse cx={kx} cy={ky} rx={0.1 * W} ry={0.07 * T} fill={shade(color, 0.04)} />
    </g>
  );
};
