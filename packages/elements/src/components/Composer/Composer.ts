import { KernelElement, kernelClass } from "../../base";
import "./Composer.css";

let composerCounter = 0;

/**
 * `<kernel-composer>` — a chat message input: a real `<textarea>`
 * growing with `field-sizing: content` (same mechanism as
 * `<kernel-textarea>`), plus leading/trailing action rows for
 * attachments, model pickers, a send button, etc.
 *
 * Attributes: `value`, `placeholder`, `disabled`, `thinking` (shows the
 * animated border sweep and blocks submission — the same "actively
 * working" language most AI products use), `submit-on`
 * (`mod+enter` default | `enter`).
 *
 * Light-DOM children tagged `slot="leading"` / `slot="trailing"` (no
 * real shadow DOM here, so this is a plain attribute convention, not
 * the native `<slot>` mechanism) are moved into the matching action
 * row once, at connect.
 *
 * Events: native `input` bubbles from the textarea as usual. A
 * `submit` `CustomEvent` (`event.detail.value`) fires when Enter (per
 * `submit-on`) is pressed with a non-empty, non-disabled, non-thinking
 * value — the textarea is cleared automatically afterward. A trailing
 * send button can trigger the same path by calling the element's own
 * public `submit()` method from its click handler.
 */
export class KernelComposer extends KernelElement {
  private readonly generatedId = `kernel-composer-${++composerCounter}`;

  static get observedAttributes() {
    return ["value", "placeholder", "disabled", "thinking", "id"];
  }

  private get textarea(): HTMLTextAreaElement | null {
    return this.native?.querySelector("textarea") ?? null;
  }

  connectedCallback() {
    if (this.native) return;

    const leading: Element[] = [];
    const trailing: Element[] = [];
    const rest: Node[] = [];
    for (const child of Array.from(this.childNodes)) {
      if (child instanceof Element && child.getAttribute("slot") === "leading") leading.push(child);
      else if (child instanceof Element && child.getAttribute("slot") === "trailing") trailing.push(child);
      else rest.push(child);
    }
    for (const node of rest) node.parentNode?.removeChild(node);

    const root = document.createElement("div");
    root.className = kernelClass("Composer");

    const textarea = document.createElement("textarea");
    textarea.id = this.getAttribute("id") || this.generatedId;
    textarea.className = kernelClass("Composer", "input");
    textarea.addEventListener("keydown", (event) => this.handleKeyDown(event));

    root.append(textarea);

    if (leading.length || trailing.length) {
      const actions = document.createElement("div");
      actions.className = kernelClass("Composer", "actions");

      const leadingRow = document.createElement("div");
      leadingRow.className = kernelClass("Composer", "actionsLeading");
      leadingRow.append(...leading);

      const trailingRow = document.createElement("div");
      trailingRow.className = kernelClass("Composer", "actionsTrailing");
      trailingRow.append(...trailing);

      actions.append(leadingRow, trailingRow);
      root.append(actions);
    }

    this.native = root;
    this.append(root);
    this.syncAllAttrs();
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    const mod = event.metaKey || event.ctrlKey;
    const submitOn = this.getAttribute("submit-on") === "enter" ? "enter" : "mod+enter";
    if (submitOn === "mod+enter" && mod) {
      event.preventDefault();
      this.submit();
    } else if (submitOn === "enter" && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  /** Submits the current value, same guards (non-empty, not disabled,
   * not thinking) and clearing behaviour as pressing Enter — public so
   * a trailing send button (a plain `slot="trailing"` child) can call
   * `composerEl.submit()` from its own click handler. */
  submit() {
    const textarea = this.textarea;
    if (!textarea) return;
    const trimmed = textarea.value.trim();
    if (!trimmed || this.hasAttribute("disabled") || this.hasAttribute("thinking")) return;
    this.dispatchEvent(new CustomEvent("submit", { detail: { value: textarea.value }, bubbles: true }));
    textarea.value = "";
    this.setAttribute("value", "");
  }

  protected syncAttr(name: string, value: string | null) {
    const textarea = this.textarea;
    const root = this.native;
    if (!textarea || !root) return;

    switch (name) {
      case "value":
        if (textarea.value !== (value ?? "")) textarea.value = value ?? "";
        break;
      case "placeholder":
        textarea.placeholder = value ?? "";
        textarea.setAttribute("aria-label", value || "Message");
        break;
      case "disabled":
        textarea.disabled = value !== null;
        if (value !== null) root.setAttribute("data-disabled", "");
        else root.removeAttribute("data-disabled");
        break;
      case "thinking":
        if (value !== null) root.setAttribute("data-thinking", "");
        else root.removeAttribute("data-thinking");
        break;
      case "id":
        textarea.id = value || this.generatedId;
        break;
    }
  }
}

customElements.define("kernel-composer", KernelComposer);
