import { buildCatalog, createLibrary, createSets, migrate, SafeAreaProfilesSchema, type SafeAreaProfiles, ReactionTableSchema, SafeAreaSchema, SfxManifestSchema, type Library, type ReactionTable, type Catalog, type SafeArea, type SetDef, type SfxManifest } from "../engine/core";

import milo from "./characters/milo.json";
import june from "./characters/june.json";

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

import phone from "./props/phone.json";
import mic from "./props/mic.json";
import cup from "./props/cup.json";
import laptop from "./props/laptop.json";
import sign from "./props/sign.json";

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

import castNotesJson from "./cast-notes.json";
import safeAreaJson from "./safe-area.json";
import safeAreaProfilesJson from "./safe-area-profiles.json";
import reactionsJson from "./reactions.json";
import sfxJson from "./sfx.json";

/** Order matters: labs cycle through poses/expressions in this order. */
export const POSE_IDS = ["idle", "point", "shrug", "facepalm", "arms-up", "arms-crossed", "think", "lean-in", "recoil", "slump", "hands-on-hips", "hold-phone"];
/** Poses added after M1 (labs that cycle POSE_IDS skip these). */
export const EXTRA_POSE_IDS = ["sit", "hold-out", "hold-chest", "hold-up", "high-five", "shove"];
export const PROP_IDS = ["phone", "mic", "cup", "laptop", "sign"];
export const EXPRESSION_IDS = ["neutral", "happy", "smug", "sarcastic", "annoyed", "angry", "shocked", "sad", "crying", "cringe", "confused", "deadpan"];

export const library: Library = createLibrary({
  characters: [milo, june],
  poses: [idle, point, shrug, facepalm, armsUp, armsCrossed, think, leanIn, recoil, slump, handsOnHips, holdPhone, sit, holdOut, holdChest, holdUp, highFive, shove],
  expressions: [neutral, happy, smug, sarcastic, annoyed, angry, shocked, sad, crying, cringe, confused, deadpan],
  props: [phone, mic, cup, laptop, sign],
});

export const sets: Record<string, SetDef> = createSets([plain1, living1, lounge1, office1, park1, street1, kitchen1, bedroom1, cafe1, classroom1, meeting1, living2, park2, streetNight1, beach1, stage1]);

/** One conservative profile for TikTok / Reels / Shorts overlays (verify against real screenshots in M4). */
export const safeArea: SafeArea = SafeAreaSchema.parse(migrate("safeArea", safeAreaJson).doc);

/** Per-platform overlay measurements; `safeArea` is the strictest of them (`pnpm safearea`). */
export const safeAreaProfiles: SafeAreaProfiles = SafeAreaProfilesSchema.parse(safeAreaProfilesJson);

/** Listener reaction defaults: speaker expression → listener expression. */
export const reactions: ReactionTable = ReactionTableSchema.parse(migrate("reactions", reactionsJson).doc);

/** SFX library manifest (`pnpm sfx` regenerates the synthesized entries). */
export const sfxLibrary: SfxManifest = SfxManifestSchema.parse(migrate("sfx", sfxJson).doc);

/** The shipped registry as a picker sees it, with its content version (`GET /catalog` reports the same). */
export const catalog: Catalog = buildCatalog({ lib: library, sets, sfx: sfxLibrary, reactions, safeArea });

/** How each shipped character is played. A character with no entry is played straight. */
export const castNotes: Readonly<Record<string, string>> = castNotesJson;
