import type { MouseEvent } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

function preventDemoNavigation(event: MouseEvent) {
  event.preventDefault();
}

const controls = [
  { type: "text" as const, prop: "ariaLabel", label: "aria-label", default: "Product" },
];

function code(values: PlaygroundValues) {
  return `<NavigationMenu aria-label="${values.ariaLabel}">
  <NavigationMenuItem>
    <NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink>
  </NavigationMenuItem>
  <NavigationMenuItem>
    <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
    <NavigationMenuContent>
      <NavigationMenuLink href="/solutions/startups">For Startups</NavigationMenuLink>
      <NavigationMenuLink href="/solutions/enterprise">For Enterprise</NavigationMenuLink>
    </NavigationMenuContent>
  </NavigationMenuItem>
</NavigationMenu>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-navigation-menu aria-label="${values.ariaLabel}">
  <kernel-nav-menu-item>
    <kernel-nav-menu-link href="/pricing">Pricing</kernel-nav-menu-link>
  </kernel-nav-menu-item>
  <kernel-nav-menu-item>
    <kernel-nav-menu-trigger>Solutions</kernel-nav-menu-trigger>
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
            <NavigationMenuLink href="/pricing" onClick={preventDemoNavigation}>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/docs" onClick={preventDemoNavigation}>
              Docs
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
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
