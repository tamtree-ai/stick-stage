/**
 * Where a project keeps its skits and tools (the node side's `AssetResolver`). Remotion serves
 * `public/`, so skit media paths handed to the renderer are relative to it.
 */
import path from "node:path";

export type Workspace = {
  root: string;
  /** Remotion's public dir (what `staticFile()` resolves against). */
  publicDir: string;
  /** Folder of one skit: `<publicDir>/skits/<id>`. */
  skitDir: (id: string) => string;
  /** Optional local tool installs (e.g. `tools/Rhubarb-Lip-Sync-*`). */
  toolsDir: string;
  /** Absolute path → path relative to `publicDir`, POSIX separators (for `staticFile`). */
  publicPath: (abs: string) => string;
};

export const workspace = (root: string, opts: { publicDir?: string; skitsDir?: string; toolsDir?: string } = {}): Workspace => {
  const publicDir = path.resolve(root, opts.publicDir ?? "public");
  const skits = path.resolve(publicDir, opts.skitsDir ?? "skits");
  return {
    root,
    publicDir,
    skitDir: (id) => path.join(skits, id),
    toolsDir: path.resolve(root, opts.toolsDir ?? "tools"),
    publicPath: (abs) => path.relative(publicDir, abs).split(path.sep).join("/"),
  };
};
