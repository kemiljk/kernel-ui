#!/usr/bin/env node
/**
 * Installs and builds examples/vite-react-smoke against published npm
 * packages. Run after a release to verify consumers can install Kernel.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const example = join(root, "examples/vite-react-smoke");
const VERSION = process.env.KERNELUI_SMOKE_VERSION ?? "1.0.0";

const TARBALLS = [
  `https://registry.npmjs.org/@kernelui-lib/styles/-/styles-${VERSION}.tgz`,
  `https://registry.npmjs.org/@kernelui-lib/react/-/react-${VERSION}.tgz`,
];

function run(cmd, args, cwd) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function tryRun(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false });
  return result.status === 0;
}

if (!existsSync(example)) {
  console.error("Missing examples/vite-react-smoke");
  process.exit(1);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const installed = tryRun(
  npm,
  ["install", `@kernelui-lib/react@${VERSION}`, `@kernelui-lib/styles@${VERSION}`],
  example,
);

if (!installed) {
  console.warn(
    "\nnpm registry metadata not ready yet — installing release tarballs directly.\n",
  );
  run(npm, ["install", ...TARBALLS], example);
}

run(npm, ["run", "build"], example);

console.log("\nSmoke test passed: consumer build succeeded.");
