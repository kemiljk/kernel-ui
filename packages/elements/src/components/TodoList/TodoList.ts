import { KernelElement, kernelClass } from "../../base";
import { DetailsPanelAnimator } from "../../utils/detailsTransition";
import { adoptLateChildren } from "../../utils/lateChildren";
import "./TodoList.css";

const CHEVRON_PATH = "M4 6L8 10L12 6";

const STATUS_WORDS: Record<string, string> = {
  pending: "To do",
  active: "In progress",
  done: "Done",
  error: "Failed",
};

function svgEl(className: string): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 16 16");
  el.setAttribute("fill", "none");
  el.setAttribute("class", className);
  return el;
}

function path(d: string, attrs: Record<string, string> = {}): SVGPathElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("stroke-width", "1.25");
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function circle(r: string, attrs: Record<string, string> = {}): SVGCircleElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  el.setAttribute("cx", "8");
  el.setAttribute("cy", "8");
  el.setAttribute("r", r);
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("stroke-width", "1.25");
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

/**
 * `<kernel-todo-list>` — an agent's task plan: a `<details>`/`<summary>`
 * wrapping a real `<ol>` of `<kernel-todo-item>`s. See
 * `@kernelui-lib/react`'s `<TodoList>` for why the disclosure is native and
 * why the count lives on the summary.
 *
 * Attributes: `label` (default "Plan"), `metadata`, `completed` / `total`
 * (override the derived count), `default-open="false"` to start collapsed.
 *
 * The count is recomputed from the `status` attributes of child
 * `<kernel-todo-item>`s whenever they change — no explicit bookkeeping in
 * the consumer's update path.
 */
export class KernelTodoList extends KernelElement {
  private summaryEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private animator: DetailsPanelAnimator | undefined;
  private childObserver: MutationObserver | null = null;
  private statusObserver: MutationObserver | null = null;

  static get observedAttributes() {
    return ["label", "metadata", "completed", "total"];
  }

  connectedCallback() {
    if (this.native) return;

    const adopted = Array.from(this.childNodes);
    for (const node of adopted) node.parentNode?.removeChild(node);

    const details = document.createElement("details");
    details.className = kernelClass("TodoList");

    const summary = document.createElement("summary");
    summary.className = kernelClass("TodoList", "trigger");

    const content = document.createElement("div");
    content.className = kernelClass("TodoList", "content");
    const list = document.createElement("ol");
    list.className = kernelClass("TodoList", "list");
    list.append(...adopted);
    content.append(list);

    details.append(summary, content);
    this.summaryEl = summary;
    this.listEl = list;
    this.native = details;
    this.append(details);

    this.animator = new DetailsPanelAnimator(details, content);
    if (this.getAttribute("default-open") !== "false") this.animator.snapOpen(true);

    this.renderSummary();

    this.childObserver = adoptLateChildren(
      this,
      () => this.listEl,
      (node) => node === this.native,
    );
    // A plan's items change status as work lands; the summary count has to
    // follow without the consumer telling it to.
    this.statusObserver = new MutationObserver(() => this.renderSummary());
    this.statusObserver.observe(list, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["status"],
    });
  }

  disconnectedCallback() {
    this.animator?.destroy();
    this.animator = undefined;
    this.childObserver?.disconnect();
    this.childObserver = null;
    this.statusObserver?.disconnect();
    this.statusObserver = null;
  }

  protected syncAttr() {
    this.renderSummary();
  }

  private counts(): { completed: number; total: number } {
    const explicitTotal = Number(this.getAttribute("total"));
    const explicitCompleted = Number(this.getAttribute("completed"));
    const items = this.listEl?.querySelectorAll("kernel-todo-item") ?? [];
    let done = 0;
    for (const item of items) if (item.getAttribute("status") === "done") done += 1;
    return {
      total: Number.isFinite(explicitTotal) && this.hasAttribute("total") ? explicitTotal : items.length,
      completed:
        Number.isFinite(explicitCompleted) && this.hasAttribute("completed")
          ? explicitCompleted
          : done,
    };
  }

  private renderSummary() {
    const summary = this.summaryEl;
    const details = this.native;
    if (!summary || !details) return;

    const { completed, total } = this.counts();
    if (total > 0 && completed === total) details.setAttribute("data-complete", "");
    else details.removeAttribute("data-complete");

    summary.replaceChildren();

    const label = document.createElement("span");
    label.className = kernelClass("TodoList", "label");
    label.textContent = this.getAttribute("label") || "Plan";
    summary.append(label);

    if (total > 0) {
      const count = document.createElement("span");
      count.className = kernelClass("TodoList", "count");
      count.textContent = `${completed}/${total}`;
      summary.append(count);
    }

    const metadata = this.getAttribute("metadata");
    if (metadata) {
      const meta = document.createElement("span");
      meta.className = kernelClass("TodoList", "metadata");
      meta.textContent = metadata;
      summary.append(meta);
    }

    const chevron = svgEl(kernelClass("TodoList", "chevron"));
    chevron.setAttribute("aria-hidden", "true");
    chevron.append(path(CHEVRON_PATH, { "stroke-width": "1.75" }));
    summary.append(chevron);
  }
}

/**
 * `<kernel-todo-item>` — one task. Owns a real `<li>`, with the host set to
 * `display: contents` so the `<li>` is a direct child of the list's `<ol>`
 * (custom elements can't be `<li>`).
 *
 * All four status marks render at once and cross-fade on `data-status`, so a
 * status change is one attribute write and no JS in the transition — see
 * `@kernelui-lib/react`'s `<TodoItem>`. The status is also real, visually
 * hidden text: a shape and a colour are not a label.
 *
 * Attributes: `status` ("pending" | "active" | "done" | "error"),
 * `metadata`, `status-label` to override the announced status word.
 */
export class KernelTodoItem extends KernelElement {
  private statusEl: HTMLElement | null = null;
  private metaEl: HTMLElement | null = null;

  static get observedAttributes() {
    return ["status", "metadata", "status-label"];
  }

  connectedCallback() {
    if (this.native) return;
    this.style.display = "contents";

    const adopted = Array.from(this.childNodes);
    for (const node of adopted) node.parentNode?.removeChild(node);

    const item = document.createElement("li");
    item.className = kernelClass("TodoList", "item");

    const mark = document.createElement("span");
    mark.className = kernelClass("TodoList", "mark");
    mark.setAttribute("aria-hidden", "true");

    const pending = svgEl(kernelClass("TodoList", "markLayer"));
    pending.dataset.kind = "pending";
    pending.append(circle("5.75"));

    const active = svgEl(kernelClass("TodoList", "markLayer"));
    active.dataset.kind = "active";
    active.append(circle("5.75"), circle("2.5", { fill: "currentColor", stroke: "none" }));

    const done = svgEl(kernelClass("TodoList", "markLayer"));
    done.dataset.kind = "done";
    done.append(
      circle("5.75", { fill: "currentColor", stroke: "none" }),
      path("M5.5 8.25 7.25 10l3.25-3.75", {
        stroke: "var(--kernel-color-canvas)",
        "stroke-width": "1.5",
      }),
    );

    const error = svgEl(kernelClass("TodoList", "markLayer"));
    error.dataset.kind = "error";
    error.append(circle("5.75"), path("M6 6l4 4M10 6l-4 4", { "stroke-width": "1.5" }));

    mark.append(pending, active, done, error);

    const text = document.createElement("span");
    text.className = kernelClass("TodoList", "text");
    text.append(...adopted);

    const status = document.createElement("span");
    status.className = "kernel-sr-only";

    const meta = document.createElement("span");
    meta.className = kernelClass("TodoList", "itemMetadata");

    item.append(mark, text, status, meta);
    this.statusEl = status;
    this.metaEl = meta;
    this.native = item;
    this.append(item);

    if (!this.hasAttribute("status")) item.dataset.status = "pending";
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const item = this.native;
    if (!item) return;
    if (name === "status") {
      item.dataset.status = value || "pending";
    }
    if (name === "status" || name === "status-label") {
      const status = this.getAttribute("status") || "pending";
      if (this.statusEl) {
        this.statusEl.textContent =
          this.getAttribute("status-label") || STATUS_WORDS[status] || status;
      }
    }
    if (name === "metadata" && this.metaEl) {
      this.metaEl.textContent = value ?? "";
      this.metaEl.hidden = !value;
    }
  }
}

customElements.define("kernel-todo-list", KernelTodoList);
customElements.define("kernel-todo-item", KernelTodoItem);
