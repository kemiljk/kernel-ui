import { Avatar } from "@kernelui/react";
import { ChevronDownIcon } from "../icons";

/**
 * A static mockup, not a wired-up DropdownMenu: showcase pieces are meant
 * to demonstrate what a pattern looks like, not carry real side effects —
 * a working popover here would be one more thing on the homepage that
 * "does something" when clicked, and this is content, not a product
 * surface. The real DropdownMenu is demonstrated properly on its own
 * component page. `<span>`, not `<button>`: an unstyled native button as
 * a flex child stretches to fill the row (the previous bug here — it
 * rendered as a large grey box), and a plain span sized to its own
 * content sidesteps that without having to fight the default with
 * `align-self`.
 */
export default function AccountMenu() {
  return (
    <div className="showcase-item">
      <h3>Account menu</h3>
      <span className="showcase-row" style={{ alignSelf: "flex-start" }}>
        <Avatar fallback="KU" />
        <span>Kernel</span>
        <ChevronDownIcon width="14" height="14" />
      </span>
    </div>
  );
}
