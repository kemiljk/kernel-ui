import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@kernelui-lib/react";

/** hrefs here are illustrative, not real routes — this demo shouldn't
 * actually navigate away from the docs page it's embedded in. */
function preventDemoNavigation(event: React.MouseEvent) {
  event.preventDefault();
}

export default function NavigationMenuDemo() {
  return (
    <NavigationMenu aria-label="Product">
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
        <NavigationMenuLink href="/changelog" onClick={preventDemoNavigation}>
          Changelog
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
  );
}
