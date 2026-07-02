import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner } from "../../utils/floatingPosition";
import "./NavigationMenu.css";

let navMenuCounter = 0;

/** `<kernel-navigation-menu>` — a real `<nav>` landmark wrapping a real
 * `<ul>`, same semantic base as `<kernel-nav>`. Each top-level entry is
 * a `<kernel-nav-menu-item>`, either a plain link or a trigger that
 * opens a mega-menu panel. Attributes: `aria-label` (required). */
export class KernelNavigationMenu extends KernelElement {
  static get observedAttributes() {
    return ["aria-label"];
  }

  connectedCallback() {
    if (this.native) return;
    const nav = document.createElement("nav");
    nav.className = kernelClass("NavigationMenu", "root");
    const list = document.createElement("ul");
    list.className = kernelClass("NavigationMenu", "list");
    this.moveChildrenInto(list);
    nav.append(list);
    this.native = nav;
    this.append(nav);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "aria-label" || !this.native) return;
    if (value === null) this.native.removeAttribute("aria-label");
    else this.native.setAttribute("aria-label", value);
  }
}

/** `<kernel-nav-menu-item>` — wraps one top-level entry (an `<li>`).
 * Contains either a `<kernel-nav-menu-link>` or a
 * `<kernel-nav-menu-trigger>` + `<kernel-nav-menu-content>` pair. */
export class KernelNavMenuItem extends KernelElement {
  protected createNative(): HTMLElement {
    const li = document.createElement("li");
    li.className = kernelClass("NavigationMenu", "item");
    return li;
  }
}

/** `<kernel-nav-menu-link>` — a plain link, for items with no submenu.
 * Attributes: `href`, `aria-current`. */
export class KernelNavMenuLink extends KernelElement {
  static get observedAttributes() {
    return ["href", "aria-current"];
  }

  protected createNative(): HTMLElement {
    const a = document.createElement("a");
    a.className = kernelClass("NavigationMenu", "link");
    return a;
  }

  protected syncAttr(name: string, value: string | null) {
    const a = this.native as HTMLAnchorElement | null;
    if (!a) return;
    if (value === null) a.removeAttribute(name);
    else a.setAttribute(name, value);
  }
}

const CHEVRON_PATH = "M4 6L8 10L12 6";

/** `<kernel-nav-menu-trigger>` — the clickable label for an item with a
 * submenu. Opens its sibling `<kernel-nav-menu-content>` via
 * `popovertarget`, click-based (not hover-only) so it behaves the same
 * on touch. Must be a child of the same `<kernel-nav-menu-item>` as
 * its content. */
export class KernelNavMenuTrigger extends KernelElement {
  private readonly positioner = new FloatingPositioner();

  protected createNative(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("NavigationMenu", "trigger");
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 16 16");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("aria-hidden", "true");
    chevron.setAttribute("class", kernelClass("NavigationMenu", "chevron"));
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", CHEVRON_PATH);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.75");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    chevron.append(path);

    const label = document.createElement("span");
    this.moveChildrenInto(label);
    button.append(label, chevron);
    return button;
  }

  connectedCallback() {
    super.connectedCallback();
    // Deferred: the sibling <kernel-nav-menu-content> may not have
    // upgraded/built its native <div> yet if the whole subtree upgrades
    // in one synchronous batch (parent-before-children document order —
    // see the identical note in Tabs.ts).
    queueMicrotask(() => this.wireToContent());
  }

  private wireToContent() {
    const item = this.closest("kernel-nav-menu-item");
    const content = item?.querySelector("kernel-nav-menu-content") ?? null;
    const contentNative = content?.querySelector(`.${kernelClass("NavigationMenu", "content")}`) as HTMLElement | null;
    const button = this.native as HTMLButtonElement | null;
    if (!button || !contentNative) return;

    button.setAttribute("popovertarget", contentNative.id);
    this.positioner.attach(button, contentNative, { placement: "bottom" });

    contentNative.addEventListener("toggle", (event) => {
      const open = (event as ToggleEvent).newState === "open";
      button.setAttribute("aria-expanded", String(open));
      this.positioner.setOpen(open);
    });
  }
}

let navMenuContentCounter = 0;

/** `<kernel-nav-menu-content>` — the mega-menu panel for an item,
 * arbitrary content, shown/hidden via the same `popover="auto"`
 * mechanism `<kernel-dropdown-menu>`'s content uses. */
export class KernelNavMenuContent extends KernelElement {
  protected createNative(): HTMLElement {
    const div = document.createElement("div");
    div.id = `kernel-nav-menu-content-${++navMenuContentCounter}-${++navMenuCounter}`;
    div.setAttribute("popover", "auto");
    div.className = kernelClass("NavigationMenu", "content");
    return div;
  }
}

customElements.define("kernel-navigation-menu", KernelNavigationMenu);
customElements.define("kernel-nav-menu-item", KernelNavMenuItem);
customElements.define("kernel-nav-menu-link", KernelNavMenuLink);
customElements.define("kernel-nav-menu-trigger", KernelNavMenuTrigger);
customElements.define("kernel-nav-menu-content", KernelNavMenuContent);
