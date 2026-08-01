import type { MouseEvent } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

function preventDemoNavigation(event: MouseEvent) {
  event.preventDefault();
}

const controls = [
  { type: "text" as const, prop: "ariaLabel", label: "aria-label", default: "Product" },
  {
    type: "boolean" as const,
    prop: "pricingCurrent",
    label: "Pricing is current page",
    default: false,
  },
  { type: "boolean" as const, prop: "triggerDisabled", label: "Solutions disabled", default: false },
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "bottom",
  },
  {
    type: "enum" as const,
    prop: "align",
    options: ["start", "center", "end"],
    default: "center",
  },
  { type: "number" as const, prop: "offset", label: "offset (px)", default: 8, min: 0, max: 32, step: 1 },
];

/** Only the item that owns a panel takes positioning props, so this is
 * built once and shared by both code samples and the live render. */
function panelPositioning(values: PlaygroundValues, syntax: "react" | "elements") {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) {
    attrs.push(
      syntax === "react" ? `offset={${Number(values.offset)}}` : `offset="${Number(values.offset)}"`,
    );
  }
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function code(values: PlaygroundValues) {
  const pricingAttrs = values.pricingCurrent ? ` aria-current="page"` : "";
  const triggerAttrs = values.triggerDisabled ? " disabled" : "";
  return `<NavigationMenu aria-label="${values.ariaLabel}">
  <NavigationMenuItem>
    <NavigationMenuLink href="/pricing"${pricingAttrs}>Pricing</NavigationMenuLink>
  </NavigationMenuItem>
  <NavigationMenuItem${panelPositioning(values, "react")}>
    <NavigationMenuTrigger${triggerAttrs}>Solutions</NavigationMenuTrigger>
    <NavigationMenuContent>
      <NavigationMenuLink href="/solutions/startups">For Startups</NavigationMenuLink>
      <NavigationMenuLink href="/solutions/enterprise">For Enterprise</NavigationMenuLink>
    </NavigationMenuContent>
  </NavigationMenuItem>
</NavigationMenu>`;
}

function elementsCode(values: PlaygroundValues) {
  const pricingAttrs = values.pricingCurrent ? ` aria-current="page"` : "";
  const triggerAttrs = values.triggerDisabled ? " disabled" : "";
  return `<kernel-navigation-menu aria-label="${values.ariaLabel}">
  <kernel-nav-menu-item>
    <kernel-nav-menu-link href="/pricing"${pricingAttrs}>Pricing</kernel-nav-menu-link>
  </kernel-nav-menu-item>
  <kernel-nav-menu-item${panelPositioning(values, "elements")}>
    <kernel-nav-menu-trigger${triggerAttrs}>Solutions</kernel-nav-menu-trigger>
    <kernel-nav-menu-content>
      <kernel-nav-menu-link href="/solutions/startups">For Startups</kernel-nav-menu-link>
      <kernel-nav-menu-link href="/solutions/enterprise">For Enterprise</kernel-nav-menu-link>
    </kernel-nav-menu-content>
  </kernel-nav-menu-item>
</kernel-navigation-menu>`;
}

export default function NavigationMenuPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <NavigationMenu aria-label={String(values.ariaLabel)}>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="/pricing"
              aria-current={values.pricingCurrent ? "page" : undefined}
              onClick={preventDemoNavigation}
            >
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/docs" onClick={preventDemoNavigation}>
              Docs
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem
            placement={values.placement as "top" | "bottom" | "left" | "right"}
            align={values.align as "start" | "center" | "end"}
            offset={Number(values.offset)}
          >
            <NavigationMenuTrigger disabled={Boolean(values.triggerDisabled)}>
              Solutions
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/solutions/startups" onClick={preventDemoNavigation}>
                For Startups
              </NavigationMenuLink>
              <NavigationMenuLink href="/solutions/enterprise" onClick={preventDemoNavigation}>
                For Enterprise
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenu>
      )}
    />
  );
}
