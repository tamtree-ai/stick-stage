/** Local font files (no network at render time). Latin stays on Montserrat. */

export type FontChoice = { family: string; file: string; direction: "ltr" | "rtl" };

export const FONT_STACK: { test: RegExp; family: string; file: string; direction: "ltr" | "rtl" }[] = [
  { test: /^(ar|fa|ur)\b/i, family: "Noto Sans Arabic", file: "fonts/NotoSansArabic-Regular.woff", direction: "rtl" },
  { test: /^he\b/i, family: "Noto Sans Hebrew", file: "fonts/NotoSansHebrew-Regular.woff", direction: "rtl" },
  { test: /^ja\b/i, family: "Noto Sans JP", file: "fonts/NotoSansJP-Regular.woff", direction: "ltr" },
  { test: /^(zh|yue)\b/i, family: "Noto Sans SC", file: "fonts/NotoSansSC-Regular.woff", direction: "ltr" },
  { test: /^ko\b/i, family: "Noto Sans KR", file: "fonts/NotoSansKR-Regular.woff", direction: "ltr" },
  { test: /^hi\b/i, family: "Noto Sans Devanagari", file: "fonts/NotoSansDevanagari-Regular.woff", direction: "ltr" },
  { test: /^(si|ta)\b/i, family: "Noto Sans Sinhala", file: "fonts/NotoSansSinhala-Regular.woff", direction: "ltr" },
];

export const LATIN_FONT: FontChoice = { family: "Montserrat", file: "fonts/Montserrat-Variable.ttf", direction: "ltr" };

export const fontFor = (language: string | undefined): FontChoice => {
  const lang = language ?? "en";
  const hit = FONT_STACK.find((f) => f.test.test(lang));
  return hit ? { family: hit.family, file: hit.file, direction: hit.direction } : LATIN_FONT;
};

/**
 * Fallbacks after the text font, for science captions: Greek letters and ħ from Noto Sans, maths
 * symbols (∫ ∑ ≈ ∝ √ …) from Noto Sans Math. Both OFL, local files.
 */
export const SYMBOL_FALLBACKS: readonly { family: string; file: string; weight?: string }[] = [
  { family: "StickStage Greek", file: "fonts/NotoSans-Variable.ttf", weight: "100 900" },
  { family: "StickStage Math", file: "fonts/NotoSansMath-Regular.ttf" },
];

/** A CSS / SVG `font-family` value: the family, then the symbol fallbacks. */
export const withSymbolFallbacks = (family: string): string => [family, ...SYMBOL_FALLBACKS.map((f) => f.family)].map((f) => `"${f}"`).join(", ");
