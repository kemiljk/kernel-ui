import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { Framework, PackageManager } from "./types.js";

const LOCKFILES: Record<PackageManager, string> = {
  bun: "bun.lock",
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
};

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  for (const [pm, file] of Object.entries(LOCKFILES) as [PackageManager, string][]) {
    try {
      await access(path.join(cwd, file));
      return pm;
    } catch {
      // continue
    }
  }
  return "npm";
}

export async function detectFramework(cwd: string): Promise<Framework> {
  try {
    const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "next";
    if (deps.vite) return "vite";
  } catch {
    // fall through
  }

  try {
    await access(path.join(cwd, "next.config.ts"));
    return "next";
  } catch {
    // continue
  }
  try {
    await access(path.join(cwd, "next.config.js"));
    return "next";
  } catch {
    // continue
  }
  try {
    await access(path.join(cwd, "vite.config.ts"));
    return "vite";
  } catch {
    // continue
  }
  try {
    await access(path.join(cwd, "vite.config.js"));
    return "vite";
  } catch {
    // continue
  }

  return "unknown";
}

export function installCommand(pm: PackageManager, packages: string[]): string {
  switch (pm) {
    case "bun":
      return `bun add ${packages.join(" ")}`;
    case "yarn":
      return `yarn add ${packages.join(" ")}`;
    case "pnpm":
      return `pnpm add ${packages.join(" ")}`;
    default:
      return `npm install ${packages.join(" ")}`;
  }
}

export async function hasShadcn(cwd: string): Promise<boolean> {
  try {
    await access(path.join(cwd, "components.json"));
    return true;
  } catch {
    return false;
  }
}

export async function listRadixPackages(cwd: string): Promise<string[]> {
  try {
    const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).filter((name) => name.startsWith("@radix-ui/"));
  } catch {
    return [];
  }
}
