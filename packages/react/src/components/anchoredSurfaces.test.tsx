import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
