import { KernelElement, kernelClass } from "../../base";
import "./Skeleton.css";

/**
 * `<kernel-skeleton>` — a loading placeholder. `aria-hidden` is what
 * makes this correct: there's no content here yet, so assistive tech
 * should skip it entirely rather than announce an empty, decorative
 * box. Size it with your own CSS to match the real content it stands
 * in for.
 */
export class KernelSkeleton extends KernelElement {
  protected createNative(): HTMLElement {
    const div = document.createElement("div");
    div.className = kernelClass("Skeleton");
    div.setAttribute("aria-hidden", "true");
    return div;
  }
}

customElements.define("kernel-skeleton", KernelSkeleton);
