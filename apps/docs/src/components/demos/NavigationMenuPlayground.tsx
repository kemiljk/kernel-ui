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
];

function code(values: PlaygroundValues) {
  const pricingAttrs = values.pricingCurrent ? ` aria-current="page"` : "";
  const triggerAttrs = values.triggerDisabled ? " disabled" : "";
  return `<NavigationMenu aria-label="${values.ariaLabel}">
  <NavigationMenuItem>
    <NavigationMenuLink href="/pricing"${pricingAttrs}>Pricing</NavigationMenuLink>
  </NavigationMenuItem>
  <NavigationMenuItem>
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
  <kernel-nav-menu-item>
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
          <NavigationMenuItem>
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
