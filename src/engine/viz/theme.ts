/**
 * Figure colours from the set palette. On a light set the figures are ink; on a dark set they
 * are chalk. Accents are a fixed, colour-blind-aware set, tuned per ground.
 */
import { contrastRatio, luminance, mix } from "../lib/color";
import type { Palette } from "../set/palettes";
import type { ColorRef } from "./params";

export type VizTheme = {
  dark: boolean;
  ink: string;
  muted: string;
  paper: string;
  accent: string;
  highlight: string;
  myth: string;
  truth: string;
  a: readonly [string, string, string, string, string];
  /** Panel card behind a figure. */
  panel: string;
  stroke: number;
};

const LIGHT_ACCENTS = ["#2b6cb0", "#d9480f", "#2f855a", "#805ad5", "#b7791f"] as const;
const DARK_ACCENTS = ["#b3e1ff", "#ffc994", "#a6f2c6", "#e0ccff", "#fff09a"] as const;

export const themeFor = (palette: Palette): VizTheme => {
  const dark = luminance(palette.wallA) < 0.18;
  if (dark)
    return {
      dark,
      ink: "#f4f1e8",
      muted: mix("#f4f1e8", palette.wallA, 0.55),
      paper: mix(palette.wallA, "#000000", 0.35),
      accent: DARK_ACCENTS[0],
      highlight: "#ffd84a",
      myth: "#ff6b6b",
      truth: "#a6f2c6",
      a: DARK_ACCENTS,
      panel: mix(palette.wallA, "#000000", 0.4),
      stroke: 6,
    };
  return {
    dark,
    ink: "#1b1b1f",
    muted: mix("#1b1b1f", palette.wallA, 0.55),
    paper: "#fffdf7",
    accent: LIGHT_ACCENTS[0],
    highlight: "#e8590c",
    myth: "#d62828",
    truth: "#2f855a",
    a: LIGHT_ACCENTS,
    panel: mix(palette.wallA, "#ffffff", 0.7),
    stroke: 6,
  };
};

/** A colour slot or hex → a colour. */
export const resolveColor = (
  theme: VizTheme,
  c: ColorRef | undefined,
  fallback: string = theme.ink,
): string => {
  if (!c) return fallback;
  if (c.startsWith("#")) return c;
  switch (c) {
    case "ink":
      return theme.ink;
    case "muted":
      return theme.muted;
    case "paper":
      return theme.paper;
    case "accent":
      return theme.accent;
    case "highlight":
      return theme.highlight;
    case "myth":
      return theme.myth;
    case "truth":
      return theme.truth;
    default: {
      const i = Number(c.slice(1)) - 1;
      return theme.a[i] ?? theme.ink;
    }
  }
};

/** The worst contrast of the theme's figure colours against the set's wall (QA). */
export const themeContrast = (theme: VizTheme, palette: Palette): number =>
  Math.min(
    ...[theme.ink, theme.highlight, ...theme.a.slice(0, 3)].map((c) =>
      contrastRatio(c, palette.wallA),
    ),
  );
