import { KernelElement, kernelClass } from "../../base";
import "./TagInput.css";

let tagInputCounter = 0;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `<kernel-tag-input>` — freeform text that commits into discrete tags,
 * same `role="list"` of `role="listitem"` chips + trailing `listitem`
 * input as `@kernelui-lib/react`'s `<TagInput>` (see that file for the full
 * interaction rationale: Backspace-removes-last-tag, chip remove buttons
 * excluded from the tab sequence, no autocomplete).
 *
 * `value` serializes as a comma-joined attribute string — a tag
 * containing the delimiter character itself can't round-trip through
 * that encoding, so use the `tags` property (or the `change` event's
 * `detail.tags`) instead when that matters.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `value` (comma-joined),
 * `delimiters` (comma-joined, default `","`), `max`, `allow-duplicates`
 * (boolean), `description`, `error-message`, `no-label-offset` (boolean —
 * hard-aligns the label, description, and error text flush left instead
 * of the default inset that lines them up with the input's own text
 * padding), `invalid`, `disabled`, `name`.
 */
export class KernelTagInput extends KernelElement {
  private readonly generatedId = `kernel-tag-input-${++tagInputCounter}`;
  private currentTags: string[] = [];

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "value",
      "delimiters",
      "max",
      "allow-duplicates",
      "description",
      "error-message",
      "no-label-offset",
      "invalid",
      "disabled",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("TagInput");

    const id = this.getAttribute("id") || this.generatedId;
    const labelId = `${id}-label`;

    const label = document.createElement("label");
    label.className = kernelClass("TagInput", "label");
    label.id = labelId;
    label.htmlFor = id;

    const field = document.createElement("div");
    field.className = kernelClass("TagInput", "field");
    field.setAttribute("role", "list");
    field.setAttribute("aria-labelledby", labelId);
    field.addEventListener("click", (event) => {
      if (event.target === field) this.input?.focus();
    });

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.setAttribute("role", "listitem");
    input.className = kernelClass("TagInput", "input");

    input.addEventListener("input", () => {
      const delimiterRegex = this.delimiterRegex;
      const next = input.value;
      if (delimiterRegex.test(next)) {
        const parts = next.split(delimiterRegex);
        const trailing = parts.pop() ?? "";
        for (const part of parts) this.commitDraft(part);
        input.value = trailing;
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.commitDraft(input.value);
        input.value = "";
      } else if (event.key === "Backspace" && input.value === "" && this.currentTags.length > 0) {
        this.removeTagAt(this.currentTags.length - 1);
      }
    });
    input.addEventListener("paste", (event) => {
      const text = event.clipboardData?.getData("text");
      if (!text) return;
      event.preventDefault();
      const splitRegex = new RegExp(`${this.delimiterPattern}|\\r?\\n`);
      for (const part of text.split(splitRegex)) this.commitDraft(part);
    });

    field.append(input);
    root.append(label, field);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
  }

  /** Exact, delimiter-safe access — see the class doc comment for why the
   * `value` attribute alone can't always round-trip a tag list. */
  get tags(): string[] {
    return [...this.currentTags];
  }

  set tags(next: string[]) {
    this.currentTags = [...next];
    this.renderTags();
    this.setAttribute("value", this.currentTags.join(this.delimiters[0] ?? ","));
  }

  private get delimiters(): string[] {
    const raw = this.getAttribute("delimiters");
    return (raw ? raw.split(",") : [","]).filter(Boolean);
  }

  private get delimiterPattern(): string {
    return this.delimiters.map(escapeRegExp).join("|");
  }

  private get delimiterRegex(): RegExp {
    return new RegExp(this.delimiterPattern);
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector(`.${kernelClass("TagInput", "input")}`) ?? null;
  }

  private get field(): HTMLElement | null {
    return this.native?.querySelector(`.${kernelClass("TagInput", "field")}`) ?? null;
  }

  private commitDraft(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (raw !== "") this.emitError({ type: "empty", value: raw });
      return;
    }
    const allowDuplicates = this.hasAttribute("allow-duplicates");
    if (!allowDuplicates && this.currentTags.includes(trimmed)) {
      this.emitError({ type: "duplicate", value: trimmed });
      return;
    }
    const max = this.getAttribute("max");
    if (max != null && this.currentTags.length >= Number(max)) {
      this.emitError({ type: "max", value: trimmed });
      return;
    }
    this.currentTags = [...this.currentTags, trimmed];
    this.renderTags();
    this.setAttribute("value", this.currentTags.join(this.delimiters[0] ?? ","));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { tags: this.tags } }));
  }

  private removeTagAt(index: number) {
    this.currentTags = this.currentTags.filter((_, i) => i !== index);
    this.renderTags();
    this.setAttribute("value", this.currentTags.join(this.delimiters[0] ?? ","));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { tags: this.tags } }));
    this.input?.focus();
  }

  private emitError(error: { type: "duplicate" | "max" | "empty"; value: string }) {
    this.dispatchEvent(new CustomEvent("kernel-tag-input-error", { detail: error }));
  }

  private updateDescribedBy() {
    const input = this.input;
    if (!input) return;
    const id = input.id;
    const invalid = this.hasAttribute("invalid");
    const hasError = invalid && this.hasAttribute("error-message");
    const ids = [
      hasError ? `${id}-error` : null,
      this.hasAttribute("description") ? `${id}-description` : null,
    ].filter(Boolean);
    if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
    else input.removeAttribute("aria-describedby");
    this.renderHint();
  }

  private renderHint() {
    const root = this.native;
    const input = this.input;
    if (!root || !input) return;
    root.querySelector(`.${kernelClass("TagInput", "description")}`)?.remove();
    root.querySelector(`.${kernelClass("TagInput", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    const description = this.getAttribute("description");

    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("TagInput", "error");
      p.id = `${input.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.append(p);
    } else if (description) {
      const p = document.createElement("p");
      p.className = kernelClass("TagInput", "description");
      p.id = `${input.id}-description`;
      p.textContent = description;
      root.append(p);
    }
  }

  private renderTags() {
    const field = this.field;
    const input = this.input;
    if (!field || !input) return;
    field.querySelectorAll(`.${kernelClass("TagInput", "tag")}`).forEach((node) => node.remove());

    this.currentTags.forEach((tag, index) => {
      const chip = document.createElement("span");
      chip.className = kernelClass("TagInput", "tag");
      chip.setAttribute("role", "listitem");

      const text = document.createElement("span");
      text.textContent = tag;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = kernelClass("TagInput", "tagRemove");
      remove.tabIndex = -1;
      remove.setAttribute("aria-label", `Remove ${tag}`);
      remove.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="12" height="12"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>';
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        this.removeTagAt(index);
      });

      chip.append(text, remove);
      field.insertBefore(chip, input);
    });

    const max = this.getAttribute("max");
    input.disabled =
      this.hasAttribute("disabled") || (max != null && this.currentTags.length >= Number(max));
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;

    switch (name) {
      case "label": {
        const labelEl = this.native.querySelector(`.${kernelClass("TagInput", "label")}`);
        if (labelEl) labelEl.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const labelEl = this.native.querySelector(`.${kernelClass("TagInput", "label")}`);
        labelEl?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "value": {
        const delimiterRegex = this.delimiterRegex;
        this.currentTags = value ? value.split(delimiterRegex).filter(Boolean) : [];
        this.renderTags();
        break;
      }
      case "disabled":
        if (this.input) this.input.disabled = value !== null;
        break;
      case "invalid":
        if (this.native) {
          if (value !== null) this.native.setAttribute("data-invalid", "");
          else this.native.removeAttribute("data-invalid");
        }
        this.updateDescribedBy();
        break;
      case "description":
      case "error-message":
        this.updateDescribedBy();
        break;
      case "no-label-offset":
        if (value !== null) this.native.setAttribute("data-label-offset", "false");
        else this.native.removeAttribute("data-label-offset");
        break;
      case "name":
        if (this.input) {
          if (value === null) this.input.removeAttribute("name");
          else this.input.name = value;
        }
        break;
    }
  }
}

customElements.define("kernel-tag-input", KernelTagInput);
