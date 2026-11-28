import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { ContextMenu } from "./ContextMenu";
import { MenuItem } from "../DropdownMenu/DropdownMenu";

// jsdom has no popover API; ContextMenu only needs the calls to exist.
beforeAll(() => {
  HTMLElement.prototype.showPopover ??= function showPopover() {};
  HTMLElement.prototype.hidePopover ??= function hidePopover() {};
});

function renderContextMenu() {
  render(
    <>
      <input aria-label="Before" />
      <ContextMenu
        render={
          <div>
            <span>Plain area</span>
            <button type="button">Inner</button>
          </div>
        }
      >
        <MenuItem>Copy</MenuItem>
        <MenuItem>Rename</MenuItem>
      </ContextMenu>
      <button type="button">Elsewhere</button>
    </>,
  );
  const menu = screen.getByRole("menu", { hidden: true });
  return {
    menu,
    before: screen.getByRole("textbox", { name: "Before" }),
    plain: screen.getByText("Plain area"),
    inner: screen.getByRole("button", { name: "Inner" }),
    elsewhere: screen.getByRole("button", { name: "Elsewhere" }),
    items: screen.getAllByRole("menuitem", { hidden: true }),
  };
}

describe("ContextMenu focus", () => {
  it("focuses the menu, not an item, and roves from there", async () => {
    const { menu, plain, items } = renderContextMenu();
    fireEvent.contextMenu(plain);
    await waitFor(() => expect(document.activeElement).toBe(menu));
    expect(items.some((item) => item.hasAttribute("data-highlighted"))).toBe(false);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[1]);
  });

  it("returns focus on Escape to whatever had it before opening", async () => {
    const { menu, before, plain } = renderContextMenu();
    before.focus();
    fireEvent.contextMenu(plain);
    await waitFor(() => expect(document.activeElement).toBe(menu));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(before);
  });

  it("remembers the focus from before the press, which moves it first", async () => {
    const { menu, before, plain } = renderContextMenu();
    before.focus();
    fireEvent.pointerDown(plain, { button: 2 });
    before.blur(); // what a real press on plain content does before contextmenu
    fireEvent.contextMenu(plain);
    await waitFor(() => expect(document.activeElement).toBe(menu));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(before);
  });

  it("falls back to the right-clicked control, then to the trigger region", async () => {
    const first = renderContextMenu();
    fireEvent.contextMenu(first.inner);
    await waitFor(() => expect(document.activeElement).toBe(first.menu));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(first.inner);

    first.inner.blur();
    const region = first.plain.closest("div")!.parentElement!;
    fireEvent.contextMenu(first.plain);
    await waitFor(() => expect(document.activeElement).toBe(first.menu));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(region);
    expect(region).toHaveAttribute("tabindex", "-1");
  });

  it("returns focus after a selection", async () => {
    const { menu, before, plain, items } = renderContextMenu();
    before.focus();
    fireEvent.contextMenu(plain);
    await waitFor(() => expect(document.activeElement).toBe(menu));
    fireEvent.click(items[0]!);
    expect(document.activeElement).toBe(before);
  });

  it("leaves focus alone after an outside press", async () => {
    const { menu, before, plain, elsewhere } = renderContextMenu();
    before.focus();
    fireEvent.contextMenu(plain);
    await waitFor(() => expect(document.activeElement).toBe(menu));
    fireEvent.pointerDown(elsewhere);
    expect(document.activeElement).not.toBe(before);
  });
});
