import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  detectFramework,
  hasShadcn,
  listRadixPackages,
} from "../lib/detect.js";
import {
  findGlobalCssFiles,
  findJsEntryFiles,
  projectUsesKernelStyles,
  projectUsesReactStyles,
} from "../lib/css.js";
import { info, log, success, warn } from "../lib/output.js";
import {
  hasDependency,
  parseReactMajor,
  readPackageJson,
} from "../lib/project.js";
import type { DoctorIssue, GlobalOptions } from "../lib/types.js";

async function readProjectSources(cwd: string, framework: Awaited<ReturnType<typeof detectFramework>>) {
  const cssFiles = await findGlobalCssFiles(cwd, framework);
  const jsFiles = await findJsEntryFiles(cwd, framework);
  const contents: string[] = [];

  for (const file of [...cssFiles, ...jsFiles]) {
    try {
      contents.push(await readFile(path.join(cwd, file), "utf-8"));
    } catch {
      // ignore
    }
  }

  return contents.join("\n");
}

export async function runDoctor(global: GlobalOptions, _rest: string[]) {
  const pkg = await readPackageJson(global.cwd);
  if (!pkg) {
    throw new Error("No package.json found in the target directory.");
  }

  const framework = await detectFramework(global.cwd);
  const issues: DoctorIssue[] = [];
  const source = await readProjectSources(global.cwd, framework);

  const reactVersion = parseReactMajor(
    pkg.dependencies?.react ?? pkg.devDependencies?.react ?? pkg.peerDependencies?.react,
  );
  if (reactVersion !== null && reactVersion < 18) {
    issues.push({
      level: "error",
      message: `React ${reactVersion} detected — Kernel requires React 18 or newer.`,
    });
  }

  if (!hasDependency(pkg, "@kernelui-lib/styles")) {
    issues.push({
      level: "error",
      message: "@kernelui-lib/styles is not installed.",
      hint: "Run `kernel init` or `npm install @kernelui-lib/styles`.",
    });
  }

  const usesReact = hasDependency(pkg, "@kernelui-lib/react");
  if (usesReact && !projectUsesKernelStyles(source)) {
    issues.push({
      level: "error",
      message: "Kernel tokens stylesheet is not imported in your app entry or global CSS.",
      hint: 'Add `import "@kernelui-lib/styles";` or `@import "@kernelui-lib/styles";`.',
    });
  }

  if (usesReact && !projectUsesReactStyles(source)) {
    issues.push({
      level: "warn",
      message: "@kernelui-lib/react/styles.css is not imported — components will be unstyled but functional.",
      hint: 'Add `import "@kernelui-lib/react/styles.css";` or `@import "@kernelui-lib/react/styles.css";`.',
    });
  }

  if (await hasShadcn(global.cwd)) {
    issues.push({
      level: "info",
      message: "components.json detected — you may be migrating from shadcn/ui.",
      hint: "Read https://www.kernelui.com/migration/ for component mapping and structural differences.",
    });
  }

  const radixPackages = await listRadixPackages(global.cwd);
  if (radixPackages.length > 0) {
    issues.push({
      level: "info",
      message: `Found ${radixPackages.length} @radix-ui package(s) in dependencies.`,
      hint: "Kernel can replace many Radix primitives, but Dialog/Select/Accordion APIs differ — see the migration guide.",
    });
  }

  if (source.includes("@tailwindcss") && !source.includes("@kernelui-lib/styles/tailwind.css")) {
    issues.push({
      level: "warn",
      message: "Tailwind detected without the Kernel Tailwind bridge.",
      hint: 'Add `@import "@kernelui-lib/styles/tailwind.css";` after tokens.css.',
    });
  }

  log(`Kernel doctor — ${path.relative(process.cwd(), global.cwd) || "."}`);
  log("");

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warn");
  const infos = issues.filter((issue) => issue.level === "info");

  if (issues.length === 0) {
    success("Everything looks good.");
    return;
  }

  for (const issue of errors) {
    console.error(`✗ ${issue.message}`);
    if (issue.hint) info(issue.hint);
  }
  for (const issue of warnings) {
    warn(issue.message);
    if (issue.hint) info(issue.hint);
  }
  for (const issue of infos) {
    info(issue.message);
    if (issue.hint) info(issue.hint);
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}
