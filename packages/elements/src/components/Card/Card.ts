import { KernelElement, kernelClass } from "../../base";
import "./Card.css";

const VALID_TAGS = new Set(["div", "article", "section"]);

/**
 * `<kernel-card>` — a visual grouping. Set `as="article"` when its
 * content is genuinely self-contained and could be syndicated or
 * distributed on its own (a blog post preview, a product card); that's
 * what `<article>` actually means.
 *
 * Attributes: `as` (div/article/section, default div) — read once at
 * connect, not live-updated (changing the underlying tag after mount
 * is rare enough not to be worth the complexity in this first pass).
 * Compose with `<kernel-card-header>`, `<kernel-card-content>`,
 * `<kernel-card-footer>`, `<kernel-card-title>`,
 * `<kernel-card-description>`.
 */
export class KernelCard extends KernelElement {
  protected createNative(): HTMLElement {
    const tag = this.getAttribute("as");
    const element = document.createElement(tag && VALID_TAGS.has(tag) ? tag : "div");
    element.className = kernelClass("Card");
    return element;
  }
}

function simpleSection(tag: string, part: string) {
  return class extends KernelElement {
    protected createNative(): HTMLElement {
      const element = document.createElement(tag);
      element.className = kernelClass("Card", part);
      return element;
    }
  };
}

/** `<kernel-card-title>` — defaults to `<h3>`: a card usually sits
 * below a page or section heading, so pick whatever level is correct
 * for the actual heading outline via `level` (2-6). Read once at
 * connect, same reasoning as `<kernel-card>`'s `as`. */
export class KernelCardTitle extends KernelElement {
  protected createNative(): HTMLElement {
    const level = Number(this.getAttribute("level") ?? "3");
    const tag = level >= 2 && level <= 6 ? `h${level}` : "h3";
    const element = document.createElement(tag);
    element.className = kernelClass("Card", "title");
    return element;
  }
}

customElements.define("kernel-card", KernelCard);
customElements.define("kernel-card-header", simpleSection("div", "header"));
customElements.define("kernel-card-content", simpleSection("div", "content"));
customElements.define("kernel-card-footer", simpleSection("div", "footer"));
customElements.define("kernel-card-title", KernelCardTitle);
customElements.define("kernel-card-description", simpleSection("p", "description"));
