import React from "react";
import { f2, type Vec2 } from "../lib/math";
import type { Accessory, Character } from "./schema";

export type AccessoryLayer = "back" | "front" | "eyewear" | "body";

/** Torso segment in figure space. Only the body layer uses it. */
export type BodyAnchor = { hip: Vec2; neck: Vec2; heightPx: number };

type AccessoryDraw = (a: {
  R: number;
  stroke: string;
  sw: number;
  color: string;
  character: Character;
  hip?: Vec2;
  neck?: Vec2;
  heightPx?: number;
}) => React.ReactNode;

type AccessoryDef = { slot: Accessory["slot"]; layers: Partial<Record<AccessoryLayer, AccessoryDraw>> };

/** Arc point on the head circle at angle `deg` (0 = top, + = toward facing). */
const onHead = (R: number, deg: number, k = 1) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a) * R * k, y: -Math.cos(a) * R * k };
};

const REGISTRY: Record<string, AccessoryDef> = {
  "tuft-01": {
    slot: "hair",
    layers: {
      front: ({ R, stroke, sw }) => {
        // A cowlick: three strands fanning from one root on the crown.
        const root = onHead(R, -8, 0.96);
        const strands = [
          { tx: -0.3, ty: -0.3 },
          { tx: -0.04, ty: -0.42 },
          { tx: 0.22, ty: -0.3 },
        ];
        return strands.map((s, i) => {
          const tip = { x: root.x + s.tx * R, y: root.y + s.ty * R };
          const c1 = { x: root.x, y: root.y - 0.22 * R };
          const c2 = { x: tip.x - s.tx * 0.25 * R, y: tip.y + 0.02 * R };
          return (
            <path
              key={i}
              d={`M ${f2(root.x)} ${f2(root.y)} C ${f2(c1.x)} ${f2(c1.y)} ${f2(c2.x)} ${f2(c2.y)} ${f2(tip.x)} ${f2(tip.y)}`}
              fill="none"
              stroke={stroke}
              strokeWidth={sw * 0.85}
              strokeLinecap="round"
            />
          );
        });
      },
    },
  },
  "bun-01": {
    slot: "hair",
    layers: {
      back: ({ R, stroke, sw, color }) => {
        const c = onHead(R, -38, 1.02);
        return <circle cx={c.x} cy={c.y} r={0.36 * R} fill={color} stroke={stroke} strokeWidth={sw} />;
      },
      front: ({ R, stroke, sw, color }) => {
        // Side-swept cap: arc over the crown, swooping fringe along the front.
        const a = onHead(R, -118);
        const b = onHead(R, 70);
        const d =
          `M ${f2(a.x)} ${f2(a.y)} A ${f2(R)} ${f2(R)} 0 1 1 ${f2(b.x)} ${f2(b.y)} ` +
          `Q ${f2(0.62 * R)} ${f2(-0.5 * R)} ${f2(0.28 * R)} ${f2(-0.74 * R)} ` +
          `Q ${f2(-0.42 * R)} ${f2(-0.5 * R)} ${f2(a.x)} ${f2(a.y)} Z`;
        return <path d={d} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      },
    },
  },
  "spikes-01": {
    slot: "hair",
    layers: {
      front: ({ R, stroke, sw, color }) => {
        const pts: string[] = [];
        const n = 6;
        for (let i = 0; i <= n; i++) {
          const deg = -95 + (190 * i) / n;
          const base = onHead(R, deg, 1);
          pts.push(`${f2(base.x)},${f2(base.y)}`);
          if (i < n) {
            const tip = onHead(R, deg + 190 / n / 2, 1.3 + (i % 2) * 0.08);
            pts.push(`${f2(tip.x)},${f2(tip.y)}`);
          }
        }
        const inner = onHead(R, 60, 0.55);
        const inner2 = onHead(R, -60, 0.55);
        pts.push(`${f2(inner.x)},${f2(inner.y)}`, `${f2(inner2.x)},${f2(inner2.y)}`);
        return <polygon points={pts.join(" ")} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      },
    },
  },
  "pigtails-01": {
    slot: "hair",
    layers: {
      back: ({ R, stroke, sw, color }) => (
        <g>
          {[
            { deg: -112, r: 0.34 },
            { deg: 58, r: 0.3 },
          ].map((p) => {
            const c = onHead(R, p.deg, 1.05);
            return <circle key={p.deg} cx={c.x} cy={c.y} r={p.r * R} fill={color} stroke={stroke} strokeWidth={sw} />;
          })}
        </g>
      ),
      front: ({ R, stroke, sw, color }) => {
        const outer: string[] = [];
        const inner: string[] = [];
        for (let i = 0; i <= 6; i++) {
          const deg = -28 + (78 * i) / 6;
          const o = onHead(R, deg, 1.06);
          const inn = onHead(R, deg, 0.72);
          outer.push(`${f2(o.x)},${f2(o.y)}`);
          inner.push(`${f2(inn.x)},${f2(inn.y)}`);
        }
        inner.reverse();
        return <polygon points={[...outer, ...inner].join(" ")} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      },
    },
  },
  "crop-01": {
    slot: "hair",
    layers: {
      front: ({ R, stroke, sw, color }) => {
        // A cap on the crown only. The old span ran down over the facing eye.
        const outer: string[] = [];
        const inner: string[] = [];
        const n = 7;
        const start = -70;
        const end = 36;
        for (let i = 0; i <= n; i++) {
          const deg = start + ((end - start) * i) / n;
          const tuft = i === n - 1 ? 0.22 : 0;
          const o = onHead(R, deg, 1.08 + tuft);
          const inn = onHead(R, deg, 0.8);
          outer.push(`${f2(o.x)},${f2(o.y)}`);
          inner.push(`${f2(inn.x)},${f2(inn.y)}`);
        }
        inner.reverse();
        return <polygon points={[...outer, ...inner].join(" ")} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      },
    },
  },
  "ears-long-01": {
    slot: "hair",
    layers: {
      back: ({ R, stroke, sw, color }) => {
        const ear = (side: number, scaleEar: number) => {
          const w = 0.2 * R * scaleEar;
          const h = 1.4 * R * scaleEar;
          const cx = side * 0.36 * R;
          const baseY = -0.62 * R;
          const top = baseY - h;
          const outer =
            `M ${f2(cx - w)} ${f2(baseY)} ` +
            `Q ${f2(cx - w * 1.05)} ${f2(top + h * 0.2)} ${f2(cx)} ${f2(top)} ` +
            `Q ${f2(cx + w * 1.05)} ${f2(top + h * 0.2)} ${f2(cx + w)} ${f2(baseY)} Z`;
          const inner =
            `M ${f2(cx - w * 0.42)} ${f2(baseY - h * 0.12)} ` +
            `Q ${f2(cx - w * 0.42)} ${f2(top + h * 0.32)} ${f2(cx)} ${f2(top + h * 0.22)} ` +
            `Q ${f2(cx + w * 0.42)} ${f2(top + h * 0.32)} ${f2(cx + w * 0.42)} ${f2(baseY - h * 0.12)} Z`;
          return (
            <g key={side}>
              <path d={outer} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
              <path d={inner} fill="#f3b7c8" />
            </g>
          );
        };
        return (
          <g>
            {ear(-1, 0.9)}
            {ear(1, 1)}
          </g>
        );
      },
    },
  },
  "shell-01": {
    slot: "body",
    layers: {
      body: ({ stroke, sw, color, hip, neck, heightPx }) => {
        if (!hip || !neck || heightPx == null) return null;
        const dx = neck.x - hip.x;
        const dy = neck.y - hip.y;
        const torsoLen = Math.hypot(dx, dy) || 1;
        const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
        const rx = heightPx * 0.2;
        const ry = heightPx * 0.15;
        const chord = (y: number) => {
          const x = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) * 0.86;
          return `M ${f2(-x)} ${f2(y)} L ${f2(x)} ${f2(y)}`;
        };
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <g transform={`translate(${f2(-heightPx * 0.04)} ${f2(-torsoLen * 0.42)})`}>
              <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={color} stroke={stroke} strokeWidth={sw} />
              <path
                d={`${chord(-ry * 0.32)} ${chord(ry * 0.28)} M 0 ${f2(-ry * 0.78)} L 0 ${f2(ry * 0.78)}`}
                fill="none"
                stroke={stroke}
                strokeWidth={sw * 0.45}
                strokeLinecap="round"
              />
            </g>
          </g>
        );
      },
    },
  },
  "tail-puff-01": {
    slot: "body",
    layers: {
      body: ({ stroke, sw, color, hip, neck, heightPx }) => {
        if (!hip || !neck || heightPx == null) return null;
        const angle = (Math.atan2(neck.x - hip.x, hip.y - neck.y) * 180) / Math.PI;
        return (
          <g transform={`translate(${f2(hip.x)} ${f2(hip.y)}) rotate(${f2(angle)})`}>
            <circle cx={-heightPx * 0.075} cy={heightPx * 0.02} r={heightPx * 0.038} fill={color} stroke={stroke} strokeWidth={sw * 0.65} />
          </g>
        );
      },
    },
  },
  "glasses-round": {
    slot: "eyewear",
    layers: {
      eyewear: ({ R, stroke, sw, character }) => {
        const f = character.face;
        const fx = f.offsetX * R;
        const ey = f.eyeY * R;
        const dx = (f.eyeSpacing / 2) * R;
        const r = 0.24 * R;
        const w = sw * 0.62;
        return (
          <g fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round">
            <circle cx={fx - dx} cy={ey} r={r * 0.95} />
            <circle cx={fx + dx} cy={ey} r={r} />
            <path d={`M ${f2(fx - dx + r * 0.95)} ${f2(ey - r * 0.1)} Q ${f2(fx)} ${f2(ey - r * 0.45)} ${f2(fx + dx - r)} ${f2(ey - r * 0.1)}`} />
          </g>
        );
      },
    },
  },
};

export const accessoryIds = (): string[] => Object.keys(REGISTRY);

export const renderAccessories = (
  character: Character,
  layer: AccessoryLayer,
  R: number,
  body?: BodyAnchor,
): React.ReactNode =>
  character.accessories.map((a, i) => {
    const def = REGISTRY[a.id];
    if (!def) throw new Error(`Unknown accessory "${a.id}" on character "${character.id}"`);
    const draw = def.layers[layer];
    if (!draw) return null;
    return (
      <g key={`${a.id}-${i}`}>
        {draw({
          R,
          stroke: character.style.stroke,
          sw: character.style.strokeWidth,
          color: a.color ?? character.style.stroke,
          character,
          hip: body?.hip,
          neck: body?.neck,
          heightPx: body?.heightPx,
        })}
      </g>
    );
  });
