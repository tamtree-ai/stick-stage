import React from "react";
import { Face } from "../face/Face";
import type { FaceState } from "../face/expressions";
import { f2, type Vec2 } from "../lib/math";
import { renderAccessories } from "./accessories";
import type { SymbolId } from "../face/schema";
import { PropView } from "../props/PropView";
import { propAngle, type PropState } from "../props/track";
import { limbControl, limbPath } from "./limbs";
import type { Character, PoseAngles } from "./schema";
import type { Joints, RigMetrics } from "./skeleton";

export type RigProps = {
  character: Character;
  joints: Joints;
  metrics: RigMetrics;
  bend: PoseAngles["bend"];
  face: FaceState;
  blink: number;
  frame: number;
  symbolsSince: number;
  symbolAges?: Partial<Record<SymbolId, number>>;
  props: PropState;
  /** Drawn mirrored (facing left): text-bearing parts counter-flip. */
  mirrored?: boolean;
  /** Font for text on props (signs). */
  fontFamily?: string;
};

type LimbProps = {
  root: Vec2;
  joint: Vec2;
  tip: Vec2;
  curve: number;
  side: 1 | -1;
  stroke: string;
  sw: number;
};

const Limb: React.FC<LimbProps> = ({ root, joint, tip, curve, side, stroke, sw }) => (
  <path
    d={limbPath(root, limbControl(root, joint, tip, curve, side), tip)}
    fill="none"
    stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/** Renders one figure in figure space (root on the ground at 0,0, facing right). */
export const Rig: React.FC<RigProps> = ({
  character,
  joints: j,
  metrics: m,
  bend,
  face,
  blink,
  frame,
  symbolsSince,
  symbolAges,
  props,
  mirrored = false,
  fontFamily = "sans-serif",
}) => {
  const { stroke, strokeWidth: sw, headFill, torso, limbCurve, footFill } = character.style;
  const R = m.headR;
  const curve = (k: keyof PoseAngles["bend"]) => bend[k] ?? limbCurve;
  const figurePx = m.heightPx / character.proportions.height;
  const propCommon = { figurePx, stroke, sw, mirrored, fontFamily };

  // A held prop sits between the arm and the hand nub, so the nub reads as the grip.
  const held = (s: "L" | "R") => {
    const h = props.held[s];
    if (!h) return null;
    const hand = s === "L" ? j.handL : j.handR;
    const elbow = s === "L" ? j.elbowL : j.elbowR;
    return <PropView def={h.def} x={hand.x} y={hand.y} angle={propAngle(h.def, elbow, hand)} scale={h.pop} {...propCommon} />;
  };

  const arm = (s: "L" | "R") => (
    <g key={`arm${s}`}>
      <Limb
        root={j.shoulder}
        joint={s === "L" ? j.elbowL : j.elbowR}
        tip={s === "L" ? j.handL : j.handR}
        curve={curve(s === "L" ? "armL" : "armR")}
        side={-1}
        stroke={stroke}
        sw={sw}
      />
      {held(s)}
      <circle cx={s === "L" ? j.handL.x : j.handR.x} cy={s === "L" ? j.handL.y : j.handR.y} r={m.handR} fill={stroke} />
    </g>
  );

  const leg = (s: "L" | "R") => {
    const foot = s === "L" ? j.footL : j.footR;
    return (
      <g key={`leg${s}`}>
        <Limb
          root={j.hip}
          joint={s === "L" ? j.kneeL : j.kneeR}
          tip={s === "L" ? j.ankleL : j.ankleR}
          curve={curve(s === "L" ? "legL" : "legR") * 0.6}
          side={1}
          stroke={stroke}
          sw={sw}
        />
        <ellipse cx={foot.x} cy={foot.y} rx={m.footRx} ry={m.footRy} fill={footFill} stroke={stroke} strokeWidth={sw * 0.8} />
      </g>
    );
  };

  const torsoAngle = (Math.atan2(j.neck.x - j.hip.x, j.hip.y - j.neck.y) * 180) / Math.PI;
  const torsoLen = Math.hypot(j.neck.x - j.hip.x, j.neck.y - j.hip.y);

  const body =
    torso.style === "line" ? (
      <line x1={j.hip.x} y1={j.hip.y} x2={j.head.x} y2={j.head.y} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    ) : (
      <g transform={`translate(${f2(j.hip.x)} ${f2(j.hip.y)}) rotate(${f2(torsoAngle)})`}>
        <rect
          x={(-torso.width * m.heightPx) / 2}
          y={-torsoLen - sw}
          width={torso.width * m.heightPx}
          height={torsoLen + sw + torso.width * m.heightPx * 0.25}
          rx={(torso.width * m.heightPx) / 2}
          fill={torso.fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </g>
    );

  return (
    <g>
      {renderAccessories(character, "body", R, { hip: j.hip, neck: j.neck, heightPx: m.heightPx })}
      {leg("L")}
      {arm("L")}
      {body}
      {leg("R")}
      <g transform={`translate(${f2(j.head.x)} ${f2(j.head.y)}) rotate(${f2(j.headTilt)})`}>
        {renderAccessories(character, "back", R)}
        <circle r={R} fill={headFill} stroke={stroke} strokeWidth={sw} />
        {renderAccessories(character, "front", R)}
        <Face character={character} face={face} R={R} blink={blink} frame={frame} symbolsSince={symbolsSince} symbolAges={symbolAges} mirrored={mirrored} />
        {renderAccessories(character, "eyewear", R)}
      </g>
      {arm("R")}
      {props.dropped.map((d, i) => (
        <PropView key={i} def={d.def} x={d.x} y={d.y} angle={d.angle} {...propCommon} />
      ))}
    </g>
  );
};
