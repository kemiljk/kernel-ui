import { KernelElement, kernelClass } from "../../base";
// The renderer builds real Kernel elements, so they must be defined first.
import "../Badge/Badge";
import "../Button/Button";
import "../Callout/Callout";
import "../Card/Card";
import "../Checkbox/Checkbox";
import "../Progress/Progress";
import "../Select/Select";
import "../Separator/Separator";
import "../Switch/Switch";
import "../Table/Table";
import "../TextField/TextField";
import {
  sanitizeSchema,
  type SchemaAction,
  type SchemaChild,
  type SchemaIssue,
  type SchemaJsonValue,
  type SchemaNode,
  type SchemaPropsByType,
  type SchemaValues,
} from "./schema";
import "./SchemaRenderer.css";

interface BuildContext {
  inForm: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K];
function el(tag: string, className?: string): HTMLElement;
function el(tag: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function attrs(node: Element, values: Record<string, string | number | boolean | undefined>) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? "" : String(value));
  }
}

/**
 * `<kernel-schema-renderer>` — renders a model's JSON with real Kernel
 * elements. Mirrors `@kernelui-lib/react`'s `<SchemaRenderer>`: the same
 * schema (`schema.ts` is shared byte for byte), the same allow-list, the
 * same DOM and class names.
 *
 * The input is untrusted, so it goes through `sanitizeSchema` first:
 * unknown node types and props are dropped and reported, URLs pass only
 * as http(s), mailto: (links) or relative, and every string is set as a
 * text node — there is no path to raw HTML. Nothing the model writes can
 * run: a Button or Form fires an `action` event with
 * `{ action, payload, values }` and the page decides what to do.
 *
 * Set the tree with the `value` property (an object) or the `value`
 * attribute (a JSON string). Add `streaming` while it's still arriving:
 * half-typed node types are skipped quietly, issues wait until it's
 * removed, and the root is `aria-busy`. For a stream, parse the
 * accumulated text with `parsePartialJson` on every chunk and assign the
 * result; updates in the same tick are coalesced, and form values and
 * focus are kept across rebuilds by control `name`.
 *
 * Events (all bubbling `CustomEvent`s): `action` (`detail`:
 * `SchemaAction`), `valueschange` (`detail`: `{ values }`), `issue`
 * (`detail`: `SchemaIssue`, once per settled value — call
 * `preventDefault()` to stop the `console.warn` it otherwise logs).
 */
export class KernelSchemaRenderer extends KernelElement {
  private currentValue: unknown = undefined;
  private touched: SchemaValues = {};
  private defaults: SchemaValues = {};
  private scheduled = false;
  private lastIssueKey = "";

  static get observedAttributes() {
    return ["value", "streaming"];
  }

  protected createNative(): HTMLElement {
    const root = el("div", kernelClass("SchemaRenderer"));
    root.setAttribute("data-slot", "schema-renderer");
    return root;
  }

  connectedCallback() {
    if (this.native) return;
    // Children written between the tags aren't part of the schema.
    this.replaceChildren();
    super.connectedCallback();
    this.render();
  }

  /** The schema value: a `SchemaDocument`, a bare node, or an array of nodes. */
  get value(): unknown {
    return this.currentValue;
  }

  set value(next: unknown) {
    this.currentValue = next;
    this.schedule();
  }

  /** Every named form control's current value. */
  get values(): SchemaValues {
    const out: SchemaValues = { ...this.defaults };
    for (const [name, v] of Object.entries(this.touched)) {
      if (name in out) out[name] = v;
    }
    return out;
  }

  protected syncAttr(name: string, value: string | null) {
    if (name === "value") {
      if (value === null) {
        this.currentValue = undefined;
      } else {
        try {
          this.currentValue = JSON.parse(value);
        } catch {
          this.currentValue = undefined;
          this.report([{ code: "invalid-json", path: "value", message: "The value attribute isn't valid JSON." }]);
        }
      }
    }
    this.schedule();
  }

  private schedule() {
    if (!this.native || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.render();
    });
  }

  private report(issues: SchemaIssue[]) {
    for (const issue of issues) {
      const event = new CustomEvent<SchemaIssue>("issue", { detail: issue, bubbles: true, cancelable: true });
      if (this.dispatchEvent(event)) {
        // eslint-disable-next-line no-console
        console.warn(`[kernel] kernel-schema-renderer: ${issue.message} (${issue.path})`);
      }
    }
  }

  private emit(action: string, payload: SchemaJsonValue | undefined) {
    const detail: SchemaAction = { action, values: this.values };
    if (payload !== undefined) detail.payload = payload;
    this.dispatchEvent(new CustomEvent<SchemaAction>("action", { detail, bubbles: true }));
  }

  private setValue(name: string, value: string | boolean) {
    this.touched = { ...this.touched, [name]: value };
    this.dispatchEvent(new CustomEvent("valueschange", { detail: { values: this.values }, bubbles: true }));
  }

  /** A value the user changed wins over the tree's default. */
  private initial(name: string | undefined, fallback: string | boolean | undefined) {
    return name !== undefined && name in this.touched ? this.touched[name] : fallback;
  }

  private render() {
    const root = this.native;
    if (!root) return;
    const streaming = this.hasAttribute("streaming");
    const { nodes, issues, defaultValues } = sanitizeSchema(this.currentValue, { partial: streaming });
    this.defaults = defaultValues;

    // Keep focus (and the caret) on the same control across the rebuild.
    const active = document.activeElement;
    const focusName = active && root.contains(active) ? active.getAttribute("name") : null;
    const caret =
      active instanceof HTMLInputElement && focusName ? [active.selectionStart, active.selectionEnd] : null;

    const fragment = document.createDocumentFragment();
    this.appendChildren(fragment, nodes, { inForm: false });
    root.replaceChildren(fragment);

    if (streaming) {
      root.setAttribute("data-streaming", "true");
      root.setAttribute("aria-busy", "true");
    } else {
      root.removeAttribute("data-streaming");
      root.removeAttribute("aria-busy");
    }

    if (focusName) {
      const target = root.querySelector<HTMLElement>(`[name="${CSS.escape(focusName)}"]`);
      target?.focus();
      if (caret && target instanceof HTMLInputElement) {
        try {
          target.setSelectionRange(caret[0] ?? null, caret[1] ?? null);
        } catch {
          // Inputs like type="email" don't support selection ranges.
        }
      }
    }

    const issueKey = streaming ? "" : JSON.stringify(issues);
    if (issueKey && issueKey !== this.lastIssueKey) this.report(issues);
    this.lastIssueKey = issueKey;
  }

  private appendChildren(parent: Node, children: SchemaChild[] | undefined, ctx: BuildContext) {
    for (const child of children ?? []) {
      parent.appendChild(typeof child === "string" ? document.createTextNode(child) : this.build(child, ctx));
    }
  }

  private build(node: SchemaNode, ctx: BuildContext): Node {
    switch (node.type) {
      case "Stack": {
        const p: SchemaPropsByType["Stack"] = node.props ?? {};
        const div = el("div", kernelClass("SchemaRenderer", "stack"));
        attrs(div, {
          "data-direction": p.direction ?? "vertical",
          "data-gap": p.gap ?? "md",
          "data-align": p.align,
          "data-justify": p.justify,
          "data-wrap": p.wrap ? "true" : undefined,
        });
        this.appendChildren(div, node.children, ctx);
        return div;
      }
      case "Text": {
        const p: SchemaPropsByType["Text"] = node.props ?? {};
        const para = el("p", kernelClass("SchemaRenderer", "text"));
        attrs(para, { "data-tone": p.tone ?? "default", "data-size": p.size ?? "md", "data-weight": p.weight ?? "regular" });
        if (p.text) para.append(p.text);
        this.appendChildren(para, node.children, ctx);
        return para;
      }
      case "Heading": {
        const p: SchemaPropsByType["Heading"] = node.props ?? {};
        const heading = el(`h${p.level ?? 3}`, kernelClass("SchemaRenderer", "heading"));
        heading.setAttribute("data-level", String(p.level ?? 3));
        if (p.text) heading.append(p.text);
        this.appendChildren(heading, node.children, ctx);
        return heading;
      }
      case "Button": {
        const p: SchemaPropsByType["Button"] = node.props ?? {};
        const submits = p.submit === true && ctx.inForm;
        const button = el("kernel-button");
        attrs(button, {
          type: submits ? "submit" : "button",
          variant: p.variant ?? "secondary",
          size: p.size ?? "md",
          disabled: p.disabled,
        });
        button.append(p.label ?? "");
        if (!submits) button.addEventListener("click", () => {
          if (!p.disabled) this.emit(p.action ?? "", p.payload);
        });
        return button;
      }
      case "Badge": {
        const p: SchemaPropsByType["Badge"] = node.props ?? {};
        const badge = el("kernel-badge");
        attrs(badge, { variant: p.variant ?? "neutral" });
        if (p.text) badge.append(p.text);
        return badge;
      }
      case "Card": {
        const p: SchemaPropsByType["Card"] = node.props ?? {};
        const card = el("kernel-card");
        if (p.title || p.description) {
          const header = el("kernel-card-header");
          if (p.title) {
            const title = el("kernel-card-title");
            title.append(p.title);
            header.append(title);
          }
          if (p.description) {
            const description = el("kernel-card-description");
            description.append(p.description);
            header.append(description);
          }
          card.append(header);
        }
        if (node.children?.length) {
          const content = el("kernel-card-content");
          this.appendChildren(content, node.children, ctx);
          card.append(content);
        }
        return card;
      }
      case "Form": {
        const p: SchemaPropsByType["Form"] = node.props ?? {};
        const form = el("form", kernelClass("SchemaRenderer", "form"));
        form.addEventListener("submit", (event) => {
          // Never sent anywhere: no `action` attribute, and the submission
          // becomes an `action` event. Native validation has already run.
          event.preventDefault();
          this.emit(p.action ?? "submit", p.payload);
        });
        this.appendChildren(form, node.children, { ...ctx, inForm: true });
        return form;
      }
      case "TextField": {
        const p: SchemaPropsByType["TextField"] = node.props ?? {};
        const field = el("kernel-text-field");
        attrs(field, {
          label: p.label,
          name: p.name,
          type: p.type ?? "text",
          placeholder: p.placeholder,
          description: p.description,
          value: this.initial(p.name, p.defaultValue) as string | undefined,
          required: p.required,
          disabled: p.disabled,
          "hide-label": p.hideLabel,
        });
        field.addEventListener("input", (event) => {
          if (p.name && event.target instanceof HTMLInputElement) this.setValue(p.name, event.target.value);
        });
        return field;
      }
      case "Select": {
        const p: SchemaPropsByType["Select"] = node.props ?? {};
        const select = el("kernel-select");
        attrs(select, {
          label: p.label,
          name: p.name,
          description: p.description,
          value: this.initial(p.name, p.defaultValue) as string | undefined,
          required: p.required,
          disabled: p.disabled,
        });
        for (const option of p.options ?? []) {
          const opt = el("option");
          opt.value = option.value;
          opt.disabled = option.disabled === true;
          opt.textContent = option.label;
          select.append(opt);
        }
        select.addEventListener("change", (event) => {
          if (p.name && event.target instanceof HTMLSelectElement) this.setValue(p.name, event.target.value);
        });
        return select;
      }
      case "Checkbox": {
        const p: SchemaPropsByType["Checkbox"] = node.props ?? {};
        const checkbox = el("kernel-checkbox");
        attrs(checkbox, {
          name: p.name,
          checked: this.initial(p.name, p.defaultChecked) === true,
          required: p.required,
          disabled: p.disabled,
        });
        checkbox.append(p.label ?? "");
        checkbox.addEventListener("change", (event) => {
          if (p.name && event.target instanceof HTMLInputElement) this.setValue(p.name, event.target.checked);
        });
        return checkbox;
      }
      case "Switch": {
        const p: SchemaPropsByType["Switch"] = node.props ?? {};
        const toggle = el("kernel-switch");
        attrs(toggle, { checked: this.initial(p.name, p.defaultChecked) === true, disabled: p.disabled });
        toggle.append(p.label ?? "");
        toggle.addEventListener("change", (event) => {
          if (p.name && event.target === toggle) this.setValue(p.name, toggle.hasAttribute("checked"));
        });
        return toggle;
      }
      case "Table": {
        const p: SchemaPropsByType["Table"] = node.props ?? {};
        const columns = p.columns ?? [];
        const table = el("kernel-table");
        if (p.caption) {
          const caption = el("kernel-table-caption");
          caption.append(p.caption);
          table.append(caption);
        }
        const head = el("kernel-table-header");
        const headRow = el("kernel-table-row");
        for (const column of columns) {
          const th = el("kernel-table-head");
          th.append(column.label);
          headRow.append(th);
        }
        head.append(headRow);
        const body = el("kernel-table-body");
        for (const row of p.rows ?? []) {
          const tr = el("kernel-table-row");
          for (const column of columns) {
            const td = el("kernel-table-cell");
            const cell = row[column.key];
            td.append(cell === null || cell === undefined ? "" : String(cell));
            tr.append(td);
          }
          body.append(tr);
        }
        table.append(head, body);
        return table;
      }
      case "Callout": {
        const p: SchemaPropsByType["Callout"] = node.props ?? {};
        const callout = el("kernel-callout");
        attrs(callout, { variant: p.variant ?? "info" });
        if (p.title) {
          const title = el("span");
          title.slot = "title";
          title.append(p.title);
          callout.append(title);
        }
        if (p.text) callout.append(p.text);
        this.appendChildren(callout, node.children, ctx);
        return callout;
      }
      case "Separator": {
        const p: SchemaPropsByType["Separator"] = node.props ?? {};
        const separator = el("kernel-separator");
        attrs(separator, { orientation: p.orientation ?? "horizontal" });
        return separator;
      }
      case "Image": {
        const p: SchemaPropsByType["Image"] = node.props ?? {};
        const img = el("img", kernelClass("SchemaRenderer", "image"));
        img.alt = p.alt ?? "";
        if (p.width !== undefined) img.width = p.width;
        if (p.height !== undefined) img.height = p.height;
        img.setAttribute("loading", "lazy");
        img.setAttribute("decoding", "async");
        img.setAttribute("referrerpolicy", "no-referrer");
        if (p.src) img.src = p.src;
        return img;
      }
      case "Link": {
        const p: SchemaPropsByType["Link"] = node.props ?? {};
        const link = el("a", kernelClass("SchemaRenderer", "link"));
        if (p.href) link.setAttribute("href", p.href);
        if (p.external) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        const text = p.text ?? (node.children?.length ? undefined : p.href);
        if (text) link.append(text);
        this.appendChildren(link, node.children, ctx);
        return link;
      }
      case "Progress": {
        const p: SchemaPropsByType["Progress"] = node.props ?? {};
        const progress = el("kernel-progress");
        attrs(progress, { label: p.label, value: p.value, max: p.max ?? 100 });
        return progress;
      }
    }
  }
}

customElements.define("kernel-schema-renderer", KernelSchemaRenderer);
