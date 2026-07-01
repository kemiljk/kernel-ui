import { useState } from "react";
import { Button, Dialog, Nav, NavLink } from "@kernelui/react";

interface MobileNavProps {
  items: { href: string; label: string }[];
  currentPath: string;
}

/**
 * Below 900px, `.docs-sidebar-slot` (the real Sidebar) is hidden by CSS
 * rather than left to stack above the content the way `.docs-shell`'s
 * grid collapse alone would leave it: a ~30-link vertical nav sitting
 * above the page pushes whatever the visitor actually came to look at
 * off the first screen. This is the mobile replacement: a single
 * trigger that opens the same links in a Dialog, the same pattern
 * shadcn/ui, Base UI, and Radix's own docs sites all use.
 */
export default function MobileNav({ items, currentPath }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mobile-nav-trigger"
        onClick={() => setOpen(true)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Components
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Components">
        <Nav aria-label="Components">
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              aria-current={currentPath === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </Nav>
      </Dialog>
    </>
  );
}
