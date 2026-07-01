import { Button } from "@kernelui/react";

/**
 * Both are real navigations, not in-place actions, so both render as
 * `<a>` via `render` rather than `<button>` (see Button's own docs).
 * Static markup, no client directive needed: there's no state here for
 * React to own.
 */
export default function HeroCtas() {
  return (
    <>
      <Button variant="primary" size="lg" render={<a href="/components/" />}>
        Browse components
      </Button>
      <Button variant="secondary" size="lg" render={<a href="/installation/" />}>
        Get started
      </Button>
    </>
  );
}
