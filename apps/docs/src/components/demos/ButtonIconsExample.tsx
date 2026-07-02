import { Button } from "@kernelui/react";
import { CheckIcon, CopyIcon, MagnifyingGlassIcon } from "../icons";

// A JSX element used as a prop value (iconStart={<Icon />}) breaks when
// written directly in an .astro template nested inside a custom
// component's <slot /> — Astro's template compiler doesn't flatten that
// inner element correctly before handing it to React, and it leaks
// through as a raw internal descriptor object. Real .tsx files don't go
// through that code path at all, so this preview — unlike the other,
// simpler Button examples — has to live in one, same as ButtonDemo.
export default function ButtonIconsExample() {
  return (
    <>
      <Button variant="secondary" iconStart={<MagnifyingGlassIcon width="16" height="16" />}>
        Search
      </Button>
      <Button variant="primary" iconEnd={<CheckIcon width="16" height="16" />}>
        Mark as done
      </Button>
      <Button variant="ghost" aria-label="Copy" iconStart={<CopyIcon width="16" height="16" />} />
    </>
  );
}
