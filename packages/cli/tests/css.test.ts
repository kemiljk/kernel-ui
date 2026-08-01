import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { planCssImports, planJsImports } from "../dist/lib/css.js";

const fixtures = path.join(fileURLToPath(import.meta.url), "..", "fixtures");

describe("css planning", () => {
  it("adds imports to vite entry files", async () => {
    const plans = await planJsImports({
      cwd: path.join(fixtures, "vite-app"),
      framework: "vite",
      tokensOnly: false,
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]?.file).toBe("src/main.tsx");
    expect(plans[0]?.content).toContain('import "@kernelui-lib/styles";');
    expect(plans[0]?.content).toContain('import "@kernelui-lib/react/styles.css";');
  });

  it("updates next globals.css", async () => {
    const plans = await planCssImports({
      cwd: path.join(fixtures, "next-app"),
      framework: "next",
      tailwind: false,
      tokensOnly: false,
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]?.file).toBe("src/app/globals.css");
    expect(plans[0]?.content).toContain('@import "@kernelui-lib/styles";');
  });

  it("is idempotent after imports are applied", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "kernel-cli-"));
    const cssPath = path.join(tempDir, "src", "app");
    await import("node:fs/promises").then((fs) => fs.mkdir(cssPath, { recursive: true }));
    await writeFile(path.join(cssPath, "globals.css"), '@import "tailwindcss";\n');

    const first = await planCssImports({
      cwd: tempDir,
      framework: "next",
      tailwind: false,
      tokensOnly: false,
    });
    expect(first).toHaveLength(1);
    await writeFile(path.join(cssPath, "globals.css"), first[0]!.content);

    const second = await planCssImports({
      cwd: tempDir,
      framework: "next",
      tailwind: false,
      tokensOnly: false,
    });
    expect(second).toHaveLength(0);
  });
});
