/**
 * What a fresh clone needs, checked one line at a time (`pnpm bootstrap`, `pnpm diagnose`,
 * `pnpm demo`). Every check answers in one line and, when it fails, says what to do next.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findRhubarb } from "../../src/node";
import { ROOT, WS } from "./tools";

export type Check = { name: string; status: "ok" | "warn" | "fail"; detail: string; fix?: string };

/** The Rhubarb release `pnpm bootstrap` installs, pinned by SHA-256 (GitHub publishes no digests). */
export const RHUBARB = {
  version: "1.14.0",
  assets: {
    macOS: "f991deacac6c973a14a4431a16a58b842f436531e120cfaea142c87c0d3ab4c5",
    Linux: "a9a9074862cff47b2d59b8bf399a678a3b0b74f9452ad6ad94cb292913dd8667",
    Windows: "62fa416a8d5e382a3828ee4bef358ce520d0b4cabdeaea75a7ac266d098d1fe3",
  },
} as const;
export type RhubarbAsset = keyof typeof RHUBARB.assets;

/** Which Rhubarb build runs here, or why none does. Linux arm64 has no release build. */
export const rhubarbAsset = (platform = process.platform, arch = process.arch): RhubarbAsset | { none: string } => {
  if (platform === "darwin") return "macOS";
  if (platform === "win32") return "Windows";
  if (platform === "linux" && arch === "x64") return "Linux";
  return { none: `Rhubarb publishes no ${platform} ${arch} build` };
};

export const rhubarbUrl = (asset: RhubarbAsset) =>
  `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB.version}/Rhubarb-Lip-Sync-${RHUBARB.version}-${asset}.zip`;

const ESTIMATED = "Videos still render; mouths are estimated from the words.";

/** Rhubarb found and actually runs (the macOS build is x86_64, so Apple Silicon needs Rosetta). */
export const rhubarbStatus = (): { bin?: string; runs: boolean; check: Check } => {
  const bin = findRhubarb(WS);
  if (!bin) {
    const asset = rhubarbAsset();
    return {
      runs: false,
      check: { name: "Rhubarb lip-sync", status: "warn", detail: `not installed. ${ESTIMATED}`, fix: typeof asset === "string" ? "run pnpm bootstrap" : `${asset.none}; build it from source and set RHUBARB_PATH (docs/set-up.md)` },
    };
  }
  try {
    const v = execFileSync(bin, ["--version"], { encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "pipe"] });
    return { bin, runs: true, check: { name: "Rhubarb lip-sync", status: "ok", detail: `${v.match(/\d+\.\d+\.\d+/)?.[0] ?? "found"} (${path.relative(ROOT, bin) || bin})` } };
  } catch {
    const missing = !fs.existsSync(bin);
    const rosetta = process.platform === "darwin" && process.arch === "arm64";
    const fix = missing
      ? "RHUBARB_PATH points at no file: fix it or unset it"
      : rosetta
        ? "it is an Intel build: softwareupdate --install-rosetta --agree-to-license"
        : "delete tools/Rhubarb-Lip-Sync-* and run pnpm bootstrap";
    return { bin, runs: false, check: { name: "Rhubarb lip-sync", status: "warn", detail: `${missing ? "set" : "found"} at ${bin} but it does not run. ${ESTIMATED}`, fix } };
  }
};

/** Remotion's Chrome Headless Shell, downloaded by `remotion browser ensure`. */
export const chromeStatus = (): Check => {
  const dir = path.join(ROOT, "node_modules/.remotion/chrome-headless-shell");
  const ok = fs.existsSync(dir) && fs.readdirSync(dir).some((d) => d !== "VERSION");
  if (process.env.STICKSTAGE_BROWSER) return { name: "Headless Chrome", status: "ok", detail: `STICKSTAGE_BROWSER=${process.env.STICKSTAGE_BROWSER}` };
  return ok ? { name: "Headless Chrome", status: "ok", detail: "Remotion's Chrome Headless Shell is installed" } : { name: "Headless Chrome", status: "fail", detail: "not downloaded yet", fix: "run pnpm bootstrap" };
};

export const nodeStatus = (): Check => {
  const major = Number(process.versions.node.split(".")[0]);
  return major >= 22 ? { name: "Node", status: "ok", detail: process.versions.node } : { name: "Node", status: "fail", detail: `${process.versions.node} is too old`, fix: "install Node 22 or newer (https://nodejs.org)" };
};

export const depsStatus = (): Check =>
  fs.existsSync(path.join(ROOT, "node_modules/remotion/package.json"))
    ? { name: "Packages", status: "ok", detail: "installed" }
    : { name: "Packages", status: "fail", detail: "not installed", fix: "run pnpm install" };

/** Where the CLI keeps Kokoro's weights (downloaded once, ~90 MB). */
export const kokoroCacheDir = (env: NodeJS.ProcessEnv = process.env) => env.STICKSTAGE_KOKORO_CACHE ?? path.join(os.homedir(), ".cache", "stickstage", "kokoro");

const resolvable = (pkg: string): boolean => {
  try {
    import.meta.resolve(pkg);
    return true;
  } catch {
    return false;
  }
};

/** Which voice source `pnpm voice:tts` will use, and whether `pnpm try` can voice at all. */
export const ttsStatus = (env: NodeJS.ProcessEnv = process.env): Check => {
  if (env.LOCAL_TTS_BASE_URL) return { name: "Voices", status: "ok", detail: `speech endpoint ${env.LOCAL_TTS_BASE_URL}` };
  if (resolvable("kokoro-js")) {
    const cached = fs.existsSync(kokoroCacheDir(env)) && fs.readdirSync(kokoroCacheDir(env)).length > 0;
    return { name: "Voices", status: "ok", detail: `Kokoro, on this computer${cached ? "" : " (weights download once, ~90 MB, on first use)"}` };
  }
  if (process.platform === "darwin") return { name: "Voices", status: "warn", detail: "Kokoro is not installed; macOS say works (pnpm voice:say)", fix: "run pnpm install (kokoro-js is an optional dependency)" };
  return { name: "Voices", status: "warn", detail: "no voice source: Kokoro is not installed", fix: "pnpm install (kokoro-js is an optional dependency), or set LOCAL_TTS_BASE_URL" };
};

export const llmStatus = (env: NodeJS.ProcessEnv = process.env): Check =>
  env.LOCAL_LLM_BASE_URL && env.LOCAL_LLM_MODEL
    ? { name: "Writer model", status: "ok", detail: `${env.LOCAL_LLM_MODEL} at ${env.LOCAL_LLM_BASE_URL}` }
    : { name: "Writer model", status: "ok", detail: "none set: you write the lines (or paste a chatbot's reply). Optional: LOCAL_LLM_BASE_URL + LOCAL_LLM_MODEL" };

const MARK = { ok: "✓", warn: "!", fail: "✗" } as const;

export const printChecks = (checks: Check[], log: (s: string) => void = console.log) => {
  for (const c of checks) log(`${MARK[c.status]} ${c.name}: ${c.detail}${c.fix ? `\n    → ${c.fix}` : ""}`);
};

/** Appended to every "not found" error in the scripts. */
export const DOCTOR_HINT = "Run pnpm diagnose to see what is missing.";
