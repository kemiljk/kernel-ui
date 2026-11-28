import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu, DropdownMenuMorph, MenuItem } from "./DropdownMenu";

describe("DropdownMenu", () => {
  it("applies popup className and open-state attributes", () => {
    render(
      <DropdownMenu
        className="menu-popup"
        align="end"
        offset={12}
        placement="bottom"
        render={<button type="button">Actions</button>}
      >
        <MenuItem>Edit</MenuItem>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole("button", { name: "Actions" });
    const menuId = trigger.getAttribute("popovertarget")!;
    const menu = document.getElementById(menuId)!;
    expect(menu).toHaveAttribute("data-slot", "dropdown-menu-content");
    expect(menu).toHaveAttribute("data-placement", "bottom");
    expect(menu).toHaveAttribute("data-align", "end");
    expect(menu.className).toContain("menu-popup");
  });

  it("renders MenuItem as a real link via render without blocking navigation", () => {
    const onSelect = vi.fn();
    const onClick = vi.fn();
    const ref = createRef<HTMLAnchorElement>();

    render(
      <DropdownMenu render={<button type="button">Go</button>}>
        <MenuItem
          render={<a href="#settings" ref={ref} onClick={onClick} />}
          className={({ highlighted }) => (highlighted ? "is-hot" : "is-cold")}
          onSelect={onSelect}
        >
          Settings
        </MenuItem>
      </DropdownMenu>,
    );

    const item = screen.getByRole("menuitem", { name: "Settings" });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("href", "#settings");
    expect(item).toHaveAttribute("data-slot", "menu-item");
    expect(ref.current).toBe(item);

    fireEvent.click(item);
    expect(onClick).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalled();
    // Never prevented — native link behaviour stays intact.
    expect(onClick.mock.calls[0]![0].defaultPrevented).toBe(false);
  });

  it("keeps ArrowDown, Home, and End roving across link menu items", () => {
    render(
      <DropdownMenu render={<button type="button">Menu</button>}>
        <MenuItem render={<a href="/one" />}>One</MenuItem>
        <MenuItem render={<a href="/two" />}>Two</MenuItem>
        <MenuItem render={<a href="/three" />}>Three</MenuItem>
      </DropdownMenu>,
    );

    const trigger = screen.getByRole("button", { name: "Menu" });
    const menu = document.getElementById(trigger.getAttribute("popovertarget")!)!;
    const items = screen.getAllByRole("menuitem");
    items[0]!.focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(items[0]);
  });
});

// jsdom has no popover API: stand in for showPopover() with the toggle
// event the browser fires, which is what DropdownMenu listens to.
function renderModalityMenu() {
  render(
    <DropdownMenu render={<button type="button">Menu</button>}>
      <MenuItem>One</MenuItem>
      <MenuItem>Two</MenuItem>
      <MenuItem>Three</MenuItem>
    </DropdownMenu>,
  );
  const trigger = screen.getByRole("button", { name: "Menu" });
  const menu = document.getElementById(trigger.getAttribute("popovertarget")!)!;
  const items = screen.getAllByRole("menuitem", { hidden: true });
  const open = () =>
    act(() => {
      const event = Object.assign(new Event("toggle"), { newState: "open" });
      menu.dispatchEvent(event);
    });
  menu.showPopover = open as unknown as () => void;
  const highlighted = () => items.filter((item) => item.hasAttribute("data-highlighted"));
  return { trigger, menu, items, open, highlighted };
}

describe("DropdownMenu open modality", () => {
  it("focuses the menu, not an item, when opened with a pointer", async () => {
    const { trigger, menu, items, open, highlighted } = renderModalityMenu();
    fireEvent.pointerDown(trigger);
    open();
    await waitFor(() => expect(document.activeElement).toBe(menu));
    expect(menu).toHaveAttribute("tabindex", "-1");
    expect(highlighted()).toEqual([]);

    // The first arrow key from the container lands on the first item.
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
    expect(highlighted()).toEqual([items[0]]);
    expect(menu).toHaveAttribute("data-input", "keyboard");
  });

  it("lands on the last item for ArrowUp from the container", async () => {
    const { trigger, menu, items, open } = renderModalityMenu();
    fireEvent.pointerDown(trigger);
    open();
    await waitFor(() => expect(document.activeElement).toBe(menu));
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[2]);
  });

  it("focuses the first item when opened from the keyboard", async () => {
    const { trigger, items, open, highlighted } = renderModalityMenu();
    fireEvent.keyDown(trigger, { key: "Enter" });
    open();
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    expect(highlighted()).toEqual([items[0]]);
  });

  it("opens on the first item for ArrowDown on the trigger", async () => {
    const { trigger, items } = renderModalityMenu();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
  });

  it("opens on the last item for ArrowUp on the trigger", async () => {
    const { trigger, items } = renderModalityMenu();
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(() => expect(document.activeElement).toBe(items[2]));
  });

  it("moves a single highlight with the pointer and clears it on leave", async () => {
    const { trigger, menu, items, open, highlighted } = renderModalityMenu();
    fireEvent.pointerDown(trigger);
    open();
    await waitFor(() => expect(document.activeElement).toBe(menu));

    fireEvent.pointerMove(items[1]!, { pointerType: "mouse" });
    expect(highlighted()).toEqual([items[1]]);
    expect(menu).toHaveAttribute("data-input", "pointer");
    fireEvent.pointerMove(items[2]!, { pointerType: "mouse" });
    expect(highlighted()).toEqual([items[2]]);

    fireEvent.pointerLeave(menu);
    expect(highlighted()).toEqual([]);
    expect(document.activeElement).toBe(menu);
  });

  it("keeps a keyboard highlight when the pointer leaves", async () => {
    const { trigger, menu, items, open, highlighted } = renderModalityMenu();
    fireEvent.keyDown(trigger, { key: "Enter" });
    open();
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    fireEvent.pointerLeave(menu);
    expect(highlighted()).toEqual([items[0]]);
  });
});

// DropdownMenuMorph is a manual popover, so it gets no native focus restore.
describe("DropdownMenuMorph focus return", () => {
  async function openMorph() {
    render(
      <>
        <DropdownMenuMorph render={<button type="button">Create</button>}>
          <MenuItem>One</MenuItem>
          <MenuItem>Two</MenuItem>
        </DropdownMenuMorph>
        <button type="button">Elsewhere</button>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    const items = screen.getAllByRole("menuitem", { hidden: true });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    return { trigger, items, elsewhere: screen.getByRole("button", { name: "Elsewhere" }) };
  }

  it("returns focus to the trigger on Escape", async () => {
    const { trigger } = await openMorph();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to the trigger after a selection", async () => {
    const { trigger, items } = await openMorph();
    fireEvent.click(items[1]!);
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves focus alone after an outside press", async () => {
    const { trigger, elsewhere } = await openMorph();
    fireEvent.pointerDown(elsewhere);
    expect(document.activeElement).not.toBe(trigger);
    elsewhere.focus();
    expect(document.activeElement).toBe(elsewhere);
  });
});

// details.open is the source of truth; the toggle event mirrors what a
// native summary activation emits (JSDOM has no rendered disclosure tree).
describe("DropdownMenu disclosure", () => {
  it("uses native details/summary without a popover or click controller", () => {
    render(<DropdownMenu presentation="disclosure" render={<summary>Navigation</summary>}>
      <MenuItem>Home</MenuItem>
    </DropdownMenu>);
    const summary = screen.getByText("Navigation");
    const details = summary.closest("details")!;
    const menu = details.querySelector('[role="menu"]')!;
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary).toHaveAttribute("aria-controls", menu.id);
    expect(summary).not.toHaveAttribute("popovertarget");
    expect(menu).not.toHaveAttribute("popover");
    expect(details).not.toHaveAttribute("open");
  });

  it("closes on Escape and selection, restoring focus to summary", () => {
    render(<DropdownMenu presentation="disclosure" render={<summary>Navigation</summary>}>
      <MenuItem>Home</MenuItem>
    </DropdownMenu>);
    const summary = screen.getByText("Navigation");
    const details = summary.closest("details")!;
    const menu = details.querySelector('[role="menu"]')!;
    const item = menu.querySelector<HTMLElement>('[role="menuitem"]')!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    item.focus();
    fireEvent.keyDown(document, {key:"Escape"});
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
    details.open = true;
    fireEvent(details, new Event("toggle"));
    fireEvent.click(item);
    expect(details.open).toBe(false);
  });

  it("preserves preventDefault for a menu panel change", () => {
    render(<DropdownMenu presentation="disclosure" render={<summary>Navigation</summary>}>
      <MenuItem onClick={event => event.preventDefault()}>Submenu</MenuItem>
    </DropdownMenu>);
    const details = screen.getByText("Navigation").closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    fireEvent.click(screen.getByText("Submenu"));
    expect(details.open).toBe(true);
  });
});
