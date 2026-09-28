import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONT_STACK } from "../engine/text/fonts";

/** Montserrat (OFL, `public/fonts/`), bundled locally so renders never fetch fonts. */
export const TEXT_FONT = "StickStage Sans";

const load = (family: string, file: string, weight?: string) =>
  loadFont({ family, url: staticFile(file), ...(weight ? { weight } : {}) }).catch((err) => {
    throw new Error(`Could not load ${family} (${file}): ${String(err)}`);
  });

load(TEXT_FONT, "fonts/Montserrat-Variable.ttf", "100 900");
for (const font of FONT_STACK) load(font.family, font.file);
