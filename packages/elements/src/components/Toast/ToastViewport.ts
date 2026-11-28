import { KernelElement, kernelClass } from "../../base";
import {
  dismissToast,
  getToastSnapshot,
  pauseAllToasts,
  resumeAllToasts,
  subscribeToasts,
  type ToastContent,
  type ToastRecord,
  type ToastVariant,
} from "./toastStore";
import { attachToastSwipe } from "./toastSwipe";
import "./Toast.css";

export { toast } from "./toastStore";
export type { ToastContent, ToastOptions, ToastVariant } from "./toastStore";

const icons: Partial<Record<ToastVariant, string>> = {
  success: "✓",
  warning: "!",
  danger: "✕",
};

const STACK_GAP = 8;
const MAX_COLLAPSED_DEPTH = 3;

interface TrackedToast {
  el: HTMLElement;
  measuredHeight: number;
  /** Removes the swipe engine's listeners and aborts any settle in flight. */
  detachSwipe: () => void;
}

function setContent(target: HTMLElement, content: ToastContent | undefined) {
  target.replaceChildren();
  if (content === undefined) return;
  target.append(typeof content === "string" ? document.createTextNode(content) : content);
}

/**
 * `<kernel-toast-viewport>` — mount once, anywhere (the end of the page
 * body is typical). Toasts are pushed imperatively via the exported
 * `toast()` function (also `toast.success`/`.warning`/`.danger`/
 * `.dismiss`), identical API to `@kernelui-lib/react`'s own `toast()`. Same
 * hover-to-expand stack, swipe-to-dismiss, and pause-on-hover behaviour.
 *
 * Swipe a toast toward the viewport's edge (inline-end) to dismiss it: it
 * follows the pointer that way and rubber-bands the other, and on release
 * leaves on 40% of its width *or* a flick faster than 0.5px/ms over the last
 * 100ms (Sheet's bar), otherwise easing back. The gesture never starts on a
 * control inside the toast, claims nothing until 4px of mostly-horizontal
 * travel, and fades instead of sliding under reduced motion. Same engine as
 * the React version (`toastSwipe.ts`) — see `ToastViewport` there for why.
 *
 * Built-in strings: `label-dismiss` (default "Dismiss"), or the `labels`
 * property — see `ToastLabels` in `@kernelui-lib/react`.
 */
export class KernelToastViewport extends KernelElement {
  static get observedAttributes() {
    return ["label-dismiss"];
  }

  private tracked = new Map<string, TrackedToast>();
  private expanded = false;
  private collapseTimer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: (() => void) | null = null;

  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.className = kernelClass("Toast", "viewport");
    element.addEventListener("mouseenter", () => this.expand());
    element.addEventListener("mouseleave", () => this.collapse());
    element.addEventListener("focusin", () => this.expand());
    element.addEventListener("focusout", (event) => {
      const related = (event as FocusEvent).relatedTarget as Node | null;
      if (!related || !element.contains(related)) this.collapse();
    });
    return element;
  }

  protected applyLabels() {
    this.native?.querySelectorAll(`.${kernelClass("Toast", "close")}`).forEach((button) => {
      button.setAttribute("aria-label", this.builtInLabel("dismiss", "Dismiss"));
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = subscribeToasts(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    clearTimeout(this.collapseTimer);
    for (const entry of this.tracked.values()) entry.detachSwipe();
  }

  private expand() {
    clearTimeout(this.collapseTimer);
    this.expanded = true;
    pauseAllToasts();
    this.render();
  }

  private collapse() {
    clearTimeout(this.collapseTimer);
    this.collapseTimer = setTimeout(() => {
      this.expanded = false;
      resumeAllToasts();
      this.render();
    }, 120);
  }

  private render() {
    const root = this.native;
    if (!root) return;
    const toasts = getToastSnapshot();

    if (this.expanded) root.setAttribute("data-expanded", "true");
    else root.removeAttribute("data-expanded");

    for (const [id, entry] of this.tracked) {
      if (!toasts.some((item) => item.id === id)) {
        entry.detachSwipe();
        entry.el.remove();
        this.tracked.delete(id);
      }
    }

    let cumulative = 0;
    const expandedOffsetByDepth: number[] = [];
    for (let depth = 0; depth < toasts.length; depth++) {
      expandedOffsetByDepth[depth] = cumulative;
      const item = toasts[toasts.length - 1 - depth];
      if (item && !item.closing) {
        const height = this.tracked.get(item.id)?.measuredHeight ?? 60;
        cumulative += height + STACK_GAP;
      }
    }

    toasts.forEach((item, index) => {
      const depth = Math.min(toasts.length - 1 - index, MAX_COLLAPSED_DEPTH);
      const offset = expandedOffsetByDepth[toasts.length - 1 - index] ?? 0;
      const zIndex = toasts.length - depth;
      this.renderToast(root, item, depth, offset, zIndex);
    });
  }

  private renderToast(root: HTMLElement, item: ToastRecord, depth: number, offset: number, zIndex: number) {
    let entry = this.tracked.get(item.id);
    if (!entry) {
      entry = this.buildToastElement(item);
      this.tracked.set(item.id, entry);
    }
    const { el } = entry;
    if (el.parentElement !== root) root.append(el);

    const isUrgent = item.variant === "danger" || item.variant === "warning";
    el.setAttribute("role", isUrgent ? "alert" : "status");
    el.setAttribute("data-variant", item.variant);
    el.setAttribute("data-depth", String(depth));
    if (item.closing) el.setAttribute("data-closing", "true");
    else el.removeAttribute("data-closing");

    el.style.setProperty("--offset", `${offset}px`);
    el.style.setProperty("--z-index", String(zIndex));

    const iconEl = el.querySelector<HTMLElement>(`.${kernelClass("Toast", "icon")}`);
    const glyph = icons[item.variant];
    if (glyph && !iconEl) {
      const span = document.createElement("span");
      span.className = kernelClass("Toast", "icon");
      span.setAttribute("aria-hidden", "true");
      span.textContent = glyph;
      el.insertBefore(span, el.firstChild);
    } else if (!glyph && iconEl) {
      iconEl.remove();
    } else if (glyph && iconEl) {
      iconEl.textContent = glyph;
    }

    setContent(el.querySelector(`.${kernelClass("Toast", "title")}`)!, item.title);
    const descriptionEl = el.querySelector<HTMLElement>(`.${kernelClass("Toast", "description")}`)!;
    if (item.description !== undefined) {
      descriptionEl.hidden = false;
      setContent(descriptionEl, item.description);
    } else {
      descriptionEl.hidden = true;
    }

    entry.measuredHeight = el.offsetHeight;
  }

  private buildToastElement(item: ToastRecord): TrackedToast {
    const el = document.createElement("div");
    el.className = kernelClass("Toast", "toast");

    const content = document.createElement("div");
    content.className = kernelClass("Toast", "content");

    const title = document.createElement("p");
    title.className = kernelClass("Toast", "title");

    const description = document.createElement("p");
    description.className = kernelClass("Toast", "description");

    content.append(title, description);

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", this.builtInLabel("dismiss", "Dismiss"));
    close.className = kernelClass("Toast", "close");
    close.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">' +
      '<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>';
    close.addEventListener("click", () => dismissToast(item.id));

    el.append(content, close);

    // The swipe engine owns `translate` and `data-dragging` on this element;
    // `render()` never touches either, so a re-render mid-drag (another toast
    // arriving, the stack expanding) can't reset the gesture.
    const entry: TrackedToast = {
      el,
      measuredHeight: 60,
      detachSwipe: attachToastSwipe(el, () => ({ onDismiss: () => dismissToast(item.id) })),
    };

    return entry;
  }
}

customElements.define("kernel-toast-viewport", KernelToastViewport);
