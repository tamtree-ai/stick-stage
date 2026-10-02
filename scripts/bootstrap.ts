/**
 * First-run setup: pnpm bootstrap
 *
 * Installs what `pnpm demo` needs beyond `pnpm install`, and is safe to run again (it skips
 * what is already there, and needs no network once everything is):
 *   - Rhubarb Lip Sync into tools/, from the pinned GitHub release, checked against its SHA-256,
 *     with the macOS quarantine flag cleared. Linux arm64 has no release build: mouths are
 *     estimated there unless RHUBARB_PATH points at a source build.
 *   - Remotion's Chrome Headless Shell (`remotion browser ensure`).
 * Then it prints one line per check. (Not `pnpm setup`: that is pnpm's own command.)
 */
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromeStatus, depsStatus, llmStatus, nodeStatus, printChecks, RHUBARB, rhubarbAsset, rhubarbStatus, rhubarbUrl, ttsStatus, type Check } from "./lib/doctor";
import { ROOT, WS } from "./lib/tools";

const download = async (url: string, file: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status}) for ${url}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const hash = crypto.createHash("sha256");
  const out = fs.createWriteStream(file);
  let got = 0;
  let shown = -1;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    hash.update(chunk);
    out.write(chunk);
    got += chunk.length;
    const pct = total ? Math.floor((got / total) * 10) * 10 : -1;
    if (pct !== shown && pct >= 0) process.stdout.write(`${(shown = pct)}% `);
  }
  await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
  if (total) process.stdout.write("\n");
  return hash.digest("hex");
};

const unzip = (zip: string, dest: string) => {
  const hasUnzip = spawnSync("unzip", ["-v"], { stdio: "ignore" }).status === 0;
  // bsdtar (macOS, Windows 10+) reads zips; GNU tar does not, so unzip goes first.
  if (hasUnzip) execFileSync("unzip", ["-q", "-o", zip, "-d", dest]);
  else execFileSync("tar", ["-xf", zip, "-C", dest]);
};

const installRhubarb = async (): Promise<void> => {
  const asset = rhubarbAsset();
  if (typeof asset !== "string") return;
  const dir = path.join(WS.toolsDir, `Rhubarb-Lip-Sync-${RHUBARB.version}-${asset}`);
  if (fs.existsSync(dir)) return;
  fs.mkdirSync(WS.toolsDir, { recursive: true });
  const zip = path.join(WS.toolsDir, `rhubarb-${RHUBARB.version}.zip.part`);
  console.log(`Downloading Rhubarb ${RHUBARB.version} (${asset}, ~85 MB)…`);
  const sha = await download(rhubarbUrl(asset), zip);
  if (sha !== RHUBARB.assets[asset]) {
    fs.rmSync(zip, { force: true });
    throw new Error(`Rhubarb download did not match its pinned SHA-256 (got ${sha}). Nothing was installed; try again, or install it by hand (docs/set-up.md).`);
  }
  unzip(zip, WS.toolsDir);
  fs.rmSync(zip, { force: true });
  const bin = path.join(dir, process.platform === "win32" ? "rhubarb.exe" : "rhubarb");
  if (process.platform !== "win32") fs.chmodSync(bin, 0o755);
  // Gatekeeper blocks a downloaded binary until the quarantine flag is cleared.
  if (process.platform === "darwin") spawnSync("xattr", ["-dr", "com.apple.quarantine", dir], { stdio: "ignore" });
};

const ensureChrome = () => {
  if (chromeStatus().status === "ok") return;
  console.log("Downloading Chrome Headless Shell for rendering…");
  const r = spawnSync(path.join(ROOT, "node_modules/.bin/remotion"), ["browser", "ensure"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" });
  if (r.status !== 0) console.error("remotion browser ensure failed; the first render will try again.");
};

const base = [nodeStatus(), depsStatus()];
if (base.some((c) => c.status === "fail")) {
  printChecks(base);
  process.exit(1);
}
try {
  await installRhubarb();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
}
ensureChrome();

const checks: Check[] = [...base, rhubarbStatus().check, chromeStatus(), ttsStatus(), llmStatus()];
printChecks(checks);
if (checks.some((c) => c.status === "fail")) process.exit(1);
console.log("\nReady. Next: pnpm demo");
