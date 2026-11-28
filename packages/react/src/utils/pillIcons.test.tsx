import { describe, expect, it } from "vitest";
import { pillIconAttrs } from "./pillIcons";

const Icon = () => <svg width="16" height="16" />;

describe("pillIconAttrs", () => {
  it("marks nothing for text-only content", () => {
    expect(pillIconAttrs("Shipped")).toEqual({});
    expect(pillIconAttrs(<span>Shipped</span>)).toEqual({
      "data-icon-start": undefined,
      "data-icon-end": undefined,
    });
  });

  it("finds a leading icon before bare text", () => {
    expect(pillIconAttrs([<svg key="i" />, " Shipped"])).toEqual({
      "data-icon-start": "true",
      "data-icon-end": undefined,
    });
  });

  it("finds a trailing icon after bare text", () => {
    expect(pillIconAttrs(["Shipped ", <Icon key="i" />])).toEqual({
      "data-icon-start": undefined,
      "data-icon-end": "true",
    });
  });

  it("marks both ends for an icon-only pill", () => {
    expect(pillIconAttrs(<img alt="" />)).toEqual({
      "data-icon-start": "true",
      "data-icon-end": "true",
    });
  });

  it("ignores whitespace-only text at the edges", () => {
    expect(pillIconAttrs(["  ", <svg key="i" />, "Label", "\n"])).toEqual({
      "data-icon-start": "true",
      "data-icon-end": undefined,
    });
  });

  it("treats a data-icon host element as an icon", () => {
    expect(pillIconAttrs([<span key="l">tag</span>, <button key="b" data-icon />])).toEqual({
      "data-icon-start": undefined,
      "data-icon-end": "true",
    });
  });
});
