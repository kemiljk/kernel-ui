import { KernelElement, kernelClass } from "../../base";
import {
  isExternalHref,
  parseMarkdown,
  type MarkdownAlign,
  type MarkdownBlock,
  type MarkdownInline,
} from "../../utils/markdown";
import "../CodeBlock/CodeBlock";
import "./StreamingMarkdown.css";

const cls = (part: string) => kernelClass("StreamingMarkdown", part);

interface RenderedBlock {
  raw: string;
  live: boolean;
  fresh: boolean;
  node: HTMLElement;
}

/**
 * `<kernel-streaming-markdown>` — renders Markdown as it streams in from a
 * model, as real elements built with `createElement` and `textContent`,
 * never `innerHTML`. See `@kernelui-lib/react`'s `<StreamingMarkdown>` for
 * the full reasoning: why model text can only ever become text, why links
 * are filtered to safe schemes and images are never loaded, why unfinished
 * syntax renders as its finished form, and why this is not a live region
 * (it sets `aria-busy` while streaming and leaves announcing to the
 * transcript, `<kernel-message-scroller>`).
 *
 * Stable streaming: the top level is split into blocks, each remembered with
 * the source slice it came from. A new chunk leaves every block whose slice
 * is unchanged untouched — same nodes, same layout, same text selection —
 * and patches the last one in place, element by element and text node by
 * text node, so words already on screen keep their nodes and only new words
 * mount (and fade in). Fenced code renders through `<kernel-code-block>`,
 * which reconciles its own lines the same way.
 *
 * Content: the `content` property or attribute (append to it as chunks
 * arrive), or Markdown written as the tag's text, read once at connect.
 * Attributes: `streaming`, `no-animate` (no word fade-in; reduced motion
 * turns it off regardless), and built-in string `label-opens-in-new-tab`
 * ("(opens in new tab)") — or the `labels` property.
 */
export class KernelStreamingMarkdown extends KernelElement {
  private source = "";
  private rendered: RenderedBlock[] = [];
  private labelsDirty = false;

  static get observedAttributes() {
    return ["content", "streaming", "no-animate", "label-opens-in-new-tab"];
  }

  /** The Markdown so far. Assigning re-renders only what changed. */
  get content(): string {
    return this.source;
  }

  set content(next: string) {
    this.source = next ?? "";
    this.render();
  }

  get streaming(): boolean {
    return this.hasAttribute("streaming");
  }

  set streaming(next: boolean) {
    this.toggleAttribute("streaming", Boolean(next));
  }

  protected rootClass() {
    return cls("root");
  }

  connectedCallback() {
    if (this.native) return;
    // Light-DOM Markdown, read once and dedented: the progressive-enhancement
    // path, where the text is on the page before any script runs.
    if (!this.hasAttribute("content") && !this.source) this.source = dedent(this.textContent ?? "");
    this.replaceChildren();
    const root = this.createNative();
    this.native = root;
    this.append(root);
    if (this.hasAttribute("content")) this.source = this.getAttribute("content") ?? "";
    this.syncAllAttrs();
    this.render();
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "content") {
      if (value !== null) {
        this.source = value;
        this.render();
      }
      return;
    }
    if (name === "streaming" || name === "no-animate") this.render();
  }

  protected applyLabels() {
    this.labelsDirty = true;
    this.render();
  }

  private render() {
    const root = this.native;
    if (!root) return;
    const streaming = this.hasAttribute("streaming");
    const animate = !this.hasAttribute("no-animate");
    if (streaming) {
      root.setAttribute("data-streaming", "true");
      root.setAttribute("aria-busy", "true");
    } else {
      root.removeAttribute("data-streaming");
      root.removeAttribute("aria-busy");
    }

    const blocks = parseMarkdown(this.source, { streaming });
    const labelsDirty = this.labelsDirty;
    this.labelsDirty = false;
    const next: RenderedBlock[] = [];

    blocks.forEach((entry, index) => {
      const live = streaming && index === blocks.length - 1;
      const fresh = live && animate;
      const previous = this.rendered[index];
      if (previous && !labelsDirty && previous.raw === entry.raw && previous.live === live && previous.fresh === fresh) {
        next.push(previous);
        return;
      }
      const built = this.renderBlock(entry.block, { live, fresh }) as HTMLElement;
      let node: HTMLElement;
      if (previous && previous.node.parentNode === root) node = morph(previous.node, built) as HTMLElement;
      else {
        root.append(built);
        node = built;
      }
      next.push({ raw: entry.raw, live, fresh, node });
    });

    for (let i = blocks.length; i < this.rendered.length; i++) this.rendered[i]!.node.remove();
    this.rendered = next;
  }

  private renderBlock(block: MarkdownBlock, context: { live: boolean; fresh: boolean }, tight = false): HTMLElement | DocumentFragment {
    switch (block.type) {
      case "paragraph": {
        if (tight) {
          const fragment = document.createDocumentFragment();
          fragment.append(...this.renderInlines(block.children, context));
          return fragment;
        }
        return el("p", cls("paragraph"), this.renderInlines(block.children, context));
      }
      case "heading": {
        const heading = el(`h${block.level}`, cls("heading"), this.renderInlines(block.children, context));
        heading.setAttribute("data-level", String(block.level));
        return heading;
      }
      case "code": {
        const wrapper = el("div", cls("codeBlock"));
        const code = document.createElement("kernel-code-block") as HTMLElement & { code: string };
        if (block.language) code.setAttribute("language", block.language);
        if (context.live && block.open) code.setAttribute("streaming", "");
        code.code = block.code;
        wrapper.append(code);
        return wrapper;
      }
      case "list": {
        const list = el(block.ordered ? "ol" : "ul", cls("list"));
        if (block.tight) list.setAttribute("data-tight", "true");
        if (block.ordered && block.start !== undefined && block.start !== 1) list.setAttribute("start", String(block.start));
        for (const item of block.items) {
          const li = el("li", cls("item"));
          for (const child of item.blocks) li.append(this.renderBlock(child, context, block.tight));
          list.append(li);
        }
        return list;
      }
      case "blockquote": {
        const quote = el("blockquote", cls("blockquote"));
        for (const child of block.blocks) quote.append(this.renderBlock(child, context));
        return quote;
      }
      case "table": {
        // Focusable so a keyboard user can scroll a wide table; no role,
        // because a landmark per table is noise.
        const scroll = el("div", cls("tableScroll"));
        scroll.tabIndex = 0;
        const table = el("table", cls("table"));
        const head = document.createElement("thead");
        const headRow = document.createElement("tr");
        block.head.forEach((cell, index) => {
          const th = el("th", undefined, this.renderInlines(cell, context));
          th.setAttribute("scope", "col");
          applyAlign(th, block.align[index] ?? null);
          headRow.append(th);
        });
        head.append(headRow);
        table.append(head);
        if (block.rows.length > 0) {
          const body = document.createElement("tbody");
          for (const row of block.rows) {
            const tr = document.createElement("tr");
            row.forEach((cell, index) => {
              const td = el("td", undefined, this.renderInlines(cell, context));
              applyAlign(td, block.align[index] ?? null);
              tr.append(td);
            });
            body.append(tr);
          }
          table.append(body);
        }
        scroll.append(table);
        return scroll;
      }
      case "rule":
        return el("hr", cls("rule"));
    }
  }

  private renderInlines(nodes: MarkdownInline[], context: { fresh: boolean }): Node[] {
    return nodes.flatMap((node) => this.renderInline(node, context));
  }

  private renderInline(node: MarkdownInline, context: { fresh: boolean }): Node[] {
    switch (node.type) {
      case "text":
        return context.fresh ? freshText(node.text) : [document.createTextNode(node.text)];
      case "strong":
        return [el("strong", cls("strong"), this.renderInlines(node.children, context))];
      case "em":
        return [el("em", undefined, this.renderInlines(node.children, context))];
      case "del":
        return [el("del", undefined, this.renderInlines(node.children, context))];
      case "code": {
        const code = el("code", cls("inlineCode"));
        code.textContent = node.text;
        return [code];
      }
      case "break":
        return [document.createElement("br")];
      case "link": {
        const link = el("a", cls("link"), this.renderInlines(node.children, context)) as HTMLAnchorElement;
        // Unsafe, or still being written: an inert <a> with no href (see the
        // React component), so an arriving link keeps its element.
        if (node.href === null) return [link];
        // Assigned as an attribute, after safeHref() has refused every
        // scheme but http(s), mailto and relative.
        link.setAttribute("href", node.href);
        if (node.title) link.title = node.title;
        if (isExternalHref(node.href)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          const hint = el("span", "kernel-sr-only");
          hint.textContent = ` ${this.builtInLabel("opensInNewTab", "(opens in new tab)")}`;
          link.append(hint);
        }
        return [link];
      }
    }
  }
}

function el(tag: string, className?: string, children: Node[] = []): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.append(...children);
  return element;
}

function applyAlign(cell: HTMLElement, align: MarkdownAlign) {
  // GFM's left/right as logical start/end, so a right-to-left page mirrors.
  if (align) cell.style.textAlign = align === "left" ? "start" : align === "right" ? "end" : "center";
}

/** Text in the live block, one span per word, whitespace as bare text, so
 * patching in place keeps words already on screen and mounts only new ones
 * (which is what the fade-in keys off). */
function freshText(text: string): Node[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part !== "")
    .map((part) => {
      if (/^\s+$/.test(part)) return document.createTextNode(part);
      const span = el("span", cls("fresh"));
      span.textContent = part;
      return span;
    });
}

/**
 * Patches `current` to match `next` in place, by index: the same element
 * type at the same position is updated (attributes, then children), text
 * nodes get new data, anything else is replaced. This is React's
 * index-keyed reconciliation in miniature, and it's what keeps a streaming
 * paragraph's existing words — and their finished fade-ins — on screen.
 * `<kernel-code-block>` is never entered: it reconciles its own lines when
 * handed new `code`.
 */
function morph(current: Node, next: Node): Node {
  if (
    current.nodeType !== next.nodeType ||
    (current instanceof Element && next instanceof Element && current.tagName !== next.tagName)
  ) {
    current.parentNode?.replaceChild(next, current);
    return next;
  }
  if (current.nodeType === Node.TEXT_NODE) {
    if ((current as Text).data !== (next as Text).data) (current as Text).data = (next as Text).data;
    return current;
  }
  if (!(current instanceof HTMLElement) || !(next instanceof HTMLElement)) return current;

  for (const { name } of Array.from(current.attributes)) {
    if (!next.hasAttribute(name)) current.removeAttribute(name);
  }
  for (const { name, value } of Array.from(next.attributes)) {
    if (current.getAttribute(name) !== value) current.setAttribute(name, value);
  }

  if (current.tagName === "KERNEL-CODE-BLOCK") {
    const target = current as HTMLElement & { code: string };
    const source = next as HTMLElement & { code: string };
    if (target.code !== source.code) target.code = source.code;
    return current;
  }

  const currentChildren = Array.from(current.childNodes);
  const nextChildren = Array.from(next.childNodes);
  nextChildren.forEach((child, index) => {
    const existing = currentChildren[index];
    if (existing) morph(existing, child);
    else current.append(child);
  });
  for (let i = nextChildren.length; i < currentChildren.length; i++) currentChildren[i]!.remove();
  return current;
}

/** Strips the indentation an author's HTML formatting adds to light-DOM
 * Markdown, plus leading and trailing blank lines. */
function dedent(text: string): string {
  const lines = text.replace(/^\s*\n|\n\s*$/g, "").split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common)).join("\n");
}

customElements.define("kernel-streaming-markdown", KernelStreamingMarkdown);
