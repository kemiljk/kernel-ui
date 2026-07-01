import { KernelElement, kernelClass } from "../../base";
import "./Progress.css";

/**
 * `<kernel-progress>` — a real `<progress>`. It's an "indeterminate"
 * spinner for free when `value` is omitted, and it reports its own
 * value to assistive tech without any `role="progressbar"`/
 * `aria-valuenow` bookkeeping.
 *
 * Attributes: `value`, `max` (default 100), `label` (sets
 * `aria-label`).
 */
export class KernelProgress extends KernelElement {
  static get observedAttributes() {
    return ["value", "max", "label"];
  }

  protected createNative(): HTMLElement {
    const progress = document.createElement("progress");
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
        if (value === null) progress.removeAttribute("aria-label");
        else progress.setAttribute("aria-label", value);
        break;
    }
  }
}

customElements.define("kernel-progress", KernelProgress);
