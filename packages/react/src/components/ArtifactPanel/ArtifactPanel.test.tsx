import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactPanel } from "./ArtifactPanel";

const views = [
  { value: "preview", label: "Preview", content: <p>Rendered page</p> },
  { value: "code", label: "Code", content: <pre>{"<h1>Hi</h1>"}</pre> },
];

function Versioned(props: { presentation?: "docked" | "overlay"; onOpenChange?: (open: boolean) => void }) {
  const [version, setVersion] = useState(3);
  const [open, setOpen] = useState(true);
  return (
    <ArtifactPanel
      title="Landing page"
      presentation={props.presentation ?? "docked"}
      open={open}
      onOpenChange={(next) => {
        props.onOpenChange?.(next);
        setOpen(next);
      }}
      version={version}
      versionCount={5}
      onVersionChange={setVersion}
      views={views}
      actions={<button type="button">Copy</button>}
    />
  );
}

describe("ArtifactPanel", () => {
  it("docked: a complementary landmark named by its title heading", () => {
    render(<Versioned />);
    const region = screen.getByRole("complementary", { name: "Landing page" });
    expect(region.tagName).toBe("ASIDE");
    expect(screen.getByRole("heading", { level: 2, name: "Landing page" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Views" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("switches versions and disables the ends", () => {
    render(<Versioned />);
    const group = screen.getByRole("group", { name: "Versions" });
    expect(group).toHaveTextContent("v3 of 5");
    const next = screen.getByRole("button", { name: "Next version" });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(group).toHaveTextContent("v5 of 5");
    expect(next).toBeDisabled();
    const prev = screen.getByRole("button", { name: "Previous version" });
    for (let i = 0; i < 4; i++) fireEvent.click(prev);
    expect(group).toHaveTextContent("v1 of 5");
    expect(prev).toBeDisabled();
  });

  it("switches views with Kernel's Tabs", () => {
    render(<Versioned />);
    expect(screen.getByText("Rendered page")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Code" }));
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("<h1>Hi</h1>").closest("[role=tabpanel]")).not.toHaveAttribute("hidden");
    expect(screen.getByText("Rendered page").closest("[role=tabpanel]")).toHaveAttribute("hidden");
  });

  it("docked close hides the panel", () => {
    const onOpenChange = vi.fn();
    render(<Versioned onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.querySelector("aside")).toHaveAttribute("hidden");
  });

  it("overlay: a modal dialog opened with showModal, closed by Escape", async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const onOpenChange = vi.fn();
    render(<Versioned presentation="overlay" onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog", { name: "Landing page" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(showModal).toHaveBeenCalled();
    await act(async () => {
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    showModal.mockRestore();
  });

  it("status: a polite live region, mounted before it has anything to say", () => {
    const { rerender } = render(<ArtifactPanel title="Doc" status="ready">Body</ArtifactPanel>);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
    rerender(<ArtifactPanel title="Doc" status="streaming">Body</ArtifactPanel>);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Generating…");
    expect(screen.getByRole("complementary")).toHaveAttribute("aria-busy", "true");
    rerender(
      <ArtifactPanel title="Doc" status="error" labels={{ error: "Échec" }}>
        Body
      </ArtifactPanel>,
    );
    expect(status).toHaveTextContent("Échec");
  });

  it("formats the version readout through labels", () => {
    render(
      <ArtifactPanel title="Doc" version={2} versionCount={4} labels={{ version: (c, t) => `${c}/${t}` }}>
        Body
      </ArtifactPanel>,
    );
    expect(screen.getByRole("group", { name: "Versions" })).toHaveTextContent("2/4");
  });
});
