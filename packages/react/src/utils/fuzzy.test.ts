import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore, fuzzySegments } from "./fuzzy";

const rank = (query: string, texts: string[]) => fuzzyFilter(texts, query, (text) => text).map((r) => r.item);

describe("fuzzyScore", () => {
  it("matches a subsequence and rejects out-of-order characters", () => {
    expect(fuzzyScore("nwfl", "New file")).not.toBeNull();
    expect(fuzzyScore("lfwn", "New file")).toBeNull();
    expect(fuzzyScore("xyz", "New file")).toBeNull();
  });

  it("is case- and diacritic-insensitive, and ignores query whitespace", () => {
    expect(fuzzyScore("CREME", "Crème brûlée")).not.toBeNull();
    expect(fuzzyScore("brulee", "Crème brûlée")).not.toBeNull();
    expect(fuzzyScore("new  file", "New file")).not.toBeNull();
  });

  it("an empty query matches with score 0 and no ranges", () => {
    expect(fuzzyScore("  ", "Anything")).toEqual({ score: 0, ranges: [] });
  });

  it("returns ranges in original-string offsets, merged into runs", () => {
    expect(fuzzyScore("fil", "New file")?.ranges).toEqual([[4, 7]]);
    // Diacritics fold without shifting offsets.
    expect(fuzzyScore("bru", "Crème brûlée")?.ranges).toEqual([[6, 9]]);
  });

  it("prefers word starts over an earlier mid-word match", () => {
    // Greedy would take the "b" in "abc"; the best alignment is "bar".
    expect(fuzzyScore("fb", "foo abc bar")?.ranges).toEqual([
      [0, 1],
      [8, 9],
    ]);
  });

  it("treats camelCase humps as word starts", () => {
    const camel = fuzzyScore("gs", "getState")!;
    const flat = fuzzyScore("gs", "gusts")!;
    expect(camel.score).toBeGreaterThan(flat.score);
  });
});

describe("fuzzyFilter ranking", () => {
  it("ranks prefix > word start > mid-word run > scattered", () => {
    expect(rank("app", ["Snapper", "My apples", "Apple", "Map of pins"])[0]).toBe("Apple");
    expect(rank("app", ["Snapper", "My apples", "Apple"])).toEqual(["Apple", "My apples", "Snapper"]);
    expect(rank("ape", ["Grape juice", "a pair of ears"])).toEqual(["a pair of ears", "Grape juice"]);
  });

  it("puts an exact match first", () => {
    expect(rank("save", ["Save as…", "Save", "Autosave"])).toEqual(["Save", "Save as…", "Autosave"]);
  });

  it("ranks initials of words above a scattered match", () => {
    expect(rank("ts", ["Toggle sidebar", "Tests", "Settings"])[0]).toBe("Toggle sidebar");
  });

  it("keeps original order for an empty query and for equal scores", () => {
    expect(rank("", ["b", "a", "c"])).toEqual(["b", "a", "c"]);
    expect(rank("x", ["x1", "x2"])).toEqual(["x1", "x2"]);
  });

  it("uses the best of several texts and reports which matched", () => {
    const [result] = fuzzyFilter([{ label: "Preferences", keywords: ["settings"] }], "sett", (item) => [
      item.label,
      ...item.keywords,
    ]);
    expect(result?.field).toBe(1);
  });
});

describe("fuzzySegments", () => {
  it("splits text into plain and matched segments", () => {
    expect(fuzzySegments("New file", [[0, 1], [4, 7]])).toEqual([
      { text: "N", match: true },
      { text: "ew ", match: false },
      { text: "fil", match: true },
      { text: "e", match: false },
    ]);
  });
});
