import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectFramework, detectPackageManager, hasShadcn } from "../dist/lib/detect.js";

const fixtures = path.join(fileURLToPath(import.meta.url), "..", "fixtures");

describe("detect", () => {
  it("detects vite projects", async () => {
    await expect(detectFramework(path.join(fixtures, "vite-app"))).resolves.toBe("vite");
  });

  it("detects next projects", async () => {
    await expect(detectFramework(path.join(fixtures, "next-app"))).resolves.toBe("next");
  });

  it("detects shadcn components.json", async () => {
    await expect(hasShadcn(path.join(fixtures, "shadcn-app"))).resolves.toBe(true);
  });

  it("falls back to npm without a lockfile", async () => {
    await expect(detectPackageManager(path.join(fixtures, "vite-app"))).resolves.toBe("npm");
  });
});
