import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ProjectPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export async function readPackageJson(cwd: string): Promise<ProjectPackageJson | null> {
  try {
    return JSON.parse(await readFile(path.join(cwd, "package.json"), "utf-8")) as ProjectPackageJson;
  } catch {
    return null;
  }
}

export function getDependencyVersion(
  pkg: ProjectPackageJson,
  name: string,
): string | undefined {
  return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? pkg.peerDependencies?.[name];
}

export function hasDependency(pkg: ProjectPackageJson, name: string): boolean {
  return Boolean(getDependencyVersion(pkg, name));
}

export function parseReactMajor(version: string | undefined): number | null {
  if (!version) return null;
  const cleaned = version.replace(/^[\^~>=<]*/, "");
  const major = Number.parseInt(cleaned.split(".")[0] ?? "", 10);
  return Number.isFinite(major) ? major : null;
}
