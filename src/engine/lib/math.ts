export type Vec2 = { x: number; y: number };

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const mid = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

export const DEG = Math.PI / 180;

/** Wrap an angle in degrees to (-180, 180]. */
export const wrapDeg = (a: number): number => {
  const w = ((((a + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
};

/** Interpolate angles in degrees along the shortest arc. t may exceed [0,1] (overshoot). */
export const lerpAngle = (a: number, b: number, t: number): number => a + wrapDeg(b - a) * t;

/**
 * Rig angle convention: 0° points straight down, +90° points forward (+x in the
 * canonical right-facing space), 180° points up. Screen y grows downward.
 */
export const dirFromAngle = (deg: number): Vec2 => ({
  x: Math.sin(deg * DEG),
  y: Math.cos(deg * DEG),
});

/** Unit normal of a -> b, rotated 90° counter-clockwise on screen. */
export const normal = (a: Vec2, b: Vec2): Vec2 => {
  const d = sub(b, a);
  const l = len(d) || 1;
  return { x: d.y / l, y: -d.x / l };
};

export const f2 = (n: number): string => (Math.round(n * 100) / 100).toString();
