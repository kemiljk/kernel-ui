import { render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { ToolCall, type ToolCallStatus } from "./ToolCall";

describe("ToolCall", () => {
  it("retains its status and label layers across rapid status changes", () => {
    const { container, rerender } = render(
      <ToolCall label="Searching the repository" status="pending" />,
    );
    const root = container.querySelector('[data-status="pending"]');
    const runningLayer = container.querySelector('[data-kind="running"]');
    const completeLayer = container.querySelector('[data-kind="complete"]');
    const settledLabel = container.querySelector('[data-kind="settled"]');

    expect(root).not.toBeNull();
    expect(runningLayer).not.toBeNull();
    expect(completeLayer).not.toBeNull();
    expect(settledLabel).not.toBeNull();
    expect(container.querySelectorAll('[data-kind="running"]')).toHaveLength(2);
    expect(container.querySelectorAll('[aria-hidden="true"] [data-kind]')).toHaveLength(4);

    for (const status of ["running", "complete", "running", "error"] satisfies ToolCallStatus[]) {
      rerender(<ToolCall label="Searching the repository" status={status} />);
      expect(root).toHaveAttribute("data-status", status);
      expect(container.querySelector('[data-kind="running"]')).toBe(runningLayer);
      expect(container.querySelector('[data-kind="complete"]')).toBe(completeLayer);
      expect(container.querySelector('[data-kind="settled"]')).toBe(settledLabel);
    }
  });

  it("uses the same persistent status structure for a disclosure", () => {
    const { container, rerender } = render(
      <ToolCall label="Reading package metadata" status="running">
        Result
      </ToolCall>,
    );
    const details = container.querySelector("details");
    const statusSlot = container.querySelector('[aria-hidden="true"]');

    expect(details).toHaveAttribute("data-status", "running");
    expect(container.querySelector('[role="status"]')).toHaveTextContent("Reading package metadata");

    rerender(
      <ToolCall label="Read package metadata" status="complete">
        Result
      </ToolCall>,
    );

    expect(container.querySelector("details")).toBe(details);
    expect(container.querySelector('[aria-hidden="true"]')).toBe(statusSlot);
    expect(details).toHaveAttribute("data-status", "complete");
    expect(container.querySelector(".kernel-sr-only")).toHaveTextContent("Read package metadata");
  });

  it("mounts a rich ReactNode label only once", () => {
    let mounts = 0;
    function RichLabel() {
      useEffect(() => {
        mounts += 1;
      }, []);
      return <span data-testid="rich-label">Reading rich content</span>;
    }

    const { getAllByTestId, rerender } = render(
      <ToolCall label={<RichLabel />} status="running" />,
    );
    expect(getAllByTestId("rich-label")).toHaveLength(1);
    expect(mounts).toBe(1);

    rerender(<ToolCall label={<RichLabel />} status="complete" />);
    expect(getAllByTestId("rich-label")).toHaveLength(1);
    expect(mounts).toBe(1);
  });
});
