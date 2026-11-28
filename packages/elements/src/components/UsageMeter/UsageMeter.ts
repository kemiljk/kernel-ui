import { FORWARDED_ARIA_ATTRIBUTES, KernelElement, kernelClass } from "../../base";
import "./UsageMeter.css";

let nextId = 0;

type Level = "ok" | "warning" | "danger";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Same region algorithm as `@kernelui-lib/react`'s `usageMeterLevel`: the
 * HTML spec's `<meter>` regions, plus "a full meter is danger" when less
 * is better. */
export function usageMeterLevel(options: {
  value: number;
  min?: number;
  max: number;
  low?: number;
  high?: number;
  optimum?: number;
}): Level {
  const min = options.min ?? 0;
  const max = Math.max(min, options.max);
  const value = clamp(options.value, min, max);
  const low = clamp(options.low ?? min, min, max);
  const high = clamp(options.high ?? max, low, max);
  const optimum = clamp(options.optimum ?? min, min, max);
  let level: Level;
  if (optimum < low) {
    level = value < low ? "ok" : value <= high ? "warning" : "danger";
  } else if (optimum > high) {
    level = value > high ? "ok" : value >= low ? "warning" : "danger";
  } else {
    level = value >= low && value <= high ? "ok" : "warning";
  }
  if (optimum < max && value >= max && max > min) level = "danger";
  return level;
}

/**
 * `<kernel-usage-meter>` — token, credit or quota usage on a real
 * `<meter>` with a real `<label for>`. The formatted text
 * ("12,340 / 200,000 tokens", via `Intl.NumberFormat`) is the meter's
 * `aria-valuetext`, so it's read with its unit, and the visible copy is
 * `aria-hidden` so it isn't read twice. Colour follows the browser's own
 * meter region algorithm (warning above `high`, danger past `low` and
 * `high`, and always danger when full). Mirrors `@kernelui-lib/react`'s
 * `<UsageMeter>`.
 *
 * Attributes: `label`, `value`, `min` (default 0), `max`, `low`, `high`,
 * `optimum` (default `min`: less is better), `unit`, `locale`,
 * `hide-label` (boolean), `description`.
 *
 * `aria-label`, `aria-labelledby` and `aria-describedby` on the host are
 * forwarded to the `<meter>`; an authored `aria-describedby` is added
 * after the description's id.
 */
export class KernelUsageMeter extends KernelElement {
  private readonly meterId = `kernel-usage-meter-${++nextId}`;
  private labelEl: HTMLLabelElement | null = null;
  private valueEl: HTMLSpanElement | null = null;
  private meterEl: HTMLMeterElement | null = null;
  private descriptionEl: HTMLParagraphElement | null = null;

  static get observedAttributes() {
    return [...FORWARDED_ARIA_ATTRIBUTES, "label", "value", "min", "max", "low", "high", "optimum", "unit", "locale", "hide-label", "description"];
  }

  protected ariaTarget() {
    return this.meterEl;
  }

  protected syncDescribedBy() {
    this.render();
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("UsageMeter");
    root.setAttribute("data-slot", "usage-meter");

    const header = document.createElement("div");
    header.className = kernelClass("UsageMeter", "header");
    const label = document.createElement("label");
    label.htmlFor = this.meterId;
    label.setAttribute("data-slot", "usage-meter-label");
    const value = document.createElement("span");
    value.className = kernelClass("UsageMeter", "value");
    value.setAttribute("aria-hidden", "true");
    value.setAttribute("data-slot", "usage-meter-value");
    header.append(label, value);

    const meter = document.createElement("meter");
    meter.id = this.meterId;
    meter.className = kernelClass("UsageMeter", "meter");
    meter.setAttribute("data-slot", "usage-meter-control");

    const description = document.createElement("p");
    description.id = `${this.meterId}-description`;
    description.className = kernelClass("UsageMeter", "description");
    description.setAttribute("data-slot", "usage-meter-description");

    root.append(header, meter, description);
    this.labelEl = label;
    this.valueEl = value;
    this.meterEl = meter;
    this.descriptionEl = description;
    this.replaceChildren(root);
    this.native = root;
    this.render();
    for (const name of FORWARDED_ARIA_ATTRIBUTES) this.forwardAria(name, this.getAttribute(name));
  }

  protected syncAttr() {
    this.render();
  }

  private num(name: string): number | undefined {
    const raw = this.getAttribute(name);
    if (raw === null || raw === "") return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }

  private render() {
    const root = this.native;
    const { labelEl, valueEl, meterEl, descriptionEl } = this;
    if (!root || !labelEl || !valueEl || !meterEl || !descriptionEl) return;

    const min = this.num("min") ?? 0;
    const max = this.num("max") ?? 1;
    const value = this.num("value") ?? 0;
    const low = this.num("low");
    const high = this.num("high");
    const optimum = this.num("optimum") ?? min;
    const unit = this.getAttribute("unit");
    const locale = this.getAttribute("locale") ?? undefined;
    const format = new Intl.NumberFormat(locale);
    const text = `${format.format(value)} / ${format.format(max)}${unit ? ` ${unit}` : ""}`;

    root.dataset.level = usageMeterLevel({ value, min, max, low, high, optimum });
    labelEl.textContent = this.getAttribute("label") ?? "";
    labelEl.className = [kernelClass("UsageMeter", "label"), this.hasAttribute("hide-label") ? "kernel-sr-only" : ""]
      .filter(Boolean)
      .join(" ");
    valueEl.textContent = text;

    meterEl.min = min;
    meterEl.max = max;
    meterEl.value = value;
    if (low !== undefined) meterEl.low = low;
    else meterEl.removeAttribute("low");
    if (high !== undefined) meterEl.high = high;
    else meterEl.removeAttribute("high");
    meterEl.optimum = optimum;
    meterEl.setAttribute("aria-valuetext", text);

    const description = this.getAttribute("description");
    descriptionEl.textContent = description ?? "";
    descriptionEl.hidden = !description;
    this.setDescribedBy(meterEl, [description && descriptionEl.id]);
  }
}

customElements.define("kernel-usage-meter", KernelUsageMeter);
