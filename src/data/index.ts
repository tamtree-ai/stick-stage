import { ImageManifestSchema, PronunciationsSchema, type Pronunciation, type ImageDef, buildCatalog, createLibrary, createSets, migrate, MusicManifestSchema, SafeAreaProfilesSchema, SeriesSchema, type MusicManifest, type SafeAreaProfiles, type Series, ReactionTableSchema, SafeAreaSchema, SfxManifestSchema, type Library, type ReactionTable, type Catalog, type SafeArea, type SetDef, type SfxManifest } from "../engine/core";

import milo from "./characters/milo.json";
import june from "./characters/june.json";
import lila from "./characters/lila.json";
import theo from "./characters/theo.json";
import moss from "./characters/moss.json";
import dash from "./characters/dash.json";
import reed from "./characters/reed.json";
import nell from "./characters/nell.json";
import pip from "./characters/pip.json";
import vera from "./characters/vera.json";
import gus from "./characters/gus.json";

import idle from "./poses/idle.json";
import point from "./poses/point.json";
import shrug from "./poses/shrug.json";
import facepalm from "./poses/facepalm.json";
import armsUp from "./poses/arms-up.json";
import armsCrossed from "./poses/arms-crossed.json";
import think from "./poses/think.json";
import leanIn from "./poses/lean-in.json";
import recoil from "./poses/recoil.json";
import slump from "./poses/slump.json";
import handsOnHips from "./poses/hands-on-hips.json";
import holdPhone from "./poses/hold-phone.json";
import sit from "./poses/sit.json";
import holdOut from "./poses/hold-out.json";
import holdChest from "./poses/hold-chest.json";
import holdUp from "./poses/hold-up.json";
import highFive from "./poses/high-five.json";
import shove from "./poses/shove.json";
import faintPose from "./poses/faint.json";

import { PROP_DOCS, PROP_IDS } from "./props";
import miloJune from "./series/milo-june.json";
import parkFables from "./series/park-fables.json";

import neutral from "./expressions/neutral.json";
import happy from "./expressions/happy.json";
import smug from "./expressions/smug.json";
import sarcastic from "./expressions/sarcastic.json";
import annoyed from "./expressions/annoyed.json";
import angry from "./expressions/angry.json";
import shocked from "./expressions/shocked.json";
import sad from "./expressions/sad.json";
import crying from "./expressions/crying.json";
import cringe from "./expressions/cringe.json";
import confused from "./expressions/confused.json";
import deadpan from "./expressions/deadpan.json";

import plain1 from "./sets/plain-1.json";
import living1 from "./sets/living-1.json";
import lounge1 from "./sets/lounge-1.json";
import office1 from "./sets/office-1.json";
import park1 from "./sets/park-1.json";
import street1 from "./sets/street-1.json";
import kitchen1 from "./sets/kitchen-1.json";
import bedroom1 from "./sets/bedroom-1.json";
import cafe1 from "./sets/cafe-1.json";
import classroom1 from "./sets/classroom-1.json";
import meeting1 from "./sets/meeting-1.json";
import living2 from "./sets/living-2.json";
import park2 from "./sets/park-2.json";
import streetNight1 from "./sets/street-night-1.json";
import beach1 from "./sets/beach-1.json";
import stage1 from "./sets/stage-1.json";
import widePlain from "./sets/wide-plain.json";
import wideLiving from "./sets/wide-living.json";
import wideLounge from "./sets/wide-lounge.json";
import wideOffice from "./sets/wide-office.json";
import widePark from "./sets/wide-park.json";
import wideStreet from "./sets/wide-street.json";
import wideCafe from "./sets/wide-cafe.json";
import wideClassroom from "./sets/wide-classroom.json";
import void1 from "./sets/void-1.json";
import blueprint1 from "./sets/blueprint-1.json";
import space1 from "./sets/space-1.json";
import lab1 from "./sets/lab-1.json";

import castNotesJson from "./cast-notes.json";
import safeAreaJson from "./safe-area.json";
import safeAreaProfilesJson from "./safe-area-profiles.json";
import reactionsJson from "./reactions.json";
import sfxJson from "./sfx.json";
import musicJson from "./music.json";
import imagesJson from "./images.json";
import pronunciationsJson from "./pronunciations.json";

/** Order matters: labs cycle through poses/expressions in this order. */
export const POSE_IDS = ["idle", "point", "shrug", "facepalm", "arms-up", "arms-crossed", "think", "lean-in", "recoil", "slump", "hands-on-hips", "hold-phone"];
/** Poses added after M1 (labs that cycle POSE_IDS skip these). */
export const EXTRA_POSE_IDS = ["sit", "hold-out", "hold-chest", "hold-up", "high-five", "shove", "faint"];
export { PROP_IDS };
export const EXPRESSION_IDS = ["neutral", "happy", "smug", "sarcastic", "annoyed", "angry", "shocked", "sad", "crying", "cringe", "confused", "deadpan"];

export const library: Library = createLibrary({
  characters: [milo, june, lila, theo, moss, dash, reed, nell, pip, vera, gus],
  poses: [idle, point, shrug, facepalm, armsUp, armsCrossed, think, leanIn, recoil, slump, handsOnHips, holdPhone, sit, holdOut, holdChest, holdUp, highFive, shove, faintPose],
  expressions: [neutral, happy, smug, sarcastic, annoyed, angry, shocked, sad, crying, cringe, confused, deadpan],
  props: PROP_DOCS,
});

export const sets: Record<string, SetDef> = createSets([
  plain1, living1, lounge1, office1, park1, street1, kitchen1, bedroom1, cafe1, classroom1, meeting1, living2, park2, streetNight1, beach1, stage1,
  widePlain, wideLiving, wideLounge, wideOffice, widePark, wideStreet, wideCafe, wideClassroom,
  void1, blueprint1, space1, lab1,
]);

/** One conservative profile for TikTok / Reels / Shorts overlays (verify against real screenshots in M4). */
export const safeArea: SafeArea = SafeAreaSchema.parse(migrate("safeArea", safeAreaJson).doc);

/** Per-platform overlay measurements; `safeArea` is the strictest of them (`pnpm safearea`). */
export const safeAreaProfiles: SafeAreaProfiles = SafeAreaProfilesSchema.parse(safeAreaProfilesJson);

/** Listener reaction defaults: speaker expression → listener expression. */
export const reactions: ReactionTable = ReactionTableSchema.parse(migrate("reactions", reactionsJson).doc);

/** SFX library manifest (`pnpm sfx` regenerates the synthesized entries). */
export const sfxLibrary: SfxManifest = SfxManifestSchema.parse(migrate("sfx", sfxJson).doc);

/** One original bed (`pnpm music`). Not part of the catalog hash. */
export const musicLibrary: MusicManifest = MusicManifestSchema.parse(migrate("music", musicJson).doc);

/** The shipped registry as a picker sees it, with its content version (`GET /catalog` reports the same). */
export const catalog: Catalog = buildCatalog({ lib: library, sets, sfx: sfxLibrary, reactions, safeArea });

/** Shows the skill reads. Not part of the catalog hash: a skit may name a series the registry does not ship. */
export const series: Readonly<Record<string, Series>> = {
  "milo-june": SeriesSchema.parse(migrate("series", miloJune).doc),
  "park-fables": SeriesSchema.parse(migrate("series", parkFables).doc),
};

/** How each shipped character is played. A character with no entry is played straight. */
export const castNotes: Readonly<Record<string, string>> = castNotesJson;

/** Credited NASA / ESA images (`public/images/`), by id. Only allow-listed licences load. */
export const images: Readonly<Record<string, ImageDef>> = Object.fromEntries(ImageManifestSchema.parse(imagesJson).images.map((i) => [i.id, i]));

/** How to say science words; `skitLines(doc, pronunciations)` attaches the ones a line uses for the harness TTS. */
export const pronunciations: readonly Pronunciation[] = PronunciationsSchema.parse(pronunciationsJson).words;
