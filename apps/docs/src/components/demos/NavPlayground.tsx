import { Nav, NavLink } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "ariaLabel", label: "aria-label", default: "Docs" },
  {
    type: "enum" as const,
    prop: "current",
    label: "current page",
    options: ["Overview", "Components", "Theming"],
    default: "Components",
  },
];

function code(values: PlaygroundValues) {
  const current = (label: string) => (values.current === label ? ' aria-current="page"' : "");
  return `<Nav aria-label="${values.ariaLabel}">
  <NavLink href="/"${current("Overview")}>Overview</NavLink>
  <NavLink href="/components/"${current("Components")}>Components</NavLink>
  <NavLink href="/theming"${current("Theming")}>Theming</NavLink>
</Nav>`;
}

function elementsCode(values: PlaygroundValues) {
  const current = (label: string) => (values.current === label ? ' aria-current="page"' : "");
  return `<kernel-nav aria-label="${values.ariaLabel}">
  <kernel-nav-link href="/"${current("Overview")}>Overview</kernel-nav-link>
  <kernel-nav-link href="/components/"${current("Components")}>Components</kernel-nav-link>
  <kernel-nav-link href="/theming"${current("Theming")}>Theming</kernel-nav-link>
</kernel-nav>`;
}

export default function NavPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Nav aria-label={String(values.ariaLabel)}>
          <NavLink href="/" aria-current={values.current === "Overview" ? "page" : undefined}>
            Overview
          </NavLink>
          <NavLink href="/components/" aria-current={values.current === "Components" ? "page" : undefined}>
            Components
          </NavLink>
          <NavLink href="/theming" aria-current={values.current === "Theming" ? "page" : undefined}>
            Theming
          </NavLink>
        </Nav>
      )}
    />
  );
}
