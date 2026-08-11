import { KernelElement, kernelClass } from "../../base";
import { adoptLateChildren } from "../../utils/lateChildren";
import { StickToBottomController } from "../../utils/stickToBottom";
import "./MessageScroller.css";

const JUMP_ICON_PATH = "M8 3.25v9.5M4.25 9L8 12.75L11.75 9";

/**
 * `<kernel-message-scroller>` — a conversation viewport that follows
 * streamed output at the live edge and releases control when the reader
 * scrolls away. Same behaviour core as `@kernelui-lib/react`'s
 * `<MessageScroller>` (`utils/stickToBottom.ts`), same `role="log"` /
 * `aria-live="polite"` / focusable-viewport reasoning — read that
 * component's JSDoc for why, including why pinning is never a controlled
 * input.
 *
 * Attributes: `max-block-size` (CSS length), `default-pinned="false"` to
 * start unpinned, `threshold` (px from the bottom that still counts as
 * pinned), `jump-label` (default "Jump to latest"), `no-jump` to suppress
 * the jump control. Emits `kernel-pinned-change` with
 * `detail: { pinned: boolean }`.
 *
 * Children written between the tags are moved into the scrolled content
 * once at connect, and a `MutationObserver` relocates anything appended
 * later — a transcript that grows is the entire point, so "children are
 * adopted once" would break the common case.
 */
export class KernelMessageScroller extends KernelElement {
  private viewport: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private jump: HTMLButtonElement | null = null;
  private controller: StickToBottomController | null = null;
  private childObserver: MutationObserver | null = null;

  static get observedAttributes() {
    return ["max-block-size", "jump-label", "no-jump"];
  }

  connectedCallback() {
    if (this.native) return;

    const adopted = Array.from(this.childNodes);
    for (const node of adopted) node.parentNode?.removeChild(node);

    const root = document.createElement("div");
    root.className = kernelClass("MessageScroller");

    const viewport = document.createElement("div");
    viewport.className = kernelClass("MessageScroller", "viewport");
    viewport.setAttribute("role", "log");
    viewport.setAttribute("aria-live", "polite");
    viewport.tabIndex = 0;

    const content = document.createElement("div");
    content.className = kernelClass("MessageScroller", "content");
    content.append(...adopted);
    viewport.append(content);
    root.append(viewport);

    this.viewport = viewport;
    this.content = content;
    this.native = root;
    this.append(root);

    this.syncAllAttrs();
    this.renderJump();

    const threshold = Number(this.getAttribute("threshold"));
    this.controller = new StickToBottomController(viewport, content, {
      threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : undefined,
      pinned: this.getAttribute("default-pinned") !== "false",
      onPinnedChange: (pinned) => {
        this.syncJumpVisibility(pinned);
        this.dispatchEvent(
          new CustomEvent("kernel-pinned-change", { detail: { pinned }, bubbles: true }),
        );
      },
    });
    this.syncJumpVisibility(this.controller.pinned);

    this.childObserver = adoptLateChildren(
      this,
      () => this.content,
      (node) => node === this.native,
    );
  }

  disconnectedCallback() {
    this.controller?.destroy();
    this.controller = null;
    this.childObserver?.disconnect();
    this.childObserver = null;
  }

  /** Re-pin to the live edge from script, mirroring what the jump control
   * does — useful right after appending a message the reader sent. */
  scrollToBottom(behavior: ScrollBehavior | "instant" = "smooth") {
    this.controller?.setPinned(true, behavior);
  }

  get pinned(): boolean {
    return this.controller?.pinned ?? true;
  }

  protected syncAttr(name: string, value: string | null) {
    if (name === "max-block-size") {
      if (value === null) this.native?.style.removeProperty("max-block-size");
      else if (this.native) this.native.style.maxBlockSize = value;
      return;
    }
    if (name === "jump-label" || name === "no-jump") this.renderJump();
  }

  private renderJump() {
    if (!this.native) return;
    if (this.hasAttribute("no-jump")) {
      this.jump?.remove();
      this.jump = null;
      return;
    }

    if (!this.jump) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = kernelClass("MessageScroller", "jump");

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 16 16");
      icon.setAttribute("fill", "none");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("class", kernelClass("MessageScroller", "jumpIcon"));
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", JUMP_ICON_PATH);
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      icon.append(path);

      const label = document.createElement("span");
      label.className = kernelClass("MessageScroller", "jumpLabel");
      button.append(icon, label);
      button.addEventListener("click", () => this.scrollToBottom("smooth"));
      this.jump = button;
      this.native.append(button);
      this.syncJumpVisibility(this.pinned);
    }

    const label = this.jump.querySelector<HTMLElement>(
      `.${kernelClass("MessageScroller", "jumpLabel")}`,
    );
    if (label) label.textContent = this.getAttribute("jump-label") || "Jump to latest";
  }

  private syncJumpVisibility(pinned: boolean) {
    if (!this.jump) return;
    if (pinned) {
      this.jump.removeAttribute("data-visible");
      this.jump.setAttribute("aria-hidden", "true");
    } else {
      this.jump.setAttribute("data-visible", "");
      this.jump.removeAttribute("aria-hidden");
    }
  }
}

customElements.define("kernel-message-scroller", KernelMessageScroller);
