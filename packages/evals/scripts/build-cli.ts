/**
 * Build the evals CLI (packages/evals/dist/cli/cli.js + config), including a node shebang.
 *
 * Prereqs: pnpm install.
 * Args: none.
 * Env: none.
 * Example: pnpm run build:cli
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findRepoRoot } from "../../core/scripts/test-utils.js";

const repoRoot = findRepoRoot(process.cwd());
const evalsRoot = path.join(repoRoot, "packages", "evals");
const distDir = path.join(evalsRoot, "dist", "cli");
const cliOutfile = path.join(distDir, "cli.js");

const run = (args: string[]) => {
  const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  console.log("running:", cmd, args.join(" "), "cwd=", repoRoot);
  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: repoRoot, shell: true });
  console.log("-> spawn result", { status: result.status, error: result.error });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

fs.mkdirSync(distDir, { recursive: true });

run([
  "exec",
  "esbuild",
  "packages/evals/cli.ts",
  "--bundle",
  "--platform=node",
  "--format=esm",
  `--outfile=${cliOutfile}`,
  "--sourcemap",
  "--packages=external",
  // wrap the shebang in quotes so the shell doesn't split on the space
  "--banner:js=\"#!/usr/bin/env node\"",
  "--log-level=warning",
]);

fs.copyFileSync(
  path.join(evalsRoot, "evals.config.json"),
  path.join(distDir, "evals.config.json"),
);
fs.writeFileSync(
  path.join(distDir, "package.json"),
  '{\n  "type": "module"\n}\n',
);
fs.chmodSync(cliOutfile, 0o755);
