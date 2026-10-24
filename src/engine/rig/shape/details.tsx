import React from "react";
import { shade } from "../../lib/color";
import { f2 } from "../../lib/math";
import type { Look } from "./look";

/**
 * Worn details. Head ones are head-local px (radius R, facing +x); body ones are torso-local
 * (origin at the hip, the torso running up -y for `T` px, `W` px wide, front toward +x).
 */

export const DetailsOnHead: React.FC<{ R: number; look: Look }> = ({ R, look }) => {
  const d = look.details;
  const p = (n: number) => f2(n * R);
  return (
    <g>
      {d.cap ? (
        <g fill={d.cap}>
          <path d={`M${p(-0.92)},${p(-0.3)} C${p(-0.95)},${p(-1.12)} ${p(0.85)},${p(-1.15)} ${p(0.92)},${p(-0.4)} Z`} />
          <path d={`M${p(0.55)},${p(-0.42)} Q${p(1.25)},${p(-0.5)} ${p(1.38)},${p(-0.3)} L${p(0.6)},${p(-0.26)} Z`} fill={shade(d.cap, 0.19)} />
        </g>
      ) : null}
      {d["bobble-hat"] ? (
        <g fill={d["bobble-hat"]}>
          <path d={`M${p(-0.95)},${p(-0.32)} C${p(-0.95)},${p(-1.2)} ${p(0.95)},${p(-1.2)} ${p(0.95)},${p(-0.32)} Z`} />
          <rect x={-0.98 * R} y={-0.42 * R} width={1.96 * R} height={0.2 * R} rx={0.1 * R} fill={shade(d["bobble-hat"], 0.22)} />
          <circle cx={0} cy={-1.12 * R} r={0.18 * R} fill="#fbf8f2" />
        </g>
      ) : null}
      {d.crown ? (
        <path
          fill={d.crown}
          d={`M${p(-0.5)},${p(-0.82)} L${p(-0.58)},${p(-1.3)} L${p(-0.28)},${p(-1.05)} L${p(0)},${p(-1.4)} L${p(0.28)},${p(-1.05)} L${p(0.58)},${p(-1.3)} L${p(0.5)},${p(-0.82)} Z`}
        />
      ) : null}
      {d.bow ? (
        <g fill={d.bow} transform={`translate(${p(-0.35)} ${p(-0.92)}) rotate(-15)`}>
          <path d={`M0,0 L${p(-0.3)},${p(-0.18)} L${p(-0.3)},${p(0.18)} Z M0,0 L${p(0.3)},${p(-0.18)} L${p(0.3)},${p(0.18)} Z`} />
          <circle r={0.08 * R} fill={shade(d.bow, 0.24)} />
        </g>
      ) : null}
      {d.flower ? (
        <g transform={`translate(${p(-0.5)} ${p(-0.78)})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 0.14 * R} cy={Math.sin((a * Math.PI) / 180) * 0.14 * R} r={0.11 * R} fill={d.flower} />
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

type BodyProps = { T: number; W: number; look: Look };

/** Around the neck and on the chest: scarf, necktie, badge. */
export const DetailsOnBody: React.FC<BodyProps> = ({ T, W, look }) => {
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
      {d.scarf ? (
        <g fill={d.scarf}>
          <rect x={-W * 0.55} y={-T * 1.04} width={W * 1.1} height={T * 0.2} rx={T * 0.1} />
          <path d={`M${f2(-W * 0.3)},${f2(-T * 0.9)} L${f2(-W * 0.42)},${f2(-T * 0.45)} L${f2(-W * 0.18)},${f2(-T * 0.48)} L${f2(-W * 0.12)},${f2(-T * 0.9)} Z`} fill={shade(d.scarf, 0.16)} />
        </g>
      ) : null}
    </g>
  );
};

/** Behind the body: a backpack. */
export const DetailsBehind: React.FC<BodyProps> = ({ T, W, look }) =>
  look.details.backpack ? (
    <rect x={-W * 0.78} y={-T * 0.9} width={W * 0.5} height={T * 0.62} rx={W * 0.14} fill={look.details.backpack} />
  ) : null;
