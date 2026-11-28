import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, safeHref } from "./markdown";

const blocks = (source: string, streaming = false) => parseMarkdown(source, { streaming }).map((b) => b.block);

describe("parseMarkdown", () => {
  it("parses the CommonMark subset", () => {
    const result = blocks("# Title\n\nPara with **bold**, _em_, `code` and ~~gone~~.\n\n---\n\n> quoted");
    expect(result.map((b) => b.type)).toEqual(["heading", "paragraph", "rule", "blockquote"]);
    expect(result[1]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", text: "Para with " },
        { type: "strong", children: [{ type: "text", text: "bold" }] },
        { type: "text", text: ", " },
        { type: "em", children: [{ type: "text", text: "em" }] },
        { type: "text", text: ", " },
        { type: "code", text: "code" },
        { type: "text", text: " and " },
        { type: "del", children: [{ type: "text", text: "gone" }] },
        { type: "text", text: "." },
      ],
    });
  });

  it("nests lists, including a bullet list under a numbered item", () => {
    const [list] = blocks("1. one\n   - a\n   - b\n2. two");
    expect(list).toMatchObject({ type: "list", ordered: true, tight: true });
    if (list?.type !== "list") throw new Error("not a list");
    expect(list.items).toHaveLength(2);
    expect(list.items[0]!.blocks[1]).toMatchObject({ type: "list", ordered: false });
  });

  it("parses GFM tables with alignment", () => {
    const [table] = blocks("| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |");
    expect(table).toMatchObject({ type: "table", align: ["left", "center", "right"] });
  });

  it("keeps each block's own source slice, so unchanged blocks can be skipped", () => {
    const before = parseMarkdown("Intro\n\n- a\n- b", { streaming: true });
    const after = parseMarkdown("Intro\n\n- a\n- b\n- c", { streaming: true });
    expect(after[0]!.raw).toBe(before[0]!.raw);
    expect(after[1]!.raw).not.toBe(before[1]!.raw);
  });

  it("never interprets HTML", () => {
    expect(blocks("<img src=x onerror=alert(1)>")).toEqual([
      { type: "paragraph", children: [{ type: "text", text: "<img src=x onerror=alert(1)>" }] },
    ]);
  });

  it("turns images into links that are never loaded", () => {
    expect(parseInline("![chart](https://example.com/c.png)")).toEqual([
      { type: "link", href: "https://example.com/c.png", title: undefined, children: [{ type: "text", text: "chart" }] },
    ]);
  });
});

describe("streaming", () => {
  it("renders an unterminated fence as an open code block", () => {
    expect(blocks("```ts\nconst a = 1\n", true)).toEqual([
      { type: "code", language: "ts", code: "const a = 1", open: true },
    ]);
    expect(blocks("```ts\nconst a = 1\n``", true)[0]).toMatchObject({ code: "const a = 1", open: true });
  });

  it("closes unclosed emphasis optimistically and hides dangling markers", () => {
    expect(parseInline("so **bold", true)).toEqual([
      { type: "text", text: "so " },
      { type: "strong", children: [{ type: "text", text: "bold" }] },
    ]);
    expect(parseInline("so **", true)).toEqual([{ type: "text", text: "so " }]);
    // Not at a word start: `2*3` stays literal rather than flashing italics.
    expect(parseInline("2*3 is", true)).toEqual([{ type: "text", text: "2*3 is" }]);
    // Finished text keeps CommonMark's literal reading.
    expect(parseInline("so **bold", false)).toEqual([{ type: "text", text: "so **bold" }]);
  });

  it("shows a half-written link's text without its destination", () => {
    expect(parseInline("see [the docs](https://exa", true)).toEqual([
      { type: "text", text: "see " },
      { type: "link", href: null, children: [{ type: "text", text: "the docs" }] },
    ]);
    expect(parseInline("see [the do", true)).toEqual([
      { type: "text", text: "see " },
      { type: "link", href: null, children: [{ type: "text", text: "the do" }] },
    ]);
  });

  it("renders a table as soon as its header arrives, and pads a half row", () => {
    expect(blocks("| a | b |", true)[0]).toMatchObject({ type: "table", rows: [] });
    const [table] = blocks("| a | b |\n|---|---|\n| 1 | 2 |\n| 3 |", true);
    if (table?.type !== "table") throw new Error("not a table");
    expect(table.rows[1]).toEqual([[{ type: "text", text: "3" }], []]);
  });

  it("holds back a last line that is only the start of a marker", () => {
    expect(blocks("Para\n-", true)).toHaveLength(1);
    expect(blocks("Para\n\n#", true)).toHaveLength(1);
  });
});

describe("safeHref", () => {
  it("allows http, https, mailto and relative destinations", () => {
    for (const href of ["https://a.com", "http://a.com", "mailto:a@b.c", "/docs", "#top", "./x", "//cdn.a.com/x"]) {
      expect(safeHref(href)).toBe(href);
    }
  });

  it("refuses script-capable and data schemes, however they're disguised", () => {
    for (const href of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", " java\tscript:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd"]) {
      expect(safeHref(href)).toBeNull();
    }
  });
});
