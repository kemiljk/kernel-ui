import { KernelElement, kernelClass } from "../../base";
import { DetailsPanelAnimator } from "../../utils/detailsTransition";
import type { CodeToken } from "../../utils/codeTokens";
import "./FileDiff.css";

const CHEVRON_PATH = "M4 6L8 10L12 6";

export type DiffRowKind = "add" | "remove" | "context" | "hunk";

export interface DiffRow {
  kind: DiffRowKind;
  oldLine?: number;
  newLine?: number;
  content?: string;
  tokens?: CodeToken[];
}

const MARKERS: Record<DiffRowKind, string> = {
  add: "+",
  remove: "−",
  context: " ",
  hunk: "@",
};

/**
 * `<kernel-file-diff>` — a file's changes as a real `<table>` inside a
 * `<details>`. A diff *is* tabular data (old line, new line, marker, content);
 * see `@kernelui-lib/react`'s `<FileDiff>` for that reasoning, for why the
 * `+`/`−` marker stays in the DOM as text, and for why the streaming edge
 * drives the disclosure.
 *
 * Rows arrive through a DOM property, since a diff can't travel through an
 * attribute:
 *
 *   el.rows = [{ kind: "add", newLine: 12, content: "…" }, …]
 *
 * Attributes: `path`, `streaming`, `no-line-numbers`, `collapse-on-complete`,
 * `additions` / `deletions` (override the derived counts), `default-open="false"`.
 */
export class KernelFileDiff extends KernelElement {
  private summaryEl: HTMLElement | null = null;
  private bodyEl: HTMLTableSectionElement | null = null;
  private captionEl: HTMLElement | null = null;
  private animator: DetailsPanelAnimator | undefined;
  private collapseTimer: ReturnType<typeof setTimeout> | undefined;
  private wasStreaming = false;
  private ownRows: DiffRow[] = [];

  static get observedAttributes() {
    return ["path", "streaming", "no-line-numbers", "additions", "deletions"];
  }

  get rows(): DiffRow[] {
    return this.ownRows;
  }

  set rows(next: DiffRow[]) {
    this.ownRows = next ?? [];
    this.renderRows();
    this.renderSummary();
  }

  connectedCallback() {
    if (this.native) return;
    this.replaceChildren();

    const details = document.createElement("details");
    details.className = kernelClass("FileDiff");

    const summary = document.createElement("summary");
    summary.className = kernelClass("FileDiff", "trigger");

    const content = document.createElement("div");
    content.className = kernelClass("FileDiff", "content");

    const table = document.createElement("table");
    table.className = kernelClass("FileDiff", "table");
    const caption = document.createElement("caption");
    caption.className = "kernel-sr-only";
    const head = document.createElement("thead");
    head.className = "kernel-sr-only";
    const headRow = document.createElement("tr");
    for (const name of ["Old line", "New line", "Change", "Content"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = name;
      headRow.append(th);
    }
    head.append(headRow);
    const body = document.createElement("tbody");
    table.append(caption, head, body);
    content.append(table);

    details.append(summary, content);
    this.summaryEl = summary;
    this.bodyEl = body;
    this.captionEl = caption;
    this.native = details;
    this.append(details);

    this.animator = new DetailsPanelAnimator(details, content);
    if (this.getAttribute("default-open") !== "false") this.animator.snapOpen(true);
    this.wasStreaming = this.hasAttribute("streaming");

    this.syncAllAttrs();
    this.renderSummary();
  }

  disconnectedCallback() {
    clearTimeout(this.collapseTimer);
    this.animator?.destroy();
    this.animator = undefined;
  }

  protected syncAttr(name: string, value: string | null) {
    const details = this.native;
    if (!details) return;

    if (name === "streaming") {
      const streaming = this.hasAttribute("streaming");
      if (streaming) details.setAttribute("data-streaming", "");
      else details.removeAttribute("data-streaming");
      if (this.wasStreaming === streaming) return;
      this.wasStreaming = streaming;
      clearTimeout(this.collapseTimer);
      if (streaming) {
        void this.animator?.setOpen(true);
      } else if (this.hasAttribute("collapse-on-complete")) {
        // A beat before folding away, so the finished change registers first
        // — the same pause `<kernel-reasoning>` takes.
        this.collapseTimer = setTimeout(() => void this.animator?.setOpen(false), 600);
      }
      return;
    }
    if (name === "no-line-numbers") {
      this.renderRows();
      return;
    }
    if (name === "path" || name === "additions" || name === "deletions") {
      void value;
      this.renderSummary();
    }
  }

  private counts(): { additions: number; deletions: number } {
    let added = 0;
    let removed = 0;
    for (const row of this.ownRows) {
      if (row.kind === "add") added += 1;
      else if (row.kind === "remove") removed += 1;
    }
    const explicitAdd = Number(this.getAttribute("additions"));
    const explicitDel = Number(this.getAttribute("deletions"));
    return {
      additions: this.hasAttribute("additions") && Number.isFinite(explicitAdd) ? explicitAdd : added,
      deletions: this.hasAttribute("deletions") && Number.isFinite(explicitDel) ? explicitDel : removed,
    };
  }

  private renderSummary() {
    const summary = this.summaryEl;
    if (!summary) return;
    const path = this.getAttribute("path") || "";
    const { additions, deletions } = this.counts();

    summary.replaceChildren();

    const pathEl = document.createElement("span");
    pathEl.className = kernelClass("FileDiff", "path");
    pathEl.textContent = path;

    const counts = document.createElement("span");
    counts.className = kernelClass("FileDiff", "counts");
    const add = document.createElement("span");
    add.className = kernelClass("FileDiff", "additions");
    add.textContent = `+${additions}`;
    const del = document.createElement("span");
    del.className = kernelClass("FileDiff", "deletions");
    del.textContent = `−${deletions}`;
    counts.append(add, del);

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 16 16");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("aria-hidden", "true");
    chevron.setAttribute("class", kernelClass("FileDiff", "chevron"));
    const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    chevronPath.setAttribute("d", CHEVRON_PATH);
    chevronPath.setAttribute("stroke", "currentColor");
    chevronPath.setAttribute("stroke-width", "1.75");
    chevronPath.setAttribute("stroke-linecap", "round");
    chevronPath.setAttribute("stroke-linejoin", "round");
    chevron.append(chevronPath);

    summary.append(pathEl, counts, chevron);

    if (this.captionEl) {
      this.captionEl.textContent = `Changes to ${path || "the file"}: ${additions} added, ${deletions} removed`;
    }
  }

  /** Reconciles rows in place — a streaming diff grows at the end, and
   * rebuilding the table per chunk would destroy the reader's selection and
   * re-run every row's enter animation. */
  private renderRows() {
    const body = this.bodyEl;
    if (!body) return;
    const showNumbers = !this.hasAttribute("no-line-numbers");
    const existing = Array.from(body.rows);

    this.ownRows.forEach((row, index) => {
      let tr = existing[index];
      if (!tr) {
        tr = body.insertRow();
        tr.className = kernelClass("FileDiff", "row");
      }
      tr.dataset.kind = row.kind;
      tr.replaceChildren();

      if (showNumbers) {
        for (const value of [row.oldLine, row.newLine]) {
          const cell = tr.insertCell();
          cell.className = kernelClass("FileDiff", "number");
          cell.textContent = value === undefined ? "" : String(value);
        }
      }

      const marker = tr.insertCell();
      marker.className = kernelClass("FileDiff", "marker");
      marker.textContent = MARKERS[row.kind] ?? " ";

      const code = tr.insertCell();
      code.className = kernelClass("FileDiff", "code");
      if (row.tokens) {
        for (const token of row.tokens) {
          const span = document.createElement("span");
          if (token.className) span.className = token.className;
          if (token.color) span.style.color = token.color;
          span.textContent = token.text;
          code.append(span);
        }
      } else {
        code.textContent = row.content ?? "";
      }
    });

    for (let i = existing.length - 1; i >= this.ownRows.length; i--) body.deleteRow(i);
  }
}

customElements.define("kernel-file-diff", KernelFileDiff);
