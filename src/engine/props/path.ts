/** SVG path subset: `MLHVCQZ` and numbers. Anything else is an error string. */

const NUM = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const CMD = /[MLHVCSQZmlhvcsqz]/;

const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4 };

/** Why `d` is not a prop path, or undefined when it is valid. Coordinates must sit within ±0.6. */
export const pathError = (d: string): string | undefined => {
  const s = d.trim();
  if (!s) return "path is empty";
  let i = 0;
  let cmd = "";
  let saw = false;
  const skip = () => {
    while (i < s.length && /[\s,]/.test(s[i]!)) i++;
  };
  const number = (): number | undefined => {
    skip();
    NUM.lastIndex = i;
    const m = NUM.exec(s);
    if (!m || m.index !== i) return undefined;
    i = NUM.lastIndex;
    return Number(m[0]);
  };
  while (i < s.length) {
    skip();
    if (i >= s.length) break;
    const ch = s[i]!;
    if (CMD.test(ch)) {
      cmd = ch;
      i++;
      saw = true;
    } else if (!cmd) return `unexpected "${ch}"`;
    if (/[Zz]/.test(cmd)) continue;
    const upper = cmd.toUpperCase();
    const arity = ARITY[upper];
    if (!arity) return `command ${cmd} is not allowed`;
    for (let k = 0; k < arity; k++) {
      const n = number();
      if (n === undefined) return `path command ${cmd} is missing a number`;
      if (Math.abs(n) > 0.6) return `coordinate ${n} is outside ±0.6`;
    }
    if (upper === "M") cmd = cmd === "M" ? "L" : "l";
  }
  if (!saw) return "path has no commands";
  skip();
  if (i < s.length) return `unexpected "${s[i]}"`;
  return undefined;
};

export type PathPoint = { x: number; y: number };

/** Endpoints and control points, in absolute prop units. Used for bounds. */
export const pathPoints = (d: string): PathPoint[] => {
  if (pathError(d)) return [];
  const s = d.trim();
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const pts: PathPoint[] = [];
  const skip = () => {
    while (i < s.length && /[\s,]/.test(s[i]!)) i++;
  };
  const number = (): number => {
    skip();
    NUM.lastIndex = i;
    const m = NUM.exec(s);
    i = NUM.lastIndex;
    return Number(m?.[0] ?? 0);
  };
  /** One x,y pair. Relative pairs are relative to the point at the start of the command. */
  const pair = (rel: boolean, ox: number, oy: number): PathPoint => {
    const x = number();
    const y = number();
    return { x: rel ? ox + x : x, y: rel ? oy + y : y };
  };
  while (i < s.length) {
    skip();
    if (i >= s.length) break;
    if (CMD.test(s[i]!)) {
      cmd = s[i]!;
      i++;
    }
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    if (upper === "Z") {
      cx = sx;
      cy = sy;
      pts.push({ x: cx, y: cy });
      continue;
    }
    const ox = cx;
    const oy = cy;
    if (upper === "M" || upper === "L") {
      const p = pair(rel, ox, oy);
      cx = p.x;
      cy = p.y;
      if (upper === "M") {
        sx = p.x;
        sy = p.y;
        cmd = rel ? "l" : "L";
      }
      pts.push(p);
    } else if (upper === "H") {
      const x = number();
      cx = rel ? ox + x : x;
      pts.push({ x: cx, y: cy });
    } else if (upper === "V") {
      const y = number();
      cy = rel ? oy + y : y;
      pts.push({ x: cx, y: cy });
    } else if (upper === "C") {
      const c1 = pair(rel, ox, oy);
      const c2 = pair(rel, ox, oy);
      const p = pair(rel, ox, oy);
      pts.push(c1, c2, p);
      cx = p.x;
      cy = p.y;
    } else if (upper === "Q") {
      const c1 = pair(rel, ox, oy);
      const p = pair(rel, ox, oy);
      pts.push(c1, p);
      cx = p.x;
      cy = p.y;
    }
  }
  return pts;
};
