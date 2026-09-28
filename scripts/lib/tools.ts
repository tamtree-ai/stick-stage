/** This repo as a StickStage project: workspace, registries and the render backend. */
import path from "node:path";
import { library, reactions, safeArea, series, sets, sfxLibrary } from "../../src/data";
import { remotionBackend, workspace, type Project } from "../../src/node";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const WS = workspace(ROOT);
export const PROJECT: Project = { ws: WS, lib: library, sets, sfx: sfxLibrary, reactions, safeArea, series };
export const BACKEND = remotionBackend({ entryPoint: path.join(ROOT, "src/app/index.ts") });
