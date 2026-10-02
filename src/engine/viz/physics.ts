/**
 * The real physics behind the figures. Every function is closed-form in time (or a fixed
 * number of seeded steps), so any frame can be drawn on its own: frame-pure.
 */
import { rand } from "../lib/seed";

/** Solve Kepler's equation M = E − e·sin E for the eccentric anomaly E (Newton, from E = M). */
export const eccentricAnomaly = (M: number, e: number): number => {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return E;
};

/**
 * Position on a Kepler ellipse with the star at the origin (one focus), periapsis on +x.
 * `phase` is the fraction of the period since periapsis. Units: semi-major axis `a`.
 */
export const keplerPosition = (
  phase: number,
  e: number,
  a = 1,
): { x: number; y: number; E: number } => {
  const M = 2 * Math.PI * (phase - Math.floor(phase));
  const E = eccentricAnomaly(M, e);
  const b = a * Math.sqrt(1 - e * e);
  return { x: a * (Math.cos(E) - e), y: b * Math.sin(E), E };
};

/** Orbital speed from the vis-viva equation (GM = 1): v² = 2/r − 1/a. */
export const visViva = (r: number, a = 1): number => Math.sqrt(Math.max(0, 2 / r - 1 / a));

export type WaveComponent = { amp: number; wavelength: number; period: number; phase: number };

/** One travelling sine: y = A sin(2π(x/λ − t/T) + φ). */
export const travelling = (w: WaveComponent, x: number, t: number): number =>
  w.amp * Math.sin(2 * Math.PI * (x / w.wavelength - t / w.period) + w.phase);

/** Standing wave from two opposite travelling waves: 2A sin(kx) cos(ωt). */
export const standing = (w: WaveComponent, x: number, t: number): number =>
  2 *
  w.amp *
  Math.sin((2 * Math.PI * x) / w.wavelength + w.phase) *
  Math.cos((2 * Math.PI * t) / w.period);

/** A Gaussian wave packet moving at the group velocity λ/T. `width` in x units. */
export const packet = (
  w: WaveComponent,
  x: number,
  t: number,
  width: number,
  x0: number,
): number => {
  const c = x0 + (w.wavelength / w.period) * t;
  const env = Math.exp(-((x - c) ** 2) / (2 * width * width));
  return env * travelling(w, x, t);
};

/** Fold a free coordinate into [0, L] as if it bounced off both walls (closed form). */
export const bounce = (s: number, L: number): number => {
  if (L <= 0) return 0;
  const m = ((s % (2 * L)) + 2 * L) % (2 * L);
  return m <= L ? m : 2 * L - m;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: number;
  charge: -1 | 0 | 1;
};

/**
 * Seeded particles in the unit box with random velocities (speed in box widths per second).
 * Colours and charges are indices the drawer maps to the theme.
 */
export const seedParticles = (
  seed: string,
  count: number,
  speed: number,
  colors: number,
  charged: boolean,
): Particle[] =>
  Array.from({ length: count }, (_, i) => {
    const a = rand(seed, `a${i}`) * Math.PI * 2;
    const s = speed * (0.4 + 1.2 * rand(seed, `s${i}`));
    const q = rand(seed, `q${i}`);
    return {
      x: rand(seed, `x${i}`),
      y: rand(seed, `y${i}`),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 0.7 + 0.6 * rand(seed, `r${i}`),
      color: Math.floor(rand(seed, `c${i}`) * colors),
      charge: charged ? (q < 0.5 ? -1 : 1) : 0,
    };
  });

/** Where a particle is at `t` seconds in a gas (bouncing in the box), drifting, or falling. */
export const particleAt = (
  p: Particle,
  t: number,
  mode: "gas" | "drift" | "still" | "fall",
  aspect: number,
  gravity = 1,
): { x: number; y: number } => {
  if (mode === "still") return { x: p.x, y: p.y };
  if (mode === "drift")
    return { x: (((p.x + p.vx * t) % 1) + 1) % 1, y: (((p.y + p.vy * t) % 1) + 1) % 1 };
  if (mode === "fall") return { x: p.x, y: Math.min(1, p.y * 0.3 + 0.5 * gravity * t * t) };
  // The box is `aspect` wide per unit of height: bounce x across [0, 1] in its own units.
  return { x: bounce(p.x + (p.vx * t) / aspect, 1), y: bounce(p.y + p.vy * t, 1) };
};

/** The i-th seeded draw of a source: a die face 1…sides, a coin 0/1, or a standard normal. */
export const sample = (
  seed: string,
  source: "dice" | "coin" | "normal" | "two-dice",
  i: number,
  sides = 6,
): number => {
  if (source === "coin") return rand(seed, i) < 0.5 ? 0 : 1;
  if (source === "dice") return 1 + Math.floor(rand(seed, i) * sides);
  if (source === "two-dice")
    return 2 + Math.floor(rand(seed, `${i}a`) * sides) + Math.floor(rand(seed, `${i}b`) * sides);
  // Box–Muller from two seeded uniforms.
  const u = Math.max(1e-9, rand(seed, `${i}u`));
  const v = rand(seed, `${i}v`);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Counts per bin for the first `n` draws. `bins` are the bin lower edges for normal draws. */
export const tally = (
  seed: string,
  source: "dice" | "coin" | "normal" | "two-dice",
  n: number,
  sides: number,
  bins: number,
): number[] => {
  const counts = new Array<number>(bins).fill(0);
  const whole = Math.max(0, Math.floor(n));
  for (let i = 0; i < whole; i++) {
    const v = sample(seed, source, i, sides);
    let b: number;
    if (source === "dice") b = v - 1;
    else if (source === "two-dice") b = v - 2;
    else if (source === "coin") b = v;
    else b = Math.floor(((v + 3) / 6) * bins);
    if (b >= 0 && b < bins) counts[b]!++;
  }
  return counts;
};

/** Expected share per bin for the same sources (for the "what probability says" line). */
export const expectedShare = (
  source: "dice" | "coin" | "normal" | "two-dice",
  sides: number,
  bins: number,
): number[] => {
  if (source === "coin") return [0.5, 0.5];
  if (source === "dice") return new Array<number>(sides).fill(1 / sides);
  if (source === "two-dice")
    return Array.from(
      { length: 2 * sides - 1 },
      (_, k) => (sides - Math.abs(k + 2 - (sides + 1))) / (sides * sides),
    );
  const pdf = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
  return Array.from({ length: bins }, (_, k) => pdf(-3 + ((k + 0.5) * 6) / bins) * (6 / bins));
};
