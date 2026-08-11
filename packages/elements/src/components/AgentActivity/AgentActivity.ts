import { KernelElement, kernelClass } from "../../base";
import { DetailsPanelAnimator } from "../../utils/detailsTransition";
import { adoptLateChildren } from "../../utils/lateChildren";
import "../Reasoning/Reasoning";
import "../ToolCall/ToolCall";
import "./AgentActivity.css";

const CHEVRON_PATH = "M4 6L8 10L12 6";

/** Per-kind icon geometry, mirroring `@kernelui-lib/react`'s KIND_ICONS. */
const KIND_SHAPES: Record<string, Array<{ tag: "path" | "circle"; attrs: Record<string, string> }>> = {
  reasoning: [
    { tag: "path", attrs: { d: "M8 1.5a5 5 0 0 0-3 9l.5 3h5l.5-3a5 5 0 0 0-3-9Z" } },
    { tag: "path", attrs: { d: "M6.25 14.5h3.5" } },
  ],
  search: [
    { tag: "circle", attrs: { cx: "7", cy: "7", r: "4.25" } },
    { tag: "path", attrs: { d: "M10.25 10.25 13.5 13.5" } },
  ],
  tool: [
    {
      tag: "path",
      attrs: { d: "M9.5 2.5a3 3 0 0 0 3.75 3.75l-7 7a1.75 1.75 0 0 1-2.5-2.5l7-7A3 3 0 0 0 9.5 2.5Z" },
    },
  ],
  trace: [{ tag: "path", attrs: { d: "M3 4.5h10M3 8h6.5M3 11.5h8.5" } }],
};

function kindIcon(kind: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("class", kernelClass("AgentActivity", "icon"));
  for (const shape of KIND_SHAPES[kind] ?? KIND_SHAPES.trace!) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", shape.tag);
    for (const [key, value] of Object.entries(shape.attrs)) el.setAttribute(key, value);
    el.setAttribute("stroke", "currentColor");
    el.setAttribute("stroke-width", "1.25");
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    svg.append(el);
  }
  return svg;
}

/**
 * `<kernel-agent-activity>` — one chronological stream of what an agent did:
 * reasoning, searches, tool calls, traces, mixed freely. A real `<ol>`,
 * because order *is* the content in a trace; see `@kernelui-lib/react`'s
 * `<AgentActivity>`, including why there's no connector rail.
 *
 * Attributes: `label` (accessible name, default "Activity").
 */
export class KernelAgentActivity extends KernelElement {
  private childObserver: MutationObserver | null = null;

  static get observedAttributes() {
    return ["label"];
  }

  protected createNative(): HTMLElement {
    const list = document.createElement("ol");
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", "Activity");
    list.className = kernelClass("AgentActivity");
    return list;
  }

  connectedCallback() {
    super.connectedCallback();
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

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "label") this.native.setAttribute("aria-label", value || "Activity");
  }
}

/**
 * `<kernel-agent-activity-item>` — one step in the stream. Host is
 * `display: contents` so its `<li>` sits directly in the parent `<ol>`.
 *
 * `kind="reasoning"` and `kind="tool"` delegate their body to
 * `<kernel-reasoning>` and `<kernel-tool-call>` rather than reimplementing
 * disclosure, streaming, and status behaviour — one source of truth, and
 * both elements stay usable standalone. `search` and `trace` get this
 * element's own `<details>`, height-animated by `DetailsPanelAnimator`.
 *
 * Attributes: `label` (required, the visible one-line description), `kind`
 * ("reasoning" | "search" | "tool" | "trace", default "trace"), `status`
 * ("pending" | "running" | "complete" | "error", default "complete"),
 * `default-open`. A step with no children renders as a plain status line.
 */
export class KernelAgentActivityItem extends KernelElement {
  private animator: DetailsPanelAnimator | undefined;
  private delegate: HTMLElement | null = null;

  static get observedAttributes() {
    return ["label", "kind", "status"];
  }

  connectedCallback() {
    if (this.native) return;
    this.style.display = "contents";

    const adopted = Array.from(this.childNodes);
    for (const node of adopted) node.parentNode?.removeChild(node);
    const hasBody = adopted.some(
      (node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim() !== "",
    );

    const kind = this.getAttribute("kind") || "trace";
    const status = this.getAttribute("status") || "complete";
    const label = this.getAttribute("label") || "";
    const delegates = kind === "reasoning" || kind === "tool";

    const item = document.createElement("li");
    item.className = kernelClass("AgentActivity", "item");
    item.dataset.kind = kind;
    item.dataset.status = status;
    if (delegates) item.dataset.delegated = "true";

    if (!delegates) {
      const marker = document.createElement("span");
      marker.className = kernelClass("AgentActivity", "marker");
      marker.setAttribute("aria-hidden", "true");
      marker.append(kindIcon(kind));
      item.append(marker);
    }

    if (kind === "reasoning") {
      const reasoning = document.createElement("kernel-reasoning");
      reasoning.setAttribute("duration-label", label);
      if (status === "running") reasoning.setAttribute("streaming", "");
      reasoning.append(...adopted);
      this.delegate = reasoning;
      item.append(reasoning);
    } else if (kind === "tool") {
      const tool = document.createElement("kernel-tool-call");
      tool.setAttribute("label", label);
      tool.setAttribute("status", status);
      tool.append(...adopted);
      this.delegate = tool;
      item.append(tool);
    } else if (hasBody) {
      const details = document.createElement("details");
      details.className = kernelClass("AgentActivity", "disclosure");

      const summary = document.createElement("summary");
      summary.className = kernelClass("AgentActivity", "trigger");
      const labelEl = document.createElement("span");
      labelEl.className = kernelClass("AgentActivity", "label");
      labelEl.textContent = label;

      const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chevron.setAttribute("viewBox", "0 0 16 16");
      chevron.setAttribute("fill", "none");
      chevron.setAttribute("aria-hidden", "true");
      chevron.setAttribute("class", kernelClass("AgentActivity", "chevron"));
      const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      chevronPath.setAttribute("d", CHEVRON_PATH);
      chevronPath.setAttribute("stroke", "currentColor");
      chevronPath.setAttribute("stroke-width", "1.75");
      chevronPath.setAttribute("stroke-linecap", "round");
      chevronPath.setAttribute("stroke-linejoin", "round");
      chevron.append(chevronPath);
      summary.append(labelEl, chevron);

      const content = document.createElement("div");
      content.className = kernelClass("AgentActivity", "content");
      content.append(...adopted);

      details.append(summary, content);
      item.append(details);

      this.animator = new DetailsPanelAnimator(details, content);
      if (this.hasAttribute("default-open")) this.animator.snapOpen(true);
    } else {
      const labelEl = document.createElement("span");
      labelEl.className = kernelClass("AgentActivity", "label");
      labelEl.textContent = label;
      if (status === "running") labelEl.setAttribute("role", "status");
      item.append(labelEl);
    }

    this.native = item;
    this.append(item);
  }

  disconnectedCallback() {
    this.animator?.destroy();
    this.animator = undefined;
  }

  protected syncAttr(name: string, value: string | null) {
    const item = this.native;
    if (!item) return;

    if (name === "status") {
      item.dataset.status = value || "complete";
      // A delegated body owns its own status rendering; keep it in step.
      if (this.delegate?.tagName === "KERNEL-TOOL-CALL") {
        this.delegate.setAttribute("status", value || "complete");
      } else if (this.delegate?.tagName === "KERNEL-REASONING") {
        this.delegate.toggleAttribute("streaming", value === "running");
      }
      return;
    }
    if (name === "kind") {
      item.dataset.kind = value || "trace";
      return;
    }
    if (name === "label") {
      const text = value ?? "";
      if (this.delegate?.tagName === "KERNEL-TOOL-CALL") {
        this.delegate.setAttribute("label", text);
      } else if (this.delegate?.tagName === "KERNEL-REASONING") {
        this.delegate.setAttribute("duration-label", text);
      } else {
        const labelEl = item.querySelector<HTMLElement>(
          `.${kernelClass("AgentActivity", "label")}`,
        );
        if (labelEl) labelEl.textContent = text;
      }
    }
  }
}

customElements.define("kernel-agent-activity", KernelAgentActivity);
customElements.define("kernel-agent-activity-item", KernelAgentActivityItem);
