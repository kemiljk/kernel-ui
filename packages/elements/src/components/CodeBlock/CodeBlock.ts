import { KernelElement, kernelClass } from "../../base";
import { linesFromCode, linesText, type CodeLine } from "../../utils/codeTokens";
import { StickToBottomController } from "../../utils/stickToBottom";
import "./CodeBlock.css";

const COPY_PATHS = [
  {
    tag: "rect" as const,
    attrs: { x: "5.75", y: "5.75", width: "7.5", height: "7.5", rx: "1.75" },
  },
  {
    tag: "path" as const,
    attrs: {
      d: "M10.25 5.5v-1a1.75 1.75 0 0 0-1.75-1.75h-4A1.75 1.75 0 0 0 2.75 4.5v4c0 .97.78 1.75 1.75 1.75h1",
    },
  },
];
const COPIED_PATH = "M3.5 8.5 6.5 11.5 12.5 5";

/**
 * `<kernel-code-block>` — a real `<pre><code>` in a `<figure>`, with optional
 * line numbers, emphasised lines, copy, and stable streaming. See
 * `@kernelui-lib/react`'s `<CodeBlock>` for why it highlights nothing itself
 * and why line numbers are unselectable and `aria-hidden`.
 *
 * Content comes in three ways, in precedence order:
 *
 *   1. `el.lines = [{ tokens: [{ text, className?, color? }] }]` — a DOM
 *      property, because structured data can't travel through an attribute
 *      and shouldn't pretend to.
 *   2. `el.code = "..."` — un-highlighted source.
 *   3. Light-DOM `<pre><code>…</code></pre>` written into the tag, read once
 *      at connect. That's the progressive-enhancement path: the code is real
 *      page content before any script sets a property.
 *
 * Attributes: `language`, `label`, `show-line-numbers`, `highlight-lines`
 * (comma-separated 1-based numbers), `streaming`, `no-copy`,
 * `max-block-size`.
 */
export class KernelCodeBlock extends KernelElement {
  private viewport: HTMLElement | null = null;
  private codeEl: HTMLElement | null = null;
  private headerEl: HTMLElement | null = null;
  private liveEl: HTMLElement | null = null;
  private controller: StickToBottomController | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private copied = false;
  private ownLines: CodeLine[] = [];

  static get observedAttributes() {
    return ["language", "label", "show-line-numbers", "highlight-lines", "streaming", "no-copy", "max-block-size"];
  }

  /** Pre-tokenised lines. Assigning re-renders the block. */
  get lines(): CodeLine[] {
    return this.ownLines;
  }

  set lines(next: CodeLine[]) {
    this.ownLines = next ?? [];
    this.renderLines();
  }

  get code(): string {
    return linesText(this.ownLines);
  }

  set code(next: string) {
    this.lines = linesFromCode(next ?? "");
  }

  connectedCallback() {
    if (this.native) return;

    const fallback = this.textContent ?? "";
    this.replaceChildren();

    const figure = document.createElement("figure");
    figure.className = kernelClass("CodeBlock");

    const header = document.createElement("figcaption");
    header.className = kernelClass("CodeBlock", "header");

    const viewport = document.createElement("div");
    viewport.className = kernelClass("CodeBlock", "viewport");
    const inner = document.createElement("div");
    const pre = document.createElement("pre");
    pre.className = kernelClass("CodeBlock", "pre");
    const code = document.createElement("code");
    code.className = kernelClass("CodeBlock", "code");
    pre.append(code);
    inner.append(pre);
    viewport.append(inner);

    const live = document.createElement("span");
    live.setAttribute("role", "status");
    live.className = "kernel-sr-only";

    figure.append(header, viewport, live);
    this.viewport = viewport;
    this.codeEl = code;
    this.headerEl = header;
    this.liveEl = live;
    this.native = figure;
    this.append(figure);

    // Light-DOM source, read once. Trailing/leading blank lines from the
    // author's indentation aren't part of the code.
    if (fallback.trim()) this.ownLines = linesFromCode(fallback.replace(/^\n+|\n+$/g, ""));

    this.controller = new StickToBottomController(viewport, inner, { pinned: true });
    this.syncAllAttrs();
    this.renderHeader();
    this.renderLines();
  }

  disconnectedCallback() {
    this.controller?.destroy();
    this.controller = null;
    clearTimeout(this.copyTimer);
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "max-block-size") {
      if (value === null) this.native.style.removeProperty("--kernel-code-max-block-size");
      else this.native.style.setProperty("--kernel-code-max-block-size", value);
      return;
    }
    if (name === "streaming") {
      if (value === null) this.native.removeAttribute("data-streaming");
      else this.native.setAttribute("data-streaming", "");
      return;
    }
    if (name === "language" || name === "label" || name === "no-copy") {
      this.renderHeader();
      if (name === "language" && this.codeEl) {
        if (value === null) this.codeEl.removeAttribute("data-language");
        else this.codeEl.dataset.language = value;
      }
      return;
    }
    if (name === "show-line-numbers" || name === "highlight-lines") this.renderLines();
  }

  private renderHeader() {
    const header = this.headerEl;
    if (!header) return;
    const heading = this.getAttribute("label") || this.getAttribute("language");
    const copyable = !this.hasAttribute("no-copy");
    header.replaceChildren();
    header.hidden = !heading && !copyable;
    if (!heading && !copyable) return;

    if (heading) {
      const title = document.createElement("span");
      title.className = kernelClass("CodeBlock", "heading");
      title.textContent = heading;
      header.append(title);
    }
    if (copyable) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = kernelClass("CodeBlock", "copy");
      button.addEventListener("click", () => void this.copy());
      header.append(button);
      this.renderCopyButton(button);
    }
  }

  /**
   * Builds both icon and label states once, stacked, and leaves them in
   * the DOM permanently — `copy()` below only ever toggles `data-copied`
   * and the button's own `aria-label` after this. Same convention as
   * `<kernel-todo-item>`'s status marks: a copy reads as the icon
   * morphing rather than one being swapped for another, driven by CSS on
   * one attribute instead of replacing children on every toggle.
   * aria-hidden on every layer: the button's own aria-label is the single
   * source of truth for the accessible name, so a screen reader doesn't
   * announce two simultaneously-present strings.
   */
  private renderCopyButton(button: HTMLButtonElement) {
    button.replaceChildren();
    button.setAttribute("aria-label", this.copied ? "Copied" : "Copy");
    if (this.copied) button.setAttribute("data-copied", "");
    else button.removeAttribute("data-copied");

    const iconStack = document.createElement("span");
    iconStack.className = kernelClass("CodeBlock", "copyIconStack");
    iconStack.setAttribute("aria-hidden", "true");

    const makeIcon = (kind: "copy" | "copied", shapes: typeof COPY_PATHS) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("fill", "none");
      svg.setAttribute("class", kernelClass("CodeBlock", "copyIconLayer"));
      svg.setAttribute("data-kind", kind);
      for (const shape of shapes) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", shape.tag);
        for (const [key, value] of Object.entries(shape.attrs)) el.setAttribute(key, value);
        el.setAttribute("stroke", "currentColor");
        el.setAttribute("stroke-width", kind === "copied" ? "1.5" : "1.25");
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        svg.append(el);
      }
      return svg;
    };
    iconStack.append(
      makeIcon("copy", COPY_PATHS),
      makeIcon("copied", [{ tag: "path" as const, attrs: { d: COPIED_PATH } }]),
    );

    const labelStack = document.createElement("span");
    labelStack.className = kernelClass("CodeBlock", "copyLabelStack");
    labelStack.setAttribute("aria-hidden", "true");
    for (const [kind, text] of [
      ["copy", "Copy"],
      ["copied", "Copied"],
    ] as const) {
      const label = document.createElement("span");
      label.className = kernelClass("CodeBlock", "copyLabelLayer");
      label.setAttribute("data-kind", kind);
      label.textContent = text;
      labelStack.append(label);
    }

    button.append(iconStack, labelStack);
  }

  private async copy() {
    try {
      await navigator.clipboard.writeText(linesText(this.ownLines));
    } catch {
      // Denied clipboard access (permissions, insecure context). The code is
      // on screen and selectable, so there's nothing to report.
      return;
    }
    this.copied = true;
    if (this.liveEl) this.liveEl.textContent = "Copied to clipboard";
    const button = this.headerEl?.querySelector<HTMLButtonElement>(
      `.${kernelClass("CodeBlock", "copy")}`,
    );
    if (button) {
      button.setAttribute("aria-label", "Copied");
      button.setAttribute("data-copied", "");
    }
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => {
      this.copied = false;
      if (this.liveEl) this.liveEl.textContent = "";
      const current = this.headerEl?.querySelector<HTMLButtonElement>(
        `.${kernelClass("CodeBlock", "copy")}`,
      );
      if (current) {
        current.setAttribute("aria-label", "Copy");
        current.removeAttribute("data-copied");
      }
    }, 2000);
  }

  private highlightSet(): Set<number> {
    const raw = this.getAttribute("highlight-lines");
    if (!raw) return new Set();
    return new Set(
      raw
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n)),
    );
  }

  /** Reconciles line rows in place: existing rows are updated, new ones
   * appended, extras removed. Streaming output grows at the end, so replacing
   * the whole block on every chunk would destroy the reader's text selection
   * and flicker every line above the one that changed. */
  private renderLines() {
    const code = this.codeEl;
    if (!code) return;
    const showNumbers = this.hasAttribute("show-line-numbers");
    const highlighted = this.highlightSet();

    const existing = Array.from(code.children) as HTMLElement[];
    this.ownLines.forEach((line, index) => {
      let row = existing[index];
      if (!row) {
        row = document.createElement("span");
        row.className = kernelClass("CodeBlock", "line");
        code.append(row);
      }
      row.replaceChildren();
      if (highlighted.has(index + 1)) row.setAttribute("data-highlight", "");
      else row.removeAttribute("data-highlight");

      if (showNumbers) {
        const number = document.createElement("span");
        number.className = kernelClass("CodeBlock", "number");
        number.setAttribute("aria-hidden", "true");
        number.textContent = String(index + 1);
        row.append(number);
      }

      const text = document.createElement("span");
      text.className = kernelClass("CodeBlock", "lineText");
      for (const token of line.tokens) {
        const span = document.createElement("span");
        if (token.className) span.className = token.className;
        if (token.color) span.style.color = token.color;
        span.textContent = token.text;
        text.append(span);
      }
      text.append(document.createTextNode("\n"));
      row.append(text);
    });

    for (let i = this.ownLines.length; i < existing.length; i++) existing[i]?.remove();
  }
}

customElements.define("kernel-code-block", KernelCodeBlock);
