import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SchemaRenderer } from "./SchemaRenderer";
import { parsePartialJson } from "./schema";

const tree = {
  version: 1,
  root: {
    type: "Card",
    props: { title: "Book a demo" },
    children: [
      {
        type: "Form",
        props: { action: "book", payload: { source: "chat" } },
        children: [
          { type: "TextField", props: { name: "email", label: "Work email", type: "email", defaultValue: "a@b.co" } },
          { type: "Switch", props: { name: "updates", label: "Product updates" } },
          { type: "Button", props: { label: "Book", variant: "primary", submit: true } },
        ],
      },
      { type: "Button", props: { label: "Not now", action: "dismiss", payload: 1 } },
      { type: "Link", props: { href: "javascript:alert(1)", text: "Sneaky" } },
      { type: "Marquee", props: { text: "nope" } },
    ],
  },
};

describe("SchemaRenderer", () => {
  it("renders real Kernel components", () => {
    render(<SchemaRenderer value={tree} onIssue={() => {}} />);
    expect(screen.getByRole("heading", { name: "Book a demo" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Work email" })).toHaveValue("a@b.co");
    expect(screen.getByRole("switch", { name: "Product updates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book" })).toHaveAttribute("type", "submit");
  });

  it("drops unknown types and unsafe URLs, reporting each once", () => {
    const onIssue = vi.fn();
    const { container, rerender } = render(<SchemaRenderer value={tree} onIssue={onIssue} />);
    expect(container.textContent).not.toContain("nope");
    const link = screen.getByText("Sneaky");
    expect(link.tagName).toBe("A");
    expect(link).not.toHaveAttribute("href");
    expect(onIssue.mock.calls.map(([issue]) => issue.code).sort()).toEqual(["unknown-type", "unsafe-url"]);
    rerender(<SchemaRenderer value={tree} onIssue={onIssue} />);
    expect(onIssue).toHaveBeenCalledTimes(2);
  });

  it("warns in the console when no onIssue handler is given", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<SchemaRenderer value={{ type: "Blink" }} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unknown node type"));
    warn.mockRestore();
  });

  it("emits actions with payload and the form's current values instead of executing anything", () => {
    const onAction = vi.fn();
    render(<SchemaRenderer value={tree} onAction={onAction} onIssue={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onAction).toHaveBeenLastCalledWith({ action: "dismiss", payload: 1, values: { email: "a@b.co", updates: false } });

    fireEvent.change(screen.getByRole("textbox", { name: "Work email" }), { target: { value: "me@corp.com" } });
    fireEvent.click(screen.getByRole("switch", { name: "Product updates" }));
    fireEvent.submit(screen.getByRole("button", { name: "Book" }).closest("form")!);
    expect(onAction).toHaveBeenLastCalledWith({
      action: "book",
      payload: { source: "chat" },
      values: { email: "me@corp.com", updates: true },
    });
  });

  it("renders a streaming value progressively without throwing or reporting", () => {
    const onIssue = vi.fn();
    const text = JSON.stringify(tree);
    const { rerender, container } = render(<SchemaRenderer value={undefined} streaming onIssue={onIssue} />);
    for (let i = 0; i <= text.length; i += 7) {
      rerender(<SchemaRenderer value={parsePartialJson(text.slice(0, i))} streaming onIssue={onIssue} />);
    }
    expect(onIssue).not.toHaveBeenCalled();
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    rerender(<SchemaRenderer value={parsePartialJson(text)} onIssue={onIssue} />);
    expect(container.firstElementChild).not.toHaveAttribute("aria-busy");
    expect(onIssue).toHaveBeenCalledTimes(2);
  });

  it("keeps typed values while the tree keeps streaming in", () => {
    const first = { type: "Stack", children: [{ type: "TextField", id: "q", props: { name: "q", label: "Query" } }] };
    const { rerender } = render(<SchemaRenderer value={first} streaming />);
    const input = screen.getByRole("textbox", { name: "Query" });
    fireEvent.change(input, { target: { value: "kernel" } });
    rerender(
      <SchemaRenderer
        value={{ ...first, children: [...first.children, { type: "Text", props: { text: "more" } }] }}
        streaming
      />,
    );
    expect(screen.getByRole("textbox", { name: "Query" })).toBe(input);
    expect(input).toHaveValue("kernel");
  });
});
