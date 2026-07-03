import { KernelElement, kernelClass } from "../../base";
import "./Nav.css";

/**
 * `<kernel-nav>` — a real `<nav>` landmark wrapping a real `<ul>`.
 * Compose it with `<kernel-nav-link>` for each entry.
 *
 * Attributes: `aria-label` (required — a page can have more than one
 * `<nav>`, so each needs its own accessible name), `data-orientation`
 * (`horizontal` lays the list out as a row instead of a column).
 */
export class KernelNav extends KernelElement {
  static get observedAttributes() {
    return ["aria-label", "data-orientation"];
  }

  connectedCallback() {
    if (this.native) return;
    const nav = document.createElement("nav");
    nav.className = kernelClass("Nav");
    const list = document.createElement("ul");
    list.className = kernelClass("Nav", "list");
    this.moveChildrenInto(list);
    nav.append(list);
    this.native = nav;
    this.append(nav);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "aria-label") {
      if (value === null) this.native.removeAttribute("aria-label");
      else this.native.setAttribute("aria-label", value);
    } else if (name === "data-orientation") {
      if (value === null) this.native.removeAttribute("data-orientation");
      else this.native.setAttribute("data-orientation", value);
    }
  }
}

/**
 * `<kernel-nav-link>` — set `aria-current="page"` on whichever link
 * matches the current route (Astro can compute that at build time from
 * `Astro.url.pathname`). The active style is a plain
 * `[aria-current="page"]` selector; nothing client-side has to run to
 * know which link is active.
 *
 * Renders as `<li><a></a></li>`, matching `@kernelui-lib/react`'s
 * `<NavLink>`. The outer `<kernel-nav-link>` tag itself is
 * `display: contents` (see Nav.css) so it doesn't disrupt the parent
 * `<ul>`'s flex layout — the one unavoidable structural difference
 * from the React version, which has no extra DOM node per component.
 */
export class KernelNavLink extends KernelElement {
  static get observedAttributes() {
    return ["href", "aria-current"];
  }

  connectedCallback() {
    if (this.native) return;
    const li = document.createElement("li");
    li.className = kernelClass("Nav", "item");
    const link = document.createElement("a");
    link.className = kernelClass("Nav", "link");
    this.moveChildrenInto(link);
    li.append(link);
    this.native = li;
    this.append(li);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const link = this.native?.querySelector("a");
    if (!link) return;
    if (name === "href") {
      if (value === null) link.removeAttribute("href");
      else link.href = value;
    } else if (name === "aria-current") {
      if (value === null) link.removeAttribute("aria-current");
      else link.setAttribute("aria-current", value);
    }
  }
}

customElements.define("kernel-nav", KernelNav);
customElements.define("kernel-nav-link", KernelNavLink);
