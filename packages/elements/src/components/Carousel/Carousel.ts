import { KernelElement, dataAttr, kernelClass } from "../../base";
import "./Carousel.css";

const PREV_PATH = "M10 3L5 8L10 13";
const NEXT_PATH = "M6 3L11 8L6 13";

function arrowIcon(path: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
}

/**
 * `<kernel-carousel>` — a real scroll container: `scroll-snap-type` +
 * native overflow scrolling do the actual carousel work (touch,
 * trackpad, momentum, arrow keys once focused), not a JS drag engine.
 * The only JS here is wiring Prev/Next/dots to `scrollIntoView` and an
 * `IntersectionObserver` that watches which slide is actually visible.
 *
 * Unlike `@kernelui-lib/react`'s version (which supports slides mounting
 * and unmounting dynamically via a register/unregister callback), this
 * reads its `<kernel-carousel-slide>` children once at connect — the
 * common case for a declarative-markup custom element. A future pass
 * could add a `MutationObserver` if dynamic slide lists turn out to be
 * needed.
 *
 * Attributes: `aria-label` (required).
 */
export class KernelCarousel extends KernelElement {
  private order: HTMLElement[] = [];
  private currentIndex = -1;
  private observer: IntersectionObserver | null = null;
  private prevButton!: HTMLButtonElement;
  private nextButton!: HTMLButtonElement;
  private dotButtons: HTMLButtonElement[] = [];
  private buildScheduled = false;

  static get observedAttributes() {
    return ["aria-label"];
  }

  connectedCallback() {
    if (this.native || this.buildScheduled) return;
    this.buildScheduled = true;
    // Deferred to a microtask: <kernel-carousel-slide> children need
    // their own native <div> built (in their own connectedCallback)
    // before this can find it via querySelector — see the identical
    // note in Tabs.ts for why a synchronous parent-then-children
    // upgrade order makes that unsafe to assume here.
    queueMicrotask(() => this.build());
  }

  private build() {
    const root = document.createElement("div");
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.className = kernelClass("Carousel");
    if (this.getAttribute("aria-label")) root.setAttribute("aria-label", this.getAttribute("aria-label")!);

    const track = document.createElement("div");
    track.className = kernelClass("Carousel", "track");
    track.tabIndex = 0;

    const slideHosts = Array.from(this.querySelectorAll("kernel-carousel-slide"));
    for (const host of slideHosts) track.append(host);

    this.order = slideHosts
      .map((host) => host.querySelector(`.${kernelClass("Carousel", "slide")}`))
      .filter((el): el is HTMLElement => !!el);

    this.prevButton = document.createElement("button");
    this.prevButton.type = "button";
    this.prevButton.setAttribute("aria-label", "Previous slide");
    this.prevButton.className = kernelClass("Carousel", "prev");
    this.prevButton.append(arrowIcon(PREV_PATH));
    this.prevButton.addEventListener("click", () => {
      const target = this.order[this.currentIndex - 1];
      if (target) this.scrollToSlide(target);
    });

    this.nextButton = document.createElement("button");
    this.nextButton.type = "button";
    this.nextButton.setAttribute("aria-label", "Next slide");
    this.nextButton.className = kernelClass("Carousel", "next");
    this.nextButton.append(arrowIcon(NEXT_PATH));
    this.nextButton.addEventListener("click", () => {
      const target = this.order[this.currentIndex + 1];
      if (target) this.scrollToSlide(target);
    });

    // Its own positioning context, separate from root — .prev/.next
    // center against this box's own height (the track's), not root's,
    // which also includes .dots below and would pull the arrows
    // off-center toward the top.
    const viewport = document.createElement("div");
    viewport.className = kernelClass("Carousel", "viewport");
    viewport.append(track, this.prevButton, this.nextButton);
    root.append(viewport);

    if (this.order.length > 1) {
      const dots = document.createElement("div");
      dots.className = kernelClass("Carousel", "dots");
      this.order.forEach((slide, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
        dot.className = kernelClass("Carousel", "dot");
        dot.addEventListener("click", () => this.scrollToSlide(slide));
        dots.append(dot);
        this.dotButtons.push(dot);
      });
      root.append(dots);
    }

    this.native = root;
    this.append(root);
    this.updateControls();

    if (this.order.length > 0) {
      const ratios = new Map<HTMLElement, number>();
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) ratios.set(entry.target as HTMLElement, entry.intersectionRatio);
          let bestSlide: HTMLElement | null = null;
          let bestRatio = 0;
          for (const slide of this.order) {
            const ratio = ratios.get(slide) ?? 0;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestSlide = slide;
            }
          }
          if (bestSlide) {
            this.currentIndex = this.order.indexOf(bestSlide);
            this.updateControls();
          }
        },
        { root: track, threshold: [0.25, 0.5, 0.75, 0.98] },
      );
      for (const slide of this.order) this.observer.observe(slide);
    }
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "aria-label" || !this.native) return;
    if (value === null) this.native.removeAttribute("aria-label");
    else this.native.setAttribute("aria-label", value);
  }

  private scrollToSlide(slide: HTMLElement) {
    slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  private updateControls() {
    this.prevButton.disabled = this.currentIndex <= 0;
    this.nextButton.disabled = this.currentIndex === -1 || this.currentIndex >= this.order.length - 1;

    this.order.forEach((slide, index) => {
      const current = dataAttr(index === this.currentIndex);
      if (current) slide.setAttribute("aria-current", current);
      else slide.removeAttribute("aria-current");
    });

    this.dotButtons.forEach((dot, index) => {
      const current = dataAttr(index === this.currentIndex);
      if (current) {
        dot.setAttribute("data-current", current);
        dot.setAttribute("aria-current", current);
      } else {
        dot.removeAttribute("data-current");
        dot.removeAttribute("aria-current");
      }
    });
  }
}

/** `<kernel-carousel-slide>` — full-width-per-slide (`flex: 0 0 100%`),
 * so the carousel reads as one slide at a time. */
export class KernelCarouselSlide extends KernelElement {
  protected createNative(): HTMLElement {
    const div = document.createElement("div");
    div.setAttribute("role", "group");
    div.setAttribute("aria-roledescription", "slide");
    div.className = kernelClass("Carousel", "slide");
    return div;
  }
}

customElements.define("kernel-carousel", KernelCarousel);
customElements.define("kernel-carousel-slide", KernelCarouselSlide);
