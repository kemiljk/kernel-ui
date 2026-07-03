import { Button, Composer } from "@kernelui-lib/react";
import { PaperclipIcon } from "../icons";

// actionsLeading/actionsTrailing take a JSX element (or a function
// returning one) — writing that directly as a prop value in an .astro
// template hits the same bug Button's icon/render examples hit earlier:
// Astro's compiler mishandles a JSX element used as a *prop*, not as
// children, when nested inside a custom component's <slot />. Real .tsx
// files don't go through that code path.
export default function ComposerActionsExample() {
  return (
    <Composer
      placeholder="Ask anything…"
      actionsLeading={
        <Button variant="ghost" size="sm" aria-label="Attach" iconStart={<PaperclipIcon width="14" height="14" />} />
      }
      actionsTrailing={({ submit }) => (
        <Button variant="primary" size="sm" onClick={submit}>
          Send
        </Button>
      )}
    />
  );
}
