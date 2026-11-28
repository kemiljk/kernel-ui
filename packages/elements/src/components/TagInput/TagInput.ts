import { KernelElement, kernelClass } from "../../base";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import "../Badge/Badge.css";
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
 * `change` is dispatched before the tags change, cancelable, with
 * `detail: { tags, reason }` — `"enter"`, `"separator"`, `"paste"`,
 * `"remove-button"` or `"backspace"`. `preventDefault()` keeps the tags as
 * they were: an added tag stays in the draft, and a removal (reported once
 * the chip's exit transition has played) brings the chip back. A paste or
 * typed separator that adds several tags is a single `change` with all of
 * them, as in React.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `value` (comma-joined),
 * `delimiters` (comma-joined, default `","`), `max`, `allow-duplicates`
 * (boolean), `description`, `error-message`, `no-label-offset` (boolean —
 * hard-aligns the label, description, and error text flush left instead
 * of the default inset that lines them up with the input's own text
 * padding), `invalid`, `disabled`, `name`, `label-remove-tag` (template,
 * default `"Remove {tag}"`; or the `labels` property's `removeTag`).
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
      "label-remove-tag",
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

    input.addEventListener("input", (event) => {
      const delimiterRegex = this.delimiterRegex;
      const next = input.value;
      if (delimiterRegex.test(next)) {
        const parts = next.split(delimiterRegex);
        const trailing = parts.pop() ?? "";
        // One change for the whole batch, as in React; a veto keeps the
        // typed text (minus the delimiter) as the draft.
        input.value = this.commitParts(parts, "separator", event)
          ? trailing
          : next.replace(delimiterRegex, "");
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (this.commitDraft(input.value, "enter", event)) input.value = "";
      } else if (event.key === "Backspace" && input.value === "" && this.currentTags.length > 0) {
        this.removeTag(this.currentTags[this.currentTags.length - 1]!, "backspace", event);
      }
    });
    input.addEventListener("paste", (event) => {
      const text = event.clipboardData?.getData("text");
      if (!text) return;
      event.preventDefault();
      const splitRegex = new RegExp(`${this.delimiterPattern}|\\r?\\n`);
      // One change for every pasted part; a vetoed paste leaves the draft be.
      if (this.commitParts(text.split(splitRegex), "paste", event)) input.value = "";
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

  /** Returns `false` only when a `change` listener vetoed the tag, so the
   * caller can keep it in the draft; rejected input (empty, duplicate,
   * over `max`) reports through the error event and returns `true`, as
   * before. */
  private commitDraft(raw: string, reason: "enter", event?: Event): boolean {
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (raw !== "") this.emitError({ type: "empty", value: raw });
      return true;
    }
    const allowDuplicates = this.hasAttribute("allow-duplicates");
    if (!allowDuplicates && this.currentTags.includes(trimmed)) {
      this.emitError({ type: "duplicate", value: trimmed });
      return true;
    }
    const max = this.getAttribute("max");
    if (max != null && this.currentTags.length >= Number(max)) {
      this.emitError({ type: "max", value: trimmed });
      return true;
    }
    const next = [...this.currentTags, trimmed];
    if (!this.emitChange("change", { tags: next }, reason, event)) return false;
    this.currentTags = next;
    this.renderTags();
    this.setAttribute("value", this.currentTags.join(this.delimiters[0] ?? ","));
    return true;
  }

  /**
   * Several parts at once (a paste, or a typed delimiter splitting the
   * draft): each part is validated against the tags accumulated so far,
   * but the result goes out as *one* cancelable `change`, the way React's
   * `TagInput` batches it. Returns `false` only when a listener vetoed it.
   */
  private commitParts(parts: string[], reason: "separator" | "paste", event?: Event): boolean {
    const allowDuplicates = this.hasAttribute("allow-duplicates");
    const maxAttr = this.getAttribute("max");
    const max = maxAttr != null ? Number(maxAttr) : null;
    let next = this.currentTags;
    for (const raw of parts) {
      const trimmed = raw.trim();
      if (trimmed === "") {
        if (raw !== "") this.emitError({ type: "empty", value: raw });
        continue;
      }
      if (!allowDuplicates && next.includes(trimmed)) {
        this.emitError({ type: "duplicate", value: trimmed });
        continue;
      }
      if (max != null && next.length >= max) {
        this.emitError({ type: "max", value: trimmed });
        continue;
      }
      next = [...next, trimmed];
    }
    if (next === this.currentTags) return true;
    if (!this.emitChange("change", { tags: [...next] }, reason, event)) return false;
    this.currentTags = next;
    this.renderTags();
    this.setAttribute("value", this.currentTags.join(this.delimiters[0] ?? ","));
    return true;
  }

  /**
   * Dissolve-then-remove, not instant: a tag's chip stays in the DOM
   * through its own exit transition (see `TagInput.css`'s matching
   * comment), so removal reads as the chip fading away rather than the
   * row snapping shorter. `renderTags()` unconditionally wipes and
   * rebuilds every chip, so this is deliberately NOT called until the
   * transition finishes — the other tags' chip nodes stay untouched in
   * the meantime, only this one gets `data-removing` set directly.
   *
   * Keyed by the tag's own string value, not index: two removals can
   * be in flight at once (a user clicking two remove buttons before
   * the first one's timer fires), and by the time the first one's
   * deferred filter runs, `currentTags` has already shortened — a
   * captured index would then point at the wrong tag for whichever
   * removal resolves second.
   */
  private removeTag(tag: string, reason: "remove-button" | "backspace", event?: Event) {
    this.input?.focus();
    const chip = this.field?.querySelector<HTMLElement>(
      `.${kernelClass("TagInput", "tag")}[data-tag="${CSS.escape(tag)}"]`,
    );
    const finish = () => {
      const next = this.currentTags.filter((t) => t !== tag);
      // The event may be long gone after a transition; the reason travels.
      if (!this.emitChange("change", { tags: next }, reason, event)) {
        chip?.removeAttribute("data-removing");
        return;
      }
      this.currentTags = next;
      this.renderTags();
      this.setAttribute("value", this.currentTags.join(this.delimiters[0] ?? ","));
    };
    if (!chip || prefersReducedMotion()) {
      finish();
      return;
    }
    chip.setAttribute("data-removing", "true");
    void waitForExitTransition(chip).then(finish);
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

  protected applyLabels() {
    this.native?.querySelectorAll<HTMLElement>("[data-tag]").forEach((chip) => {
      const tag = chip.dataset.tag ?? "";
      chip.querySelector("button")?.setAttribute("aria-label", this.builtInLabel("removeTag", "Remove {tag}", { tag }));
    });
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

    this.currentTags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = `${kernelClass("Badge")} ${kernelClass("TagInput", "tag")}`;
      chip.dataset.variant = "neutral";
      chip.dataset.iconEnd = "true";
      chip.setAttribute("role", "listitem");
      // Lets removeTag() find this exact chip by value later, the same
      // stable identity React's version keys its chips on.
      chip.dataset.tag = tag;

      const text = document.createElement("span");
      text.textContent = tag;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = kernelClass("TagInput", "tagRemove");
      remove.dataset.icon = "true";
      remove.tabIndex = -1;
      remove.setAttribute("aria-label", this.builtInLabel("removeTag", "Remove {tag}", { tag }));
      remove.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="12" height="12"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>';
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        this.removeTag(tag, "remove-button", event);
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
          if (value !== null) this.native.setAttribute("data-invalid", "true");
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
