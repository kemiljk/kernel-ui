import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog } from "./Dialog";

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
});
