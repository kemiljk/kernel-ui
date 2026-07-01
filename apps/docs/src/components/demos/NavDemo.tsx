import { Nav, NavLink } from "@kernelui/react";

/** hrefs here are illustrative, not real routes — this demo shouldn't
 * actually navigate away from the docs page it's embedded in. */
function preventDemoNavigation(event: React.MouseEvent) {
  event.preventDefault();
}

export default function NavDemo() {
  return (
    <Nav aria-label="Docs">
      <NavLink href="/" onClick={preventDemoNavigation}>
        Overview
      </NavLink>
      <NavLink href="/components/" aria-current="page" onClick={preventDemoNavigation}>
        Components
      </NavLink>
      <NavLink href="/theming" onClick={preventDemoNavigation}>
        Theming
      </NavLink>
      <NavLink href="/changelog" onClick={preventDemoNavigation}>
        Changelog
      </NavLink>
    </Nav>
  );
}
