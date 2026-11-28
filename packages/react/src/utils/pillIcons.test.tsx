import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../components/Badge/Badge";
import { Suggestion, SuggestionItem } from "../components/Suggestion/Suggestion";
import { pillIconAttrs } from "./pillIcons";

const Icon = () => <svg width="16" height="16" />;
const Trans = ({ children }: { children: string }) => <>{children}</>;

describe("pillIconAttrs (render-time, certain icons only)", () => {
  it("marks nothing for text-only content", () => {
    expect(pillIconAttrs("Shipped")).toEqual({});
    expect(pillIconAttrs(<span>Shipped</span>)).toEqual({ "data-icon-start": undefined, "data-icon-end": undefined });
  });

  it("finds host svg/img icons at either end", () => {
    expect(pillIconAttrs([<svg key="i" />, " Shipped"])).toEqual({ "data-icon-start": "true", "data-icon-end": undefined });
    expect(pillIconAttrs(<img alt="" />)).toEqual({ "data-icon-start": "true", "data-icon-end": "true" });
  });

  it("ignores whitespace-only text at the edges", () => {
    expect(pillIconAttrs(["  ", <svg key="i" />, "Label", "\n"])).toEqual({ "data-icon-start": "true", "data-icon-end": undefined });
  });

  it("honours data-icon on any element", () => {
    expect(pillIconAttrs([<span key="l">tag</span>, <button key="b" data-icon />])).toEqual({
      "data-icon-start": undefined,
      "data-icon-end": "true",
    });
  });

  it("never guesses that a component is an icon", () => {
    expect(pillIconAttrs(<Trans>Save</Trans>)).toEqual({ "data-icon-start": undefined, "data-icon-end": undefined });
    expect(pillIconAttrs(<Icon />)).toEqual({ "data-icon-start": undefined, "data-icon-end": undefined });
  });
});

describe("pill icon detection after render (the DOM decides)", () => {
  it("detects an icon component that renders an svg", () => {
    const { container } = render(
      <Badge>
        <Icon /> Shipped
      </Badge>,
    );
    const badge = container.firstElementChild!;
    expect(badge).toHaveAttribute("data-icon-start", "true");
    expect(badge).not.toHaveAttribute("data-icon-end");
  });

  it("leaves a component that renders text alone", () => {
    const { container } = render(
      <Badge>
        <Trans>Shipped</Trans>
      </Badge>,
    );
    const badge = container.firstElementChild!;
    expect(badge).not.toHaveAttribute("data-icon-start");
    expect(badge).not.toHaveAttribute("data-icon-end");
  });

  it("updates when content changes from icon-only to text", () => {
    const { container, rerender } = render(
      <Badge>
        <Icon />
      </Badge>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-icon-end", "true");
    rerender(<Badge>Done</Badge>);
    expect(container.firstElementChild).not.toHaveAttribute("data-icon-end");
  });

  it("works for Suggestion items and keeps a forwarded ref", () => {
    let node: HTMLButtonElement | null = null;
    const { getByRole } = render(
      <Suggestion>
        <SuggestionItem ref={(el) => { node = el; }}>
          Continue <Icon />
        </SuggestionItem>
      </Suggestion>,
    );
    expect(getByRole("button")).toHaveAttribute("data-icon-end", "true");
    expect(node).toBe(getByRole("button"));
  });
});
