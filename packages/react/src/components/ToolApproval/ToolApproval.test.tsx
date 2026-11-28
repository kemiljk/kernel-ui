import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolApproval } from "./ToolApproval";

describe("ToolApproval", () => {
  it("is a group named by its heading, with Approve and Deny buttons", () => {
    render(
      <ToolApproval tool="bash">
        <p>Run npm test in the repository root.</p>
      </ToolApproval>,
    );
    const group = screen.getByRole("group", { name: "Allow bash to run?" });
    expect(group.tagName).toBe("SECTION");
    expect(screen.getByRole("heading", { level: 3, name: "Allow bash to run?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deny" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Always allow" })).toBeNull();
    // The live region exists before any decision, empty.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("approves, replaces the actions and announces the outcome", () => {
    const onApprove = vi.fn();
    const onStatusChange = vi.fn();
    render(<ToolApproval tool="bash" onApprove={onApprove} onStatusChange={onStatusChange} />);

    const approve = screen.getByRole("button", { name: "Approve" });
    approve.focus();
    fireEvent.click(approve);

    expect(onApprove).toHaveBeenCalledOnce();
    expect(onStatusChange).toHaveBeenCalledWith("approved");
    expect(screen.queryByRole("button")).toBeNull();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Approved");
    // Focus moves to the status line instead of falling to <body>.
    expect(status).toHaveFocus();
    expect(screen.getByRole("group")).toHaveAttribute("data-status", "approved");
  });

  it("denies", () => {
    const onDeny = vi.fn();
    const onApprove = vi.fn();
    render(<ToolApproval tool="bash" onDeny={onDeny} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(onDeny).toHaveBeenCalledOnce();
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Denied");
  });

  it("offers Always allow only with onAlwaysAllow", () => {
    const onAlwaysAllow = vi.fn();
    const onApprove = vi.fn();
    render(<ToolApproval tool="read_file" onAlwaysAllow={onAlwaysAllow} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: "Always allow" }));
    expect(onAlwaysAllow).toHaveBeenCalledOnce();
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Always allowed");
  });

  it("supports controlled status and label overrides", () => {
    const onStatusChange = vi.fn();
    const { rerender } = render(
      <ToolApproval
        tool="bash"
        status="pending"
        onStatusChange={onStatusChange}
        labels={{ approve: "Run it", deny: "Skip", denied: "Skipped" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Run it" }));
    expect(onStatusChange).toHaveBeenCalledWith("approved");
    // Still pending until the parent says otherwise.
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();

    rerender(
      <ToolApproval
        tool="bash"
        status="denied"
        onStatusChange={onStatusChange}
        labels={{ approve: "Run it", deny: "Skip", denied: "Skipped" }}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Skipped");
  });
});
