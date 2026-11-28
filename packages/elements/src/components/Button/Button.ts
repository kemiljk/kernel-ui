import { KernelElement, kernelClass } from "../../base";
import "./Button.css";

const ICON_SELECTOR = "svg, img, picture, [data-icon]";

/**
 * `<kernel-button>` — a real `<button>`. Renders as one by default
 * because that's the only element that gets click, keyboard
 * (Space/Enter), focus, and form association for free from the
 * browser. Mirrors `@kernelui-lib/react`'s `<Button>`.
 *
 * Attributes: `variant` (primary/secondary/ghost/danger, default
 * secondary), `size` (sm/md/lg, default md), `disabled`, `loading`
 * (boolean attributes), `type` (button/submit/reset, default button).
 *
 * Icons: put an `svg` or `img` (or any `data-icon` element) first or
 * last among the children and it moves into an icon slot, the same as
 * React's `iconStart`/`iconEnd`. A lone icon makes an icon-only button,
 * square or (at Round) circular, with the icon concentric. Label an
 * icon-only button with `aria-label` on `<kernel-button>`; it's
 * forwarded to the real `<button>`.
 */
export class KernelButton extends KernelElement {
  static get observedAttributes() {
    return ["variant", "size", "disabled", "loading", "type", "aria-label"];
  }

  connectedCallback() {
    if (this.native) return;
    const button = document.createElement("button");
    button.className = kernelClass("Button");
    button.setAttribute("data-slot", "button");

    const label = document.createElement("span");
    label.className = kernelClass("Button", "label");
    this.moveChildrenInto(label);

    const meaningful = () =>
      [...label.childNodes].filter((node) =>
        node.nodeType === Node.ELEMENT_NODE
          ? true
          : node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
      );
    const isIcon = (node: Node | undefined): node is Element =>
      node instanceof Element && node.matches(ICON_SELECTOR) && node.getAttribute("data-icon") !== "false";
    const slot = (icon: Element) => {
      const wrapper = document.createElement("span");
      wrapper.className = kernelClass("Button", "icon");
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.append(icon);
      return wrapper;
    };

    const first = meaningful()[0];
    const start = isIcon(first) ? slot(first) : null;
    const last = meaningful().at(-1);
    const end = isIcon(last) ? slot(last) : null;
    const hasLabel = meaningful().length > 0;

    if (start) button.append(start);
    if (hasLabel) button.append(label);
    if (end) button.append(end);
    if (start || (end && !hasLabel)) button.dataset.iconStart = "true";
    if (end || (start && !hasLabel)) button.dataset.iconEnd = "true";

    this.native = button;
    this.append(button);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native as HTMLButtonElement | null;
    if (!button) return;
    switch (name) {
      case "variant":
        button.dataset.variant = value ?? "secondary";
        break;
      case "size":
        button.dataset.size = value ?? "md";
        break;
      case "aria-label":
        if (value === null) button.removeAttribute("aria-label");
        else button.setAttribute("aria-label", value);
        break;
      case "type":
        button.type = (value as "button" | "submit" | "reset" | null) ?? "button";
        break;
      case "disabled":
      case "loading":
        this.syncDisabledAndLoading(button);
        break;
    }
  }

  private syncDisabledAndLoading(button: HTMLButtonElement) {
    const loading = this.hasAttribute("loading");
    const disabled = this.hasAttribute("disabled") || loading;
    button.disabled = disabled;
    button.dataset.loading = loading ? "true" : "false";
    if (loading) {
      button.setAttribute("aria-busy", "true");
      if (!button.querySelector(`.${kernelClass("Button", "spinner")}`)) {
        const spinner = document.createElement("span");
        spinner.className = kernelClass("Button", "spinner");
        spinner.setAttribute("aria-hidden", "true");
        button.append(spinner);
      }
    } else {
      button.removeAttribute("aria-busy");
      button.querySelector(`.${kernelClass("Button", "spinner")}`)?.remove();
    }
  }
}

customElements.define("kernel-button", KernelButton);
