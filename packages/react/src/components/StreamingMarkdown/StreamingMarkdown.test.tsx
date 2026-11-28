import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreamingMarkdown } from "./StreamingMarkdown";

/** jsdom has no ResizeObserver, which CodeBlock's stick-to-bottom observes with. */
function stubResizeObserver() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
}

describe("StreamingMarkdown", () => {
  it("renders real elements for each block", () => {
    stubResizeObserver();
    const { container } = render(
      <StreamingMarkdown
        content={"## Plan\n\n1. Read\n2. Write\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```js\nlet x\n```"}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Plan" })).toBeInTheDocument();
    expect(container.querySelector("ol")?.children).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(container.querySelector("figure pre code")?.textContent).toBe("let x\n");
  });

  it("keeps finished blocks' DOM nodes while the last one grows", () => {
    stubResizeObserver();
    const { container, rerender } = render(<StreamingMarkdown content={"First paragraph.\n\n- one"} streaming />);
    const [paragraph, list] = Array.from(container.firstElementChild!.children);
    const firstItem = list!.querySelector("li");

    rerender(<StreamingMarkdown content={"First paragraph.\n\n- one\n- two"} streaming />);
    const [paragraphAfter, listAfter] = Array.from(container.firstElementChild!.children);
    expect(paragraphAfter).toBe(paragraph);
    expect(listAfter).toBe(list);
    expect(listAfter!.querySelector("li")).toBe(firstItem);
    expect(listAfter!.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders model HTML as text and drops unsafe links", () => {
    stubResizeObserver();
    const { container } = render(
      <StreamingMarkdown content={'<img src=x onerror="alert(1)"> [click](javascript:alert(1)) [ok](https://example.com)'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
    const links = container.querySelectorAll("a[href]");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://example.com");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "ok (opens in new tab)" })).toBe(links[0]);
  });

  it("is busy, not live, while streaming", () => {
    stubResizeObserver();
    const { container, rerender } = render(<StreamingMarkdown content="Hi" streaming />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).not.toHaveAttribute("aria-live");
    rerender(<StreamingMarkdown content="Hi" />);
    expect(root).not.toHaveAttribute("aria-busy");
  });

  it("wraps only the live block's words for the fade-in", () => {
    stubResizeObserver();
    const { container } = render(<StreamingMarkdown content={"Done.\n\nStill going"} streaming />);
    const [done, live] = Array.from(container.firstElementChild!.children);
    expect(done!.querySelectorAll("span")).toHaveLength(0);
    expect(Array.from(live!.querySelectorAll("span")).map((s) => s.textContent)).toEqual(["Still", "going"]);
  });

  it("accepts element overrides", () => {
    stubResizeObserver();
    render(
      <StreamingMarkdown
        content="[docs](/docs)"
        components={{ a: (props) => <a {...props} data-custom="yes" /> }}
        labels={{ opensInNewTab: "(nouvel onglet)" }}
      />,
    );
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute("data-custom", "yes");
  });
});
