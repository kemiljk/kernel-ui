import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, type DialogBackdrop, type DialogClassNames } from "./Dialog";

function ControlledDialog(props: {
  onOpenChange?: (open: boolean) => void;
  showCloseButton?: boolean;
  classNames?: DialogClassNames;
  backdrop?: DialogBackdrop;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        props.onOpenChange?.(next);
        setOpen(next);
      }}
      title={<span data-testid="rich-title">Rich title</span>}
      description="Details"
      showCloseButton={props.showCloseButton}
      classNames={props.classNames}
      backdrop={props.backdrop}
    >
      Body
    </Dialog>
  );
}

describe("Dialog", () => {
  it("renders a dialog element with an accessible title", () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Confirm changes">
        Body copy
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Confirm changes" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveTextContent("Body copy");
  });

  it("exposes slot hooks and supports rich title content", () => {
    render(
      <ControlledDialog
        classNames={{
          root: "root-x",
          header: "header-x",
          title: "title-x",
          description: "desc-x",
          content: "body-x",
          close: "close-x",
        }}
        backdrop="blur"
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "dialog");
    expect(dialog).toHaveAttribute("data-backdrop", "blur");
    expect(dialog.className).toContain("root-x");
    expect(dialog.querySelector('[data-slot="dialog-header"]')?.className).toContain("header-x");
    expect(dialog.querySelector('[data-slot="dialog-title"]')?.className).toContain("title-x");
    expect(dialog.querySelector('[data-slot="dialog-description"]')?.className).toContain("desc-x");
    expect(dialog.querySelector('[data-slot="dialog-content"]')?.className).toContain("body-x");
    expect(dialog.querySelector('[data-slot="dialog-close"]')?.className).toContain("close-x");
    expect(screen.getByTestId("rich-title")).toBeInTheDocument();
  });

  it("can omit the close control", () => {
    render(<ControlledDialog showCloseButton={false} />);
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull();
  });

  it("delays native close for exit animation and still syncs onOpenChange", async () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog onOpenChange={onOpenChange} />);

    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(dialog).toHaveAttribute("data-closing");

    await waitFor(() => {
      expect(dialog.open).toBe(false);
    });
  });

  it("prevents immediate Escape close so exit animation can run", async () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    act(() => {
      dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(dialog).toHaveAttribute("data-closing");

    await waitFor(() => {
      expect(dialog.open).toBe(false);
    });
  });
});
