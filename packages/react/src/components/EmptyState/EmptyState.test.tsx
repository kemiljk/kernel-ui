import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("is a section named by its heading and described by its description", () => {
    render(
      <EmptyState
        title="No conversations yet"
        description="Start a chat and it will show up here."
        actions={<button type="button">New chat</button>}
      />,
    );
    const section = screen.getByRole("region", { name: "No conversations yet" });
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveAccessibleDescription("Start a chat and it will show up here.");
    expect(screen.getByRole("heading", { level: 3, name: "No conversations yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
  });

  it("renders the configured heading level", () => {
    render(<EmptyState title="Nothing found" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Nothing found" })).toBeInTheDocument();
  });

  it("hides the decorative icon from assistive tech", () => {
    const { container } = render(
      <EmptyState
        title="Empty"
        icon={<svg data-testid="icon" width="16" height="16" viewBox="0 0 16 16" />}
      />,
    );
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("section")).toHaveAttribute("data-variant", "dashed");
  });
});
