import React, { useId } from "react";
import { f2 } from "../../lib/math";
import { DetailsOnBody } from "./details";
import type { Look } from "./look";

/**
 * The torso and what sits on it, torso-local px: origin at the hip, the torso running up -y for
 * `T` px, `W` px wide, front toward +x. The body reaches a little below the hip so the legs
 * come out from under it.
 */
export const torsoPath = (kind: Look["s"]["body"]["kind"], T: number, W: number): string => {
  const ext = W * 0.22;
  const h = T + ext;
  const e = (cy: number, rx: number, ry: number) =>
    `M${f2(-rx)},${f2(cy)} A${f2(rx)},${f2(ry)} 0 1 0 ${f2(rx)},${f2(cy)} A${f2(rx)},${f2(ry)} 0 1 0 ${f2(-rx)},${f2(cy)} Z`;
  const rect = (r: number) => {
    const rr = Math.min(r, W / 2, h / 2);
    return `M${f2(-W / 2 + rr)},${f2(-T)} H${f2(W / 2 - rr)} A${f2(rr)},${f2(rr)} 0 0 1 ${f2(W / 2)},${f2(-T + rr)} V${f2(ext - rr)} A${f2(rr)},${f2(rr)} 0 0 1 ${f2(W / 2 - rr)},${f2(ext)} H${f2(-W / 2 + rr)} A${f2(rr)},${f2(rr)} 0 0 1 ${f2(-W / 2)},${f2(ext - rr)} V${f2(-T + rr)} A${f2(rr)},${f2(rr)} 0 0 1 ${f2(-W / 2 + rr)},${f2(-T)} Z`;
  };
  switch (kind) {
    case "pear":
      return `M0,${f2(-T - W * 0.04)} C${f2(W * 0.3)},${f2(-T - W * 0.04)} ${f2(W * 0.4)},${f2(-T * 0.7)} ${f2(W * 0.5)},${f2(-T * 0.3)} C${f2(W * 0.62)},${f2(ext * 0.4)} ${f2(W * 0.35)},${f2(ext)} 0,${f2(ext)} C${f2(-W * 0.35)},${f2(ext)} ${f2(-W * 0.62)},${f2(ext * 0.4)} ${f2(-W * 0.5)},${f2(-T * 0.3)} C${f2(-W * 0.4)},${f2(-T * 0.7)} ${f2(-W * 0.3)},${f2(-T - W * 0.04)} 0,${f2(-T - W * 0.04)} Z`;
    case "egg":
      return e((ext - T) / 2, W / 2, (h / 2) * 1.04);
    case "block":
      return rect(W * 0.22);
    case "barrel":
      return e((ext - T) / 2, W * 0.55, h / 2);
    case "drop":
      // A blob: wide and flat at the bottom, rising to a soft point under the head.
      return `M0,${f2(-T - W * 0.1)} C${f2(W * 0.2)},${f2(-T * 0.7)} ${f2(W * 0.62)},${f2(-T * 0.25)} ${f2(W * 0.6)},${f2(ext * 0.3)} C${f2(W * 0.58)},${f2(ext)} ${f2(W * 0.3)},${f2(ext)} 0,${f2(ext)} C${f2(-W * 0.3)},${f2(ext)} ${f2(-W * 0.58)},${f2(ext)} ${f2(-W * 0.6)},${f2(ext * 0.3)} C${f2(-W * 0.62)},${f2(-T * 0.25)} ${f2(-W * 0.2)},${f2(-T * 0.7)} 0,${f2(-T - W * 0.1)} Z`;
    default:
      return rect(W / 2);
  }
};

export const Torso: React.FC<{ T: number; W: number; look: Look; details?: boolean }> = ({ T, W, look, details = true }) => {
  const clipId = "shb" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const d = torsoPath(look.s.body.kind, T, W);
  const { spots, stripes } = look.marks;
  return (
    <g>
      <path d={d} fill={look.body} />
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {look.belly ? <ellipse cx={W * 0.12} cy={-T * 0.36} rx={W * 0.33} ry={T * 0.38} fill={look.belly} /> : null}
        {spots ? (
          <g fill={spots}>
            <circle cx={-W * 0.22} cy={-T * 0.68} r={W * 0.1} />
            <circle cx={W * 0.12} cy={-T * 0.3} r={W * 0.08} />
            <circle cx={-W * 0.28} cy={-T * 0.22} r={W * 0.07} />
          </g>
        ) : null}
        {stripes ? (
          <g fill={stripes}>
            {[0.78, 0.52, 0.26].map((k) => (
              <rect key={k} x={-W} y={-T * k} width={W * 2} height={T * 0.09} />
            ))}
          </g>
        ) : null}
      </g>
      {details ? <DetailsOnBody T={T} W={W} look={look} /> : null}
    </g>
  );
};

/** The tail, from the back of the hip; it wags a little. */
export const Tail: React.FC<{ T: number; W: number; look: Look; frame: number }> = ({ T, W, look, frame }) => {
  const { kind, size: k } = look.s.tail;
  if (kind === "none") return null;
  const wag = Math.sin(frame * 0.22) * (kind === "fluffy" ? 4 : 8);
  const c = look.tail;
  const tube = (d: string, w: number) => <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" />;
  const s = W * k;
  let part: React.ReactNode;
  switch (kind) {
    case "puff":
      part = <circle cx={-s * 0.12} cy={0} r={s * 0.22} fill={c} />;
      break;
    case "stub":
      part = <ellipse cx={-s * 0.08} cy={0} rx={s * 0.15} ry={s * 0.1} fill={c} />;
      break;
    case "long":
      part = tube(`M0,0 C${f2(-s * 0.4)},${f2(s * 0.1)} ${f2(-s * 0.72)},${f2(-s * 0.2)} ${f2(-s * 0.78)},${f2(-s * 0.62)}`, W * 0.11);
      break;
    case "curl":
      part = tube(`M0,0 C${f2(-s * 0.5)},0 ${f2(-s * 0.62)},${f2(-s * 0.5)} ${f2(-s * 0.36)},${f2(-s * 0.6)} C${f2(-s * 0.16)},${f2(-s * 0.66)} ${f2(-s * 0.12)},${f2(-s * 0.42)} ${f2(-s * 0.26)},${f2(-s * 0.4)}`, W * 0.1);
      break;
    case "fluffy":
      part = <ellipse cx={-s * 0.5} cy={-T * 0.5 * k} rx={s * 0.34} ry={T * 0.68 * k} transform={`rotate(-18 ${f2(-s * 0.5)} ${f2(-T * 0.5 * k)})`} fill={c} />;
      break;
  }
  return <g transform={`translate(${f2(-W * 0.4)} ${f2(-T * 0.08)}) rotate(${f2(wag)})`}>{part}</g>;
};
