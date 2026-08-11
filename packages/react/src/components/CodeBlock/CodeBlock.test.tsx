import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeBlock } from "./CodeBlock";
import { linesFromCode } from "../../utils/codeTokens";

/** jsdom has no ResizeObserver, which `useStickToBottom` observes with. */
function stubResizeObserver() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
}

describe("CodeBlock", () => {
  it("renders one row per line", () => {
    stubResizeObserver();
    const { container } = render(<CodeBlock code={"const a = 1\nconst b = 2"} copyable={false} />);
    expect(container.querySelectorAll("code > span")).toHaveLength(2);
    expect(container.querySelector("pre")?.textContent).toBe("const a = 1\nconst b = 2\n");
  });

  it("keeps earlier lines mounted when streamed output grows", () => {
    stubResizeObserver();
    const { container, rerender } = render(
      <CodeBlock lines={linesFromCode("one\ntwo")} streaming copyable={false} />,
    );
    const rows = () => Array.from(container.querySelectorAll("code > span"));
    const [firstBefore, secondBefore] = rows();

    rerender(<CodeBlock lines={linesFromCode("one\ntwo\nthree")} streaming copyable={false} />);
    const after = rows();

    // Same DOM nodes, not replacements — this is what stops a streaming block
    // from flickering and losing the reader's text selection on every chunk.
    expect(after).toHaveLength(3);
    expect(after[0]).toBe(firstBefore);
    expect(after[1]).toBe(secondBefore);
  });

  it("emphasises 1-based highlighted lines", () => {
    stubResizeObserver();
    const { container } = render(
      <CodeBlock code={"one\ntwo\nthree"} highlightLines={[2]} copyable={false} />,
    );
    const rows = container.querySelectorAll("code > span");
    expect(rows[0]).not.toHaveAttribute("data-highlight");
    expect(rows[1]).toHaveAttribute("data-highlight");
  });

  it("copies the code without the line numbers", async () => {
    stubResizeObserver();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<CodeBlock code={"const a = 1\nconst b = 2"} showLineNumbers />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("const a = 1\nconst b = 2");
    expect(await screen.findByText("Copied to clipboard")).toBeInTheDocument();
  });
});
