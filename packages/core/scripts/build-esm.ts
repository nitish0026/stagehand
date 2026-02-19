/**
 * Build canonical dist/esm output for the core package (including test JS).
 *
 * Prereqs: pnpm install; run gen-version + build-dom-scripts first (turbo handles).
 * Args: none.
 * Env: none.
 * Example: pnpm run build:esm
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findRepoRoot } from "./test-utils.js";

const repoRoot = findRepoRoot(process.cwd());
console.log("repoRoot=", repoRoot);

const run = (args: string[]) => {
  const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  console.log("running:", cmd, args.join(" "), "cwd=", repoRoot);
  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: repoRoot, shell: true });
  console.log("-> spawn result", { status: result.status, error: result.error });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const coreRoot = path.join(repoRoot, "packages", "core");
const coreDist = path.join(coreRoot, "dist", "esm");
fs.rmSync(coreDist, { recursive: true, force: true });

// Core ESM emit includes generated lib/version.ts from gen-version (run in core build).
run(["exec", "tsc", "-p", "packages/core/tsconfig.json"]);
// Tests run via node/playwright need JS test files; esbuild emits ESM test JS into dist/esm.
// On Windows the shell doesn't expand globs, so expand them manually and pass explicit paths.
import glob from "glob";
const testFiles = [
  ...glob.sync("packages/core/tests/**/*.ts", {
    cwd: repoRoot,
    absolute: true,
    nodir: true,
  }),
  ...glob.sync("packages/core/lib/v3/tests/**/*.ts", {
    cwd: repoRoot,
    absolute: true,
    nodir: true,
  }),
];
if (testFiles.length === 0) {
  console.warn("warning: no test files found for esbuild");
} else {
  console.log(`esbuild will process ${testFiles.length} test files`);
}
run([
  "exec",
  "esbuild",
  ...testFiles,
  "--outdir=packages/core/dist/esm",
  "--outbase=packages/core",
  "--format=esm",
  "--platform=node",
  "--sourcemap",
  "--log-level=warning",
]);

fs.mkdirSync(coreDist, { recursive: true });
fs.writeFileSync(
  path.join(coreDist, "package.json"),
  '{\n  "type": "module"\n}\n',
);
fs.writeFileSync(
  path.join(coreDist, "index.js"),
  [
    'import * as Stagehand from "./lib/v3/index.js";',
    'export * from "./lib/v3/index.js";',
    "export default Stagehand;",
    "",
  ].join("\n"),
);
fs.writeFileSync(
  path.join(coreDist, "index.d.ts"),
  [
    'import * as Stagehand from "./lib/v3/index";',
    'export * from "./lib/v3/index";',
    "export default Stagehand;",
    "",
  ].join("\n"),
);

const coreBuildSrc = path.join(coreRoot, "lib", "v3", "dom", "build");
const coreBuildDest = path.join(coreDist, "lib", "v3", "dom", "build");
fs.mkdirSync(coreBuildDest, { recursive: true });
// DOM script bundles are generated artifacts (not TS emit); copy into dist/esm for runtime.
if (fs.existsSync(coreBuildSrc)) {
  for (const file of fs.readdirSync(coreBuildSrc)) {
    if (file.endsWith(".js")) {
      fs.copyFileSync(
        path.join(coreBuildSrc, file),
        path.join(coreBuildDest, file),
      );
    }
  }
}

// Note: evals + server test outputs are built by their respective packages.
