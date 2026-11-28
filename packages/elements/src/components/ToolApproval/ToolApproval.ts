import { KernelElement, kernelClass } from "../../base";
import "../Button/Button.css";
import "./ToolApproval.css";

let nextId = 0;

const SHIELD =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">' +
  '<path d="M8 1.75 13.25 3.5v4.25c0 3.1-2.2 5.5-5.25 6.5-3.05-1-5.25-3.4-5.25-6.5V3.5L8 1.75Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" /></svg>';
const APPROVED =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">' +
  '<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.25" />' +
  '<path d="M5.25 8.25 7 10l3.75-4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" /></svg>';
const DENIED =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">' +
  '<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.25" />' +
  '<path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" /></svg>';

type Status = "pending" | "approved" | "denied";

const LABELS = {
  "approve-label": "Approve",
  "deny-label": "Deny",
  "always-allow-label": "Always allow",
  "approved-label": "Approved",
  "always-allowed-label": "Always allowed",
  "denied-label": "Denied",
} as const;

/**
 * `<kernel-tool-approval>` — the prompt an agent shows before it runs a
 * tool. A `<section role="group">` named by its own real heading (a
 * group, not a landmark region, so a long transcript of them doesn't
 * flood the landmark list). Mirrors `@kernelui-lib/react`'s
 * `<ToolApproval>`.
 *
 * The actions are real `<button>`s with `<kernel-button>`'s classes.
 * Pressing one dispatches a bubbling, cancelable `approve`, `deny` or
 * `always-allow` CustomEvent. Unless a listener calls `preventDefault()`,
 * the element then sets its own `status` attribute, which replaces the
 * buttons with a status line in a `role="status"` live region that has
 * been in the page from the start, so the outcome is announced politely.
 * If focus was on a button that disappeared, it moves to the status line.
 *
 * Attributes: `tool` (the tool's name), `heading` (replaces the default
 * "Allow {tool} to run?"), `heading-level` (1–6, default 3), `status`
 * (`pending` | `approved` | `denied`, default `pending`), `always-allow`
 * (boolean: show the "Always allow" button), and text overrides
 * `approve-label`, `deny-label`, `always-allow-label`, `approved-label`,
 * `always-allowed-label`, `denied-label`. Children are the body: a
 * summary, arguments, a `<kernel-code-block>`.
 */
export class KernelToolApproval extends KernelElement {
  private readonly baseId = `kernel-tool-approval-${++nextId}`;
  private headingEl: HTMLElement | null = null;
  private statusEl: HTMLParagraphElement | null = null;
  private actionsEl: HTMLDivElement | null = null;
  private footerEl: HTMLDivElement | null = null;
  private alwaysAllowed = false;
  private restoreFocus = false;

  static get observedAttributes() {
    return ["tool", "heading", "heading-level", "status", "always-allow", ...Object.keys(LABELS)];
  }

  connectedCallback() {
    if (this.native) return;
    const section = document.createElement("section");
    section.className = kernelClass("ToolApproval");
    section.setAttribute("role", "group");
    section.setAttribute("aria-labelledby", `${this.baseId}-title`);
    section.setAttribute("data-slot", "tool-approval");

    const header = document.createElement("div");
    header.className = kernelClass("ToolApproval", "header");
    const icon = document.createElement("span");
    icon.className = kernelClass("ToolApproval", "icon");
    icon.innerHTML = SHIELD;
    header.append(icon);

    const bodyNodes = Array.from(this.childNodes).filter(
      (node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim() !== "",
    );
    section.append(header);
    if (bodyNodes.length > 0) {
      const body = document.createElement("div");
      body.className = kernelClass("ToolApproval", "body");
      body.setAttribute("data-slot", "tool-approval-body");
      body.append(...bodyNodes);
      section.append(body);
    }
    this.replaceChildren();

    const footer = document.createElement("div");
    footer.className = kernelClass("ToolApproval", "footer");
    const status = document.createElement("p");
    status.className = kernelClass("ToolApproval", "status");
    status.setAttribute("role", "status");
    status.setAttribute("data-slot", "tool-approval-status");
    status.tabIndex = -1;
    footer.append(status);
    section.append(footer);

    this.statusEl = status;
    this.footerEl = footer;
    this.native = section;
    this.renderHeading();
    this.append(section);
    this.render();
  }

  private label(name: keyof typeof LABELS): string {
    return this.getAttribute(name) ?? LABELS[name];
  }

  private get status(): Status {
    const value = this.getAttribute("status");
    return value === "approved" || value === "denied" ? value : "pending";
  }

  private renderHeading() {
    const header = this.native?.querySelector(`.${kernelClass("ToolApproval", "header")}`);
    if (!header) return;
    const raw = Number(this.getAttribute("heading-level") ?? 3);
    const level = Number.isInteger(raw) && raw >= 1 && raw <= 6 ? raw : 3;
    const heading = document.createElement(`h${level}`);
    heading.id = `${this.baseId}-title`;
    heading.className = kernelClass("ToolApproval", "title");
    heading.setAttribute("data-slot", "tool-approval-title");
    const custom = this.getAttribute("heading");
    if (custom !== null) {
      heading.textContent = custom;
    } else {
      const code = document.createElement("code");
      code.className = kernelClass("ToolApproval", "tool");
      code.textContent = this.getAttribute("tool") ?? "";
      heading.append("Allow ", code, " to run?");
    }
    if (this.headingEl) this.headingEl.replaceWith(heading);
    else header.append(heading);
    this.headingEl = heading;
  }

  private button(variant: string, text: string, onClick: () => void, extraClass?: string) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [kernelClass("Button"), extraClass].filter(Boolean).join(" ");
    button.setAttribute("data-slot", "button");
    button.dataset.variant = variant;
    button.dataset.size = "sm";
    const label = document.createElement("span");
    label.className = kernelClass("Button", "label");
    label.textContent = text;
    button.append(label);
    button.addEventListener("click", onClick);
    return button;
  }

  private decide(event: "approve" | "deny" | "always-allow") {
    const allowed = this.dispatchEvent(
      new CustomEvent(event, { bubbles: true, cancelable: true, detail: { tool: this.getAttribute("tool") } }),
    );
    if (!allowed) return;
    this.restoreFocus = Boolean(this.actionsEl?.contains(document.activeElement));
    this.alwaysAllowed = event === "always-allow";
    this.setAttribute("status", event === "deny" ? "denied" : "approved");
  }

  private render() {
    const section = this.native;
    const status = this.statusEl;
    const footer = this.footerEl;
    if (!section || !status || !footer) return;
    const current = this.status;
    section.dataset.status = current;

    if (current === "pending") {
      this.alwaysAllowed = false;
      status.replaceChildren();
      this.actionsEl?.remove();
      const actions = document.createElement("div");
      actions.className = kernelClass("ToolApproval", "actions");
      actions.setAttribute("data-slot", "tool-approval-actions");
      if (this.hasAttribute("always-allow")) {
        actions.append(
          this.button("ghost", this.label("always-allow-label"), () => this.decide("always-allow"), kernelClass("ToolApproval", "alwaysAllow")),
        );
      }
      // Deny and Approve wrap as a pair, so a narrow prompt never strands
      // Approve on a line of its own.
      const decision = document.createElement("div");
      decision.className = kernelClass("ToolApproval", "decision");
      decision.append(
        this.button("secondary", this.label("deny-label"), () => this.decide("deny")),
        this.button("primary", this.label("approve-label"), () => this.decide("approve")),
      );
      actions.append(decision);
      footer.append(actions);
      this.actionsEl = actions;
      return;
    }

    this.actionsEl?.remove();
    this.actionsEl = null;
    const icon = document.createElement("span");
    icon.className = kernelClass("ToolApproval", "statusIcon");
    icon.innerHTML = current === "denied" ? DENIED : APPROVED;
    const text =
      current === "denied"
        ? this.label("denied-label")
        : this.alwaysAllowed
          ? this.label("always-allowed-label")
          : this.label("approved-label");
    status.replaceChildren(icon, document.createTextNode(text));
    if (this.restoreFocus) {
      this.restoreFocus = false;
      status.focus();
    }
  }

  protected syncAttr(name: string) {
    if (!this.native) return;
    if (name === "tool" || name === "heading" || name === "heading-level") this.renderHeading();
    else this.render();
  }
}

customElements.define("kernel-tool-approval", KernelToolApproval);
