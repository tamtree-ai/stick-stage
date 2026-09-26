import type { z } from "zod";
import { CharacterSchema, PoseSchema, PropSchema, ExpressionSchema, ReactionTableSchema, SafeAreaSchema, SetSchema, SfxManifestSchema, type Library, type ReactionTable, type SafeArea, type SetDef, type SfxManifest } from "../engine";

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

import safeAreaJson from "./safe-area.json";
import reactionsJson from "./reactions.json";
import sfxJson from "./sfx.json";

const table = <S extends z.ZodType<{ id: string }>>(kind: string, schema: S, docs: unknown[]) => {
  const out: Record<string, z.infer<S>> = {};
  for (const doc of docs) {
    const r = schema.safeParse(doc);
    if (!r.success) {
      const id = (doc as { id?: string }).id ?? "?";
      throw new Error(`Invalid ${kind} "${id}":\n${r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    }
    out[r.data.id] = r.data;
  }
  return out;
};

/** Order matters: labs cycle through poses/expressions in this order. */
export const POSE_IDS = ["idle", "point", "shrug", "facepalm", "arms-up", "arms-crossed", "think", "lean-in", "recoil", "slump", "hands-on-hips", "hold-phone"];
/** Poses added after M1 (labs that cycle POSE_IDS skip these). */
export const EXTRA_POSE_IDS = ["sit", "hold-out", "hold-chest", "hold-up", "high-five", "shove"];
export const PROP_IDS = ["phone", "mic", "cup", "laptop", "sign"];
export const EXPRESSION_IDS = ["neutral", "happy", "smug", "sarcastic", "annoyed", "angry", "shocked", "sad", "crying", "cringe", "confused", "deadpan"];

export const library: Library = {
  characters: table("character", CharacterSchema, [milo, june]),
  poses: table("pose", PoseSchema, [idle, point, shrug, facepalm, armsUp, armsCrossed, think, leanIn, recoil, slump, handsOnHips, holdPhone, sit, holdOut, holdChest, holdUp, highFive, shove]),
  expressions: table("expression", ExpressionSchema, [neutral, happy, smug, sarcastic, annoyed, angry, shocked, sad, crying, cringe, confused, deadpan]),
  props: table("prop", PropSchema, [phone, mic, cup, laptop, sign]),
};

export const sets: Record<string, SetDef> = table("set", SetSchema, [plain1, living1, lounge1, office1, park1, street1]);

/** One conservative profile for TikTok / Reels / Shorts overlays (verify against real screenshots in M4). */
export const safeArea: SafeArea = SafeAreaSchema.parse(safeAreaJson);

/** Listener reaction defaults: speaker expression → listener expression. */
export const reactions: ReactionTable = ReactionTableSchema.parse(reactionsJson);

/** SFX library manifest (`pnpm sfx` regenerates the synthesized entries). */
export const sfxLibrary: SfxManifest = SfxManifestSchema.parse(sfxJson);
