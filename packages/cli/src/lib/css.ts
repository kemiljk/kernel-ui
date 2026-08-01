import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Framework } from "./types.js";

export interface CssEditPlan {
  file: string;
  content: string;
  action: "create" | "update";
}

const STYLES_IMPORT = '@import "@kernelui-lib/styles";';
const TOKENS_IMPORT = '@import "@kernelui-lib/styles/tokens.css";';
const TAILWIND_BRIDGE = '@import "@kernelui-lib/styles/tailwind.css";';
const REACT_STYLES_IMPORT = '@import "@kernelui-lib/react/styles.css";';

export async function findGlobalCssFiles(cwd: string, framework: Framework): Promise<string[]> {
  const candidates: string[] = [];

  if (framework === "next") {
    candidates.push(
      "src/app/globals.css",
      "app/globals.css",
      "src/styles/globals.css",
      "styles/globals.css",
    );
  } else {
    candidates.push("src/index.css", "src/main.css", "src/app.css", "src/styles.css");
  }

  const found: string[] = [];
  for (const candidate of candidates) {
    try {
      await access(path.join(cwd, candidate));
      found.push(candidate);
    } catch {
      // continue
    }
  }
  return found;
}

export async function findJsEntryFiles(cwd: string, framework: Framework): Promise<string[]> {
  const candidates =
    framework === "next"
      ? ["src/app/layout.tsx", "app/layout.tsx"]
      : ["src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js", "src/index.tsx"];

  const found: string[] = [];
  for (const candidate of candidates) {
    try {
      await access(path.join(cwd, candidate));
      found.push(candidate);
    } catch {
      // continue
    }
  }
  return found;
}

function ensureLines(content: string, lines: string[]): { content: string; changed: boolean } {
  let next = content;
  let changed = false;
  for (const line of lines) {
    if (!next.includes(line)) {
      next = `${next.trimEnd()}\n${line}\n`;
      changed = true;
    }
  }
  return { content: next, changed };
}

export async function planCssImports(options: {
  cwd: string;
  framework: Framework;
  tailwind: boolean;
  tokensOnly: boolean;
}): Promise<CssEditPlan[]> {
  const plans: CssEditPlan[] = [];
  const cssFiles = await findGlobalCssFiles(options.cwd, options.framework);
  const styleLines = options.tokensOnly
    ? [TOKENS_IMPORT]
    : options.tailwind
      ? [TOKENS_IMPORT, TAILWIND_BRIDGE]
      : [STYLES_IMPORT];

  if (!options.tokensOnly) {
    styleLines.push(REACT_STYLES_IMPORT);
  }

  if (cssFiles.length > 0) {
    for (const file of cssFiles) {
      const absolute = path.join(options.cwd, file);
      const original = await readFile(absolute, "utf-8");
      const { content, changed } = ensureLines(original, styleLines);
      if (changed) {
        plans.push({ file, content, action: "update" });
      }
    }
    return plans;
  }

  const defaultFile = options.framework === "next" ? "src/app/globals.css" : "src/index.css";
  plans.push({
    file: defaultFile,
    content: `${styleLines.join("\n")}\n`,
    action: "create",
  });
  return plans;
}

export async function planJsImports(options: {
  cwd: string;
  framework: Framework;
  tokensOnly: boolean;
}): Promise<CssEditPlan[]> {
  if (options.framework === "next") return [];

  const plans: CssEditPlan[] = [];
  const entries = await findJsEntryFiles(options.cwd, options.framework);
  const imports = options.tokensOnly
    ? ['import "@kernelui-lib/styles";']
    : ['import "@kernelui-lib/styles";', 'import "@kernelui-lib/react/styles.css";'];

  for (const file of entries) {
    const absolute = path.join(options.cwd, file);
    const original = await readFile(absolute, "utf-8");
    const { content, changed } = ensureLines(original, imports);
    if (changed) {
      plans.push({ file, content, action: "update" });
    }
  }

  if (entries.length === 0 && options.framework === "vite") {
    plans.push({
      file: "src/main.tsx",
      content: `${imports.join("\n")}\n`,
      action: "create",
    });
  }

  return plans;
}

export async function planAccentTheme(cwd: string, accent: string): Promise<CssEditPlan | null> {
  const cssFiles = await findGlobalCssFiles(cwd, "vite");
  const nextFiles = cssFiles.length > 0 ? cssFiles : await findGlobalCssFiles(cwd, "next");
  const target = nextFiles[0] ?? "src/index.css";
  const importLine = `@import "@kernelui-lib/styles/themes/${accent}.css";`;
  const attrLine = `/* Set data-kernel-accent="${accent}" on <html> to activate the named accent theme */`;

  const absolute = path.join(cwd, target);
  let original = "";
  try {
    original = await readFile(absolute, "utf-8");
  } catch {
    original = "";
  }

  if (original.includes(importLine)) return null;

  const content = `${original.trimEnd()}\n${importLine}\n${attrLine}\n`;
  return { file: target, content, action: original ? "update" : "create" };
}

export async function applyPlans(cwd: string, plans: CssEditPlan[], dryRun: boolean) {
  for (const plan of plans) {
    const absolute = path.join(cwd, plan.file);
    if (dryRun) continue;
    await writeFile(absolute, plan.content, "utf-8");
  }
}

export function projectUsesKernelStyles(content: string): boolean {
  return (
    content.includes("@kernelui-lib/styles") ||
    content.includes('import "@kernelui-lib/styles"') ||
    content.includes("from \"@kernelui-lib/styles\"")
  );
}

export function projectUsesReactStyles(content: string): boolean {
  return (
    content.includes("@kernelui-lib/react/styles.css") ||
    content.includes('import "@kernelui-lib/react/styles.css"')
  );
}
