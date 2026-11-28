// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { checkPage, checkPattern } from "../src/index.js";
import * as f from "./fixtures.js";

describe("happy-dom", () => {
  it("detects the environment", async () => {
    const result = await checkPattern(f.goodTabs(), "tabs");
    expect(result.environment).toBe("happy-dom");
  });

  it("runs the keyboard checks", async () => {
    const result = await checkPattern(f.goodTabs(), "tabs");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["tabs/arrow-next", "tabs/home-end"]));
  });

  it("still catches failures", async () => {
    const result = await checkPattern(f.badSwitch(), "switch");
    expect(result.passed).toBe(false);
    const combo = await checkPattern(f.goodCombobox(), "combobox");
    expect(combo.issues).toEqual([]);
    const page = await checkPage(f.mount(`<input id="a"><input id="a">`));
    expect(page.issues.map((i) => i.rule)).toContain("common/unique-ids");
  });
});
