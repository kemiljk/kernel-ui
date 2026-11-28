import { FORWARDED_ARIA_ATTRIBUTES, type ForwardedAriaAttribute, KernelElement, kernelClass } from "../../base";
import "./Progress.css";

/**
 * `<kernel-progress>` — a real `<progress>`. It's an "indeterminate"
 * spinner for free when `value` is omitted, and it reports its own
 * value to assistive tech without any `role="progressbar"`/
 * `aria-valuenow` bookkeeping.
 *
 * Attributes: `value`, `max` (default 100), `label` (sets
 * `aria-label`). `aria-label`, `aria-labelledby` and `aria-describedby`
 * on the host are forwarded to the `<progress>`; a host `aria-label`
 * wins over `label`.
 */
export class KernelProgress extends KernelElement {
  static get observedAttributes() {
    return [...FORWARDED_ARIA_ATTRIBUTES, "value", "max", "label"];
  }

  protected ariaTarget() {
    return this.native;
  }

  protected createNative(): HTMLElement {
    const progress = document.createElement("progress");
    progress.dataset.kernelMotion = "essential";
    progress.className = kernelClass("Progress");
    progress.max = 100;
    return progress;
  }

  protected syncAttr(name: string, value: string | null) {
    const progress = this.native as HTMLProgressElement | null;
    if (!progress) return;
    switch (name) {
      case "value":
        // Omitting `value` entirely (not just setting it to 0) is what
        // keeps <progress> indeterminate — removing the attribute, not
        // assigning progress.value = 0, is the only way to get that.
        if (value === null) progress.removeAttribute("value");
        else progress.value = Number(value);
        break;
      case "max":
        progress.max = value === null ? 100 : Number(value);
        break;
      case "label":
        this.syncLabel();
        break;
    }
  }

  protected forwardAria(name: ForwardedAriaAttribute, value: string | null) {
    if (name === "aria-label") this.syncLabel();
    else super.forwardAria(name, value);
  }

  private syncLabel() {
    const label = this.getAttribute("aria-label") ?? this.getAttribute("label");
    if (label === null) this.native?.removeAttribute("aria-label");
    else this.native?.setAttribute("aria-label", label);
  }
}

customElements.define("kernel-progress", KernelProgress);
