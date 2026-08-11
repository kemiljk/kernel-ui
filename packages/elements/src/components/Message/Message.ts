import { KernelElement, kernelClass } from "../../base";
import { DetailsPanelAnimator } from "../../utils/detailsTransition";
import { adoptLateChildren } from "../../utils/lateChildren";
import "./Message.css";

const CHEVRON_PATH = "M4 6L8 10L12 6";

/**
 * `<kernel-message-list>` — a conversation transcript as a real
 * `<ol role="list">`. Chat messages are ordered, and `<ol>` is what
 * encodes that; see `@kernelui-lib/react`'s `<MessageList>` for the full
 * reasoning.
 *
 * Attributes: `label` (accessible name, default "Conversation").
 */
export class KernelMessageList extends KernelElement {
  private childObserver: MutationObserver | null = null;

  static get observedAttributes() {
    return ["label"];
  }

  connectedCallback() {
    super.connectedCallback();
    // A transcript grows; messages appended after connect have to end up
    // inside the <ol>, not beside it.
    this.childObserver ??= adoptLateChildren(
      this,
      () => this.native,
      (node) => node === this.native,
    );
  }

  disconnectedCallback() {
    this.childObserver?.disconnect();
    this.childObserver = null;
  }

  protected createNative(): HTMLElement {
    const list = document.createElement("ol");
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", "Conversation");
    list.className = kernelClass("Message", "list");
    return list;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "label") this.native.setAttribute("aria-label", value || "Conversation");
  }
}

/**
 * `<kernel-message>` — one row of a conversation: a real `<li>` wrapping an
 * `<article>`, matching `@kernelui-lib/react`'s `<Message>` (read its JSDoc
 * for why `<article>`, and why the avatar is `aria-hidden`).
 *
 * The host is `display: contents` so its `<li>` is a direct child of the
 * parent `<ol>` — custom elements can't *be* `<li>`, and a wrapper element
 * between them would break the list's content model and its announced item
 * count. Same trick as `<kernel-suggestion-item>`.
 *
 * Attributes: `author` ("user" | "assistant" | "system", default
 * "assistant"), `name`, `metadata`, `grouped`, `live`, `no-animate` to
 * suppress the one-shot enter animation.
 *
 * An avatar is a child marked `data-slot="avatar"`; everything else becomes
 * the message body.
 */
export class KernelMessage extends KernelElement {
  private article: HTMLElement | null = null;
  private avatarBox: HTMLElement | null = null;
  private headerBox: HTMLElement | null = null;
  private footerBox: HTMLElement | null = null;

  static get observedAttributes() {
    return ["author", "name", "metadata", "grouped", "live", "no-animate"];
  }

  connectedCallback() {
    if (this.native) return;
    this.style.display = "contents";

    const adopted = Array.from(this.childNodes);
    for (const node of adopted) node.parentNode?.removeChild(node);
    const avatarContent = adopted.filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.slot === "avatar",
    );
    const bodyContent = adopted.filter((node) => !avatarContent.includes(node as HTMLElement));

    const item = document.createElement("li");
    item.className = kernelClass("Message", "item");

    const avatarBox = document.createElement("span");
    avatarBox.className = kernelClass("Message", "avatar");
    avatarBox.setAttribute("aria-hidden", "true");
    avatarBox.append(...avatarContent);

    const article = document.createElement("article");
    article.className = kernelClass("Message", "body");

    const header = document.createElement("header");
    header.className = kernelClass("Message", "header");

    const footer = document.createElement("footer");
    footer.className = kernelClass("Message", "metadata");

    article.append(header, ...bodyContent, footer);
    // Appended unconditionally, same as the React component: a grouped row
    // must reserve the column it draws nothing in, and an avatar-less
    // transcript collapses the empty box via `:empty` in CSS.
    item.append(avatarBox, article);

    this.avatarBox = avatarBox;
    this.article = article;
    this.headerBox = header;
    this.footerBox = footer;
    this.native = item;
    this.append(item);

    if (!this.hasAttribute("author")) item.dataset.author = "assistant";
    if (!this.hasAttribute("no-animate")) item.dataset.animate = "true";
    this.syncAllAttrs();
    this.renderHeader();
    this.renderFooter();
  }

  protected syncAttr(name: string, value: string | null) {
    const item = this.native;
    if (!item) return;

    if (name === "author") {
      item.dataset.author = value || "assistant";
      this.article?.setAttribute("aria-label", this.getAttribute("name") || item.dataset.author);
      return;
    }
    if (name === "name") {
      this.article?.setAttribute("aria-label", value || this.getAttribute("author") || "assistant");
      this.renderHeader();
      return;
    }
    if (name === "metadata") {
      this.renderFooter();
      return;
    }
    if (name === "grouped") {
      if (value === null) {
        item.removeAttribute("data-grouped");
        this.avatarBox?.removeAttribute("data-hidden");
      } else {
        item.setAttribute("data-grouped", "");
        this.avatarBox?.setAttribute("data-hidden", "");
      }
      this.renderHeader();
      return;
    }
    if (name === "live") {
      if (value === null) item.removeAttribute("data-live");
      else item.setAttribute("data-live", "");
      this.renderHeader();
      return;
    }
    if (name === "no-animate") {
      if (value === null) item.dataset.animate = "true";
      else item.removeAttribute("data-animate");
    }
  }

  /** A grouped row drops the repeated author line entirely, same as the
   * React component — the run reads as one block of speech. */
  private renderHeader() {
    const header = this.headerBox;
    if (!header) return;
    header.replaceChildren();
    const grouped = this.hasAttribute("grouped");
    const name = this.getAttribute("name");
    const live = this.hasAttribute("live");
    if (grouped || (!name && !live)) {
      header.hidden = true;
      return;
    }
    header.hidden = false;
    if (name) {
      const nameEl = document.createElement("span");
      nameEl.className = kernelClass("Message", "name");
      nameEl.textContent = name;
      header.append(nameEl);
    }
    if (live) {
      const liveEl = document.createElement("span");
      liveEl.className = kernelClass("Message", "liveMark");
      liveEl.textContent = "Writing";
      header.append(liveEl);
    }
  }

  private renderFooter() {
    const footer = this.footerBox;
    if (!footer) return;
    const metadata = this.getAttribute("metadata");
    footer.textContent = metadata ?? "";
    footer.hidden = !metadata;
  }
}

/**
 * `<kernel-message-bubble>` — the conversational surface. Tone and
 * alignment are `data-*` attributes on one root, and `expandable` renders a
 * real `<details>` (height-animated by `DetailsPanelAnimator`) rather than
 * a `max-height` clamp; see `@kernelui-lib/react`'s `<MessageBubble>` for
 * why both choices.
 *
 * Attributes: `tone` ("neutral" | "accent" | "muted" | "danger"), `align`
 * ("start" | "center" | "end"), `expandable`, `expand-label` (default
 * "Show more"), `default-open` (read once at connect).
 */
export class KernelMessageBubble extends KernelElement {
  private animator: DetailsPanelAnimator | undefined;

  static get observedAttributes() {
    return ["tone", "align", "expand-label"];
  }

  connectedCallback() {
    if (this.native) return;

    const adopted = Array.from(this.childNodes);
    for (const node of adopted) node.parentNode?.removeChild(node);

    if (!this.hasAttribute("expandable")) {
      const box = document.createElement("div");
      box.className = kernelClass("Message", "bubble");
      box.dataset.tone = this.getAttribute("tone") || "neutral";
      box.dataset.align = this.getAttribute("align") || "start";
      box.append(...adopted);
      this.native = box;
      this.append(box);
      this.syncAllAttrs();
      return;
    }

    const details = document.createElement("details");
    details.className = kernelClass("Message", "bubble");
    details.dataset.tone = this.getAttribute("tone") || "neutral";
    details.dataset.align = this.getAttribute("align") || "start";
    details.dataset.expandable = "true";

    const summary = document.createElement("summary");
    summary.className = kernelClass("Message", "expandTrigger");
    const label = document.createElement("span");
    label.className = kernelClass("Message", "expandLabel");
    label.textContent = this.getAttribute("expand-label") || "Show more";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 16 16");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("aria-hidden", "true");
    chevron.setAttribute("class", kernelClass("Message", "expandIcon"));
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", CHEVRON_PATH);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.75");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    chevron.append(path);
    summary.append(label, chevron);

    const content = document.createElement("div");
    content.className = kernelClass("Message", "expandContent");
    content.append(...adopted);

    details.append(summary, content);
    this.native = details;
    this.append(details);

    this.animator = new DetailsPanelAnimator(details, content);
    if (this.hasAttribute("default-open")) this.animator.snapOpen(true);
    this.syncAllAttrs();
  }

  disconnectedCallback() {
    this.animator?.destroy();
    this.animator = undefined;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "tone") {
      this.native.dataset.tone = value || "neutral";
      return;
    }
    if (name === "align") {
      this.native.dataset.align = value || "start";
      return;
    }
    if (name === "expand-label") {
      const label = this.native.querySelector<HTMLElement>(
        `.${kernelClass("Message", "expandLabel")}`,
      );
      if (label) label.textContent = value || "Show more";
    }
  }
}

customElements.define("kernel-message-list", KernelMessageList);
customElements.define("kernel-message", KernelMessage);
customElements.define("kernel-message-bubble", KernelMessageBubble);
