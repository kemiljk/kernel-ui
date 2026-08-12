import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { DropdownMenuMorph, MenuItem, MenuSeparator } from "@kernelui-lib/react";

/**
 * The trigger's icon-rotation/cross-fade is authored here, in the demo,
 * not inside `DropdownMenuMorph` itself — the component's own job is the
 * container morph and the manual-popover mechanics, and `render` is
 * consumer content the same way `DropdownMenu`'s always has been (see
 * `MenuChevron`'s doc comment: "what renders is always visible at the
 * call site, not implied"). `aria-expanded` lands on this button via
 * `DropdownMenuMorph`'s own prop merge, so the plain CSS below needs no
 * extra wiring to know when to rotate — but only because this forwards
 * every merged prop (ref included) onto the real `<button>`, the same
 * way `@kernelui-lib/react`'s own `Button` does for any trigger. A
 * function component used as a `render` element has to do this itself;
 * `renderElement` merges `aria-haspopup`/`aria-expanded`/`onClick`/`ref`
 * onto whatever element `render` produced, but a component that doesn't
 * accept and spread props silently drops all of it.
 */
const PlusTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function PlusTrigger(props, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        style={{
          display: "grid",
          placeItems: "center",
          inlineSize: "2.5rem",
          blockSize: "2.5rem",
          borderRadius: "999px",
          border: "none",
          background: "var(--kernel-color-accent)",
          color: "var(--kernel-color-on-accent)",
          cursor: "pointer",
        }}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          width="18"
          height="18"
          style={{
            transition: "rotate var(--kernel-duration-slow) var(--kernel-ease-overshoot)",
          }}
          className="morph-plus-icon"
        >
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <style>{`
          button[aria-expanded="true"] .morph-plus-icon {
            rotate: 45deg;
          }
        `}</style>
      </button>
    );
  },
);

export default function DropdownMenuMorphDemo() {
  return (
    <DropdownMenuMorph render={<PlusTrigger />}>
      <MenuItem onSelect={() => {}}>New file</MenuItem>
      <MenuItem onSelect={() => {}}>New folder</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => {}}>Upload</MenuItem>
    </DropdownMenuMorph>
  );
}
