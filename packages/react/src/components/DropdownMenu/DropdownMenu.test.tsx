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
