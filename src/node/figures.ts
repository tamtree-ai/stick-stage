/** Figures, Node side: typeset a skit's equations into `generated/equations.json` (hash-cached). */
import fs from "node:fs";
import path from "node:path";
import { EquationCacheSchema, texOfSkit, type EquationCache, type Typeset } from "../engine/core";
import { typesetCached } from "./equations";

/** Typeset every equation in the skit folder's `skit.json`; returns TeX → typeset. */
export const prepEquations = (dir: string, skitJson?: unknown): { equations: Record<string, Typeset>; count: number; hits: number } => {
  const raw = skitJson ?? JSON.parse(fs.readFileSync(path.join(dir, "skit.json"), "utf8"));
  const texs = texOfSkit(raw as Parameters<typeof texOfSkit>[0]);
  const gen = path.join(dir, "generated");
  const out = path.join(gen, "equations.json");
  if (!texs.length) {
    fs.rmSync(out, { force: true });
    return { equations: {}, count: 0, hits: 0 };
  }
  const { equations, hits } = typesetCached(texs, path.join(gen, "cache"));
  const doc: EquationCache = { schemaVersion: 1, equations };
  fs.writeFileSync(out, JSON.stringify(doc));
  return { equations, count: texs.length, hits };
};

/** The typeset equations a previous prep wrote (empty when none). */
export const loadEquations = (dir: string): Record<string, Typeset> => {
  const file = path.join(dir, "generated", "equations.json");
  return fs.existsSync(file) ? EquationCacheSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))).equations : {};
};
