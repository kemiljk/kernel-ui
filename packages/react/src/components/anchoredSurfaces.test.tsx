import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "./Combobox/Combobox";
import { DropdownMenu, MenuItem } from "./DropdownMenu/DropdownMenu";
import { HoverCard } from "./HoverCard/HoverCard";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "./NavigationMenu/NavigationMenu";
import { Popover } from "./Popover/Popover";
import { CommandPalette } from "./CommandPalette/CommandPalette";
import { Tooltip } from "./Tooltip/Tooltip";

/** Every anchored surface takes the same placement/align/offset trio and
 * reflects it the same way, so a consumer's positioning CSS is portable
 * between them. One table so a new overlay that skips a hook fails here
 * rather than in someone's stylesheet. */
const surfaces = [
  {
    name: "Tooltip",
    slot: "tooltip-content",
    render: () => <Tooltip content="Tip" align="end" offset={12} render={<button type="button">t</button>} />,
  },
  {
    name: "Popover",
    slot: "popover-content",
    render: () => (
      <Popover align="end" offset={12} render={<button type="button">p</button>}>
        panel
      </Popover>
    ),
  },
  {
    name: "HoverCard",
    slot: "hover-card-content",
    render: () => <HoverCard content="card" align="end" offset={12} render={<a href="#h">h</a>} />,
  },
  {
    name: "DropdownMenu",
    slot: "dropdown-menu-content",
    render: () => (
      <DropdownMenu align="end" offset={12} render={<button type="button">m</button>}>
        <MenuItem onSelect={() => {}}>Edit</MenuItem>
      </DropdownMenu>
    ),
  },
  {
    name: "Combobox",
    slot: "combobox-listbox",
    render: () => (
      <Combobox label="Framework" options={[{ value: "a", label: "A" }]} align="end" offset={12} />
    ),
  },
  {
    name: "NavigationMenu",
    slot: "navigation-menu-content",
    render: () => (
      <NavigationMenu aria-label="Product">
        <NavigationMenuItem align="end" offset={12}>
          <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#s">Startups</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenu>
    ),
  },
];

describe("anchored surfaces", () => {
  it.each(surfaces)("$name exposes the shared positioning hooks", ({ slot, render: renderSurface }) => {
    const { container } = render(renderSurface());
    const popup = container.ownerDocument.querySelector(`[data-slot="${slot}"]`);
    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute("data-placement");
    expect(popup).toHaveAttribute("data-align", "end");
  });

  it("supports grouped custom-rendered results in CommandPalette", () => {
    const onSelect = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        groups={[
          {
            id: "recent",
            label: "Recent",
            items: [{ id: "save", label: "Save", onSelect }],
          },
        ]}
        renderItem={(item) => (
          <span data-testid={`command-${item.id}`}>
            {item.label}
          </span>
        )}
      />,
    );

    expect(screen.getByText("Recent")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("command-save"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("filters via the real CommandPalette combobox input", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        items={[
          { id: "new-file", label: "New file", description: "Create a new file", onSelect: vi.fn() },
          { id: "save", label: "Save", description: "Save the current file", onSelect: vi.fn() },
        ]}
      />,
    );

    const search = screen.getByRole("combobox", { name: "Filter commands" });
    fireEvent.change(search, { target: { value: "save" } });

    expect(screen.getByRole("option", { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /new file/i })).not.toBeInTheDocument();
  });

  it("supports grouped custom-rendered options in Combobox", () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="Framework"
        groups={[
          {
            id: "frontend",
            label: "Frontend",
            items: [{ value: "react", label: "React" }],
          },
        ]}
        renderOption={(option) => <span data-testid={`option-${option.value}`}>{option.label}</span>}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.focus(screen.getByRole("combobox", { name: "Framework" }));
    fireEvent.click(screen.getByTestId("option-react"));
    expect(onValueChange).toHaveBeenCalledWith("react");
  });

  it("scrolls the active option into view on keyboard nav but not on hover", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <Combobox
        label="Framework"
        options={[
          { value: "astro", label: "Astro" },
          { value: "next", label: "Next.js" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Framework" });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });

    scrollIntoView.mockClear();
    fireEvent.pointerMove(screen.getByRole("option", { name: "Next.js" }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls the active item into view on keyboard nav but not on hover", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        items={[
          { id: "new-file", label: "New file", onSelect: vi.fn() },
          { id: "save", label: "Save", onSelect: vi.fn() },
        ]}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Filter commands" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });

    scrollIntoView.mockClear();
    fireEvent.pointerMove(screen.getByRole("option", { name: "New file" }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
