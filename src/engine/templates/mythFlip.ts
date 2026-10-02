/**
 * `myth-flip`, the misconception dialog: the skeptic (first cast member) states a myth, the host
 * (second) shows the truth with a prop or a figure, the skeptic sees it, the host says why and
 * why the myth felt true, then the takeaway. Roles pick the faces, gestures and gags.
 */
import type { Diagnostic } from "../director/diagnostics";
import type { SkitInput } from "../director/schema";
import type { LineRole } from "../director/science";
import type { Premise, PremiseLine } from "./premise";

type Beat = NonNullable<SkitInput["beats"]>[number];
type Action = NonNullable<Beat["actions"]>[number];

export const MYTH_FLIP_EXPRESSION: Partial<Record<LineRole, string>> = {
  myth: "smug",
  pushback: "happy",
  prediction: "smug",
  demo: "happy",
  reaction: "shocked",
  why: "neutral",
  "why-it-felt-true": "neutral",
  takeaway: "happy",
  loop: "smug",
};

/** The roles a myth-flip needs, in the order they usually come. */
export const MYTH_FLIP_ROLES: readonly LineRole[] = ["myth", "pushback", "prediction", "demo", "reaction", "why", "why-it-felt-true", "takeaway"];

export const checkMythFlip = (p: Premise, flat: readonly PremiseLine[]): Diagnostic[] => {
  const d: Diagnostic[] = [];
  const has = (r: LineRole) => flat.some((l) => l.role === r);
  if (!has("myth")) d.push({ level: "error", code: "template-myth", path: "lines", message: `a myth-flip opens on the skeptic's myth`, example: `{ "who": "${p.cast[0]?.id ?? "gus"}", "role": "myth", "text": "Heavy things fall faster. Obviously." }` });
  if (!has("takeaway")) d.push({ level: "error", code: "template-takeaway", path: "lines", message: `a myth-flip ends on a takeaway the viewer can repeat`, example: `{ "who": "${p.cast[1]?.id ?? "vera"}", "role": "takeaway", "text": "Without air, everything falls together." }` });
  return d;
};

/** Default role when a line names none: the line order of a standard myth-flip. */
export const mythFlipRole = (flat: readonly PremiseLine[], i: number): LineRole => flat[i]!.role ?? MYTH_FLIP_ROLES[Math.min(i, MYTH_FLIP_ROLES.length - 1)]!;

/** Role staging on top of the generic beat: who points at what, who crosses their arms, which gag. */
export const dressMythFlip = (p: Premise, beats: Beat[], flat: readonly PremiseLine[], firstFigure: (lineIndex: number) => string | undefined): Beat[] => {
  const skeptic = p.cast[0]!.id;
  return beats.map((b, i) => {
    const line = flat[i]!;
    const role = (b.role ?? "why") as LineRole;
    const who = b.speaker!;
    const extra: Action[] = [];
    const fig = firstFigure(i);
    const out: Beat = { ...b };
    if (role === "prediction" && who === skeptic) extra.push({ who, do: "pose", pose: "arms-crossed", at: { fraction: 0.1 } });
    if ((role === "demo" || role === "why") && who !== skeptic) {
      extra.push({ who, do: "pose", pose: "point", at: { fraction: 0.1 } });
      if (fig) extra.push({ who, do: "look", to: `figure:${fig}`, at: { fraction: 0.1 } });
    }
    if (role === "why-it-felt-true") extra.push({ who, do: "pose", pose: "shrug", at: { fraction: 0.2 } });
    if (role === "reaction" && !line.gag) {
      // A short "…huh." is the graceful concede; anything longer gets the double-take.
      const short = line.text.split(/\s+/).length <= 3;
      extra.push({ who, do: "gag", gag: short ? "concede" : "double-take", at: { ms: 0 } });
    }
    if (role === "takeaway") Object.assign(out, { punchline: true, pauseBeforeMs: 350, holdAfterMs: 400, reaction: "happy" });
    if (role === "loop") Object.assign(out, { punchline: false, reaction: false as const });
    out.actions = [...(b.actions ?? []).filter((a) => !(a.do === "pose" && extra.some((e) => e.do === "pose" && e.who === a.who))), ...extra];
    return out;
  });
};
