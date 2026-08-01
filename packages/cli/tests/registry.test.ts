import { describe, expect, it } from "vitest";
import { findComponent } from "../dist/lib/registry.js";

describe("registry lookup", () => {
  it("finds by slug", () => {
    expect(findComponent("text-field")?.name).toBe("Text Field");
  });

  it("finds by shadcn alias", () => {
    expect(findComponent("input")?.reactExports).toContain("TextField");
  });

  it("finds by react export name", () => {
    expect(findComponent("Dialog")?.slug).toBe("dialog");
  });
});
