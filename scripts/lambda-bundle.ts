/**
 * The Remotion bundle for the Lambda image: tsx scripts/lambda-bundle.ts [outDir] (default build/bundle).
 * Dockerfile.lambda runs it so a cold start skips webpack; lambda/handler.ts reads it from
 * STICKSTAGE_BUNDLE_DIR. public/ is symlinked, so job folders written at run time are still served.
 */
import { bundle } from "@remotion/bundler";
import path from "node:path";
import { ROOT } from "./lib/tools";

const outDir = path.resolve(process.argv[2] ?? path.join(ROOT, "build/bundle"));
const started = Date.now();
await bundle({ entryPoint: path.join(ROOT, "src/app/index.ts"), outDir, symlinkPublicDir: true, enableCaching: false });
console.log(`bundle → ${outDir} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
