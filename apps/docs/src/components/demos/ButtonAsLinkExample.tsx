import { Button } from "@kernelui/react";

// Same reason this lives in a real .tsx file as ButtonIconsExample:
// render={<a ... />} is a JSX-element-valued prop, which breaks when
// written directly in an .astro template nested inside a custom
// component's <slot />.
export default function ButtonAsLinkExample() {
  return <Button render={<a href="#rendered-as-link" />}>See pricing</Button>;
}
