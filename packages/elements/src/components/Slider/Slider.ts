import { KernelElement, kernelClass } from "../../base";
import "./Slider.css";

let sliderCounter = 0;

/**
 * `<kernel-slider>` — a real `<input type="range">`. Dragging, arrow-key
 * stepping, Page Up/Down, Home/End, and touch support are all native.
 * The filled portion of the track has no standardised styling API yet,
 * so this computes the fill ratio on every `input` event and feeds it
 * back in as CSS custom properties (`--ratio`, `--percent`) on the root,
 * the same hand-off `@kernelui-lib/react`'s `<Slider>` does.
 *
 * `variant="inset"` turns the track into a full-height control (control
 * height and radius, like Button or Tabs) that fills with the accent
 * colour, dragged by a slim bar inside the fill. The fill is one
 * element clipped to the thumb's edge, carrying an on-accent copy of
 * the `start-label`/`end-label` captions so each changes colour exactly
 * where the fill crosses it; both caption layers are `aria-hidden`.
 * The drag bar is a real element so it can be measured: when it would
 * land on a caption the track gets `data-overlap`, and the bar steps
 * aside at rest while the caption steps aside during hover, drag or
 * keyboard focus — see `@kernelui-lib/react`'s `<Slider>`.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `value` (default 0),
 * `min` (default 0), `max` (default 100), `step` (default 1),
 * `show-value` (boolean — shows the current number next to the label),
 * `variant` (`default` | `inset`), `start-label` / `end-label` (inset
 * only — captions pinned inside the track's ends), `disabled`, `name`.
 */
export class KernelSlider extends KernelElement {
  private readonly generatedId = `kernel-slider-${++sliderCounter}`;
  private track: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "value",
      "min",
      "max",
      "step",
      "show-value",
      "variant",
      "start-label",
      "end-label",
      "disabled",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) {
      this.observeTrack();
      return;
    }
    const root = document.createElement("div");
    root.className = kernelClass("Slider");

    const id = this.getAttribute("id") || this.generatedId;

    const labelRow = document.createElement("div");
    labelRow.className = kernelClass("Slider", "labelRow");

    const label = document.createElement("label");
    label.className = kernelClass("Slider", "label");
    label.htmlFor = id;

    labelRow.append(label);

    const input = document.createElement("input");
    input.id = id;
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = "0";
    input.className = kernelClass("Slider", "input");
    input.addEventListener("input", () => {
      this.updatePercent();
      this.setAttribute("value", input.value);
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const track = document.createElement("div");
    track.className = kernelClass("Slider", "track");
    const fill = document.createElement("div");
    fill.className = kernelClass("Slider", "fill");
    fill.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.className = kernelClass("Slider", "bar");
    bar.setAttribute("aria-hidden", "true");
    track.append(fill, bar);
    this.track = track;

    root.append(labelRow, input);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
    this.renderVariant();
    this.updatePercent();
    this.observeTrack();
  }

  private observeTrack() {
    if (!this.track || this.resizeObserver || typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => this.measureOverlap());
    this.resizeObserver.observe(this.track);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector("input") ?? null;
  }

  private updatePercent() {
    const input = this.input;
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const ratio =
      max > min ? Math.min(Math.max((Number(input.value) - min) / (max - min), 0), 1) : 0;
    this.native?.style.setProperty("--ratio", String(ratio));
    this.native?.style.setProperty("--percent", `${ratio * 100}%`);
    this.measureOverlap();
  }

  /** Marks which caption, if any, the drag bar sits on (6px clearance).
   * Reads the base caption layer; the fill holds an identical copy. */
  private measureOverlap() {
    const track = this.track;
    if (!track) return;
    const bar = track.querySelector(`.${kernelClass("Slider", "bar")}`);
    const captions = track.querySelectorAll(`:scope > .${kernelClass("Slider", "ends")} > span`);
    let overlap: "start" | "end" | null = null;
    if (this.inset && bar && captions.length === 2) {
      const b = bar.getBoundingClientRect();
      const hits = (caption: Element) => {
        const c = caption.getBoundingClientRect();
        return c.width > 0 && b.right + 6 > c.left && b.left - 6 < c.right;
      };
      if (hits(captions[0]!)) overlap = "start";
      else if (hits(captions[1]!)) overlap = "end";
    }
    if (overlap) track.dataset.overlap = overlap;
    else delete track.dataset.overlap;
  }

  private get inset(): boolean {
    return this.getAttribute("variant") === "inset";
  }

  /** Moves the one input between the bare default layout and the inset
   * track, so switching `variant` at runtime keeps focus, value and any
   * listeners attached to the same element. */
  private renderVariant() {
    const root = this.native;
    const input = this.input;
    const track = this.track;
    if (!root || !input || !track) return;
    const inset = this.inset;
    root.dataset.variant = inset ? "inset" : "default";
    input.className = kernelClass("Slider", inset ? "insetInput" : "input");
    if (inset) {
      track.append(input);
      root.append(track);
    } else {
      root.append(input);
      track.remove();
    }
    this.renderEnds();
  }

  private renderEnds() {
    const track = this.track;
    const fill = track?.querySelector(`.${kernelClass("Slider", "fill")}`);
    if (!track || !fill) return;
    track.querySelectorAll(`.${kernelClass("Slider", "ends")}`).forEach((el) => el.remove());
    const start = this.getAttribute("start-label");
    const end = this.getAttribute("end-label");
    if (!this.inset || (start === null && end === null)) return;
    const makeEnds = () => {
      const ends = document.createElement("div");
      ends.className = kernelClass("Slider", "ends");
      ends.setAttribute("aria-hidden", "true");
      const startSpan = document.createElement("span");
      startSpan.textContent = start ?? "";
      const endSpan = document.createElement("span");
      endSpan.textContent = end ?? "";
      ends.append(startSpan, endSpan);
      return ends;
    };
    track.prepend(makeEnds());
    fill.append(makeEnds());
    this.measureOverlap();
  }

  private renderValue() {
    const root = this.native;
    const input = this.input;
    if (!root || !input) return;
    root.querySelector(`.${kernelClass("Slider", "value")}`)?.remove();
    if (!this.hasAttribute("show-value")) return;
    const span = document.createElement("span");
    span.className = kernelClass("Slider", "value");
    span.textContent = input.value;
    root.querySelector(`.${kernelClass("Slider", "labelRow")}`)?.append(span);
  }

  protected syncAttr(name: string, value: string | null) {
    const input = this.input;
    if (!input) return;

    switch (name) {
      case "label": {
        const label = this.native?.querySelector("label");
        if (label) label.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const label = this.native?.querySelector("label");
        label?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "value":
        input.value = value ?? "0";
        this.updatePercent();
        this.renderValue();
        break;
      case "min":
        input.min = value ?? "0";
        this.updatePercent();
        break;
      case "max":
        input.max = value ?? "100";
        this.updatePercent();
        break;
      case "step":
        input.step = value ?? "1";
        break;
      case "show-value":
        this.renderValue();
        break;
      case "variant":
        this.renderVariant();
        break;
      case "start-label":
      case "end-label":
        this.renderEnds();
        break;
      case "disabled":
        input.disabled = value !== null;
        break;
      case "name":
        if (value === null) input.removeAttribute("name");
        else input.name = value;
        break;
    }
  }
}

customElements.define("kernel-slider", KernelSlider);
