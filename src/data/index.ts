import type { z } from "zod";
import { CharacterSchema, PoseSchema, ExpressionSchema, SetSchema, type Library, type SetDef } from "../engine";

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
export const EXPRESSION_IDS = ["neutral", "happy", "smug", "sarcastic", "annoyed", "angry", "shocked", "sad", "crying", "cringe", "confused", "deadpan"];

export const library: Library = {
  characters: table("character", CharacterSchema, [milo, june]),
  poses: table("pose", PoseSchema, [idle, point, shrug, facepalm, armsUp, armsCrossed, think, leanIn, recoil, slump, handsOnHips, holdPhone]),
  expressions: table("expression", ExpressionSchema, [neutral, happy, smug, sarcastic, annoyed, angry, shocked, sad, crying, cringe, confused, deadpan]),
};

export const sets: Record<string, SetDef> = table("set", SetSchema, [plain1, living1]);
