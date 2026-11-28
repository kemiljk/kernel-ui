// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPONENT_SPECS, KERNEL_COMPONENTS } from "../src/index.js";

const registry = JSON.parse(readFileSync(new URL("../../../apps/docs/public/registry.json", import.meta.url), "utf8")) as {
  components: { name: string; status: string; reactExports: string[]; elementTag: string }[];
};

describe("generated registry", () => {
  it("matches Kernel's registry (run `bun run generate` in packages/testing if this fails)", () => {
    const available = registry.components.filter((c) => c.status === "available");
    expect(KERNEL_COMPONENTS.map((c) => c.export)).toEqual(available.map((c) => c.reactExports[0]));
    expect(KERNEL_COMPONENTS.map((c) => c.tag)).toEqual(available.map((c) => c.elementTag));
  });

  it("only maps components that exist", () => {
    const folders = new Set(KERNEL_COMPONENTS.map((c) => c.folder));
    expect(Object.keys(COMPONENT_SPECS).filter((name) => !folders.has(name))).toEqual([]);
  });
});
