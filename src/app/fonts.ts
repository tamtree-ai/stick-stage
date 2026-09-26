import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/** Montserrat (OFL, `public/fonts/`), bundled locally so renders never fetch fonts. */
export const TEXT_FONT = "StickStage Sans";

loadFont({ family: TEXT_FONT, url: staticFile("fonts/Montserrat-Variable.ttf"), weight: "100 900" }).catch((err) => {
  throw new Error(`Could not load ${TEXT_FONT}: ${String(err)}`);
});
