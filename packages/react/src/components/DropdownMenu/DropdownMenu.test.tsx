import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu, MenuItem } from "./DropdownMenu";

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
