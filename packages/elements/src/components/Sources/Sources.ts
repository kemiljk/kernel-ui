import { KernelElement, kernelClass } from "../../base";
import "./Sources.css";

function hostFromHref(href: string | null): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href.replace(/^https?:\/\//, "").split("/")[0] || undefined;
  }
}

function externalArrow(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", kernelClass("Sources", "arrow"));
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4.5 11.5 11.5 4.5M6 4.5h5.5V10");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

/**
 * `<kernel-sources>` — a list of cited sources under an AI response.
 * Owns a `<section>` with an optional heading and a `<ul>` that holds
 * `<kernel-source>` children.
 *
 * Attributes: `heading` (default "Sources"; set to empty string to omit).
 */
export class KernelSources extends KernelElement {
  static get observedAttributes() {
    return ["heading"];
  }

  protected createNative(): HTMLElement {
    const section = document.createElement("section");
    section.className = kernelClass("Sources");

    const heading = document.createElement("h3");
    heading.className = kernelClass("Sources", "heading");
    heading.textContent = "Sources";

    const list = document.createElement("ul");
    list.className = kernelClass("Sources", "list");

    section.append(heading, list);
    return section;
  }

  protected moveChildrenInto(target: Node) {
    const list = (target as HTMLElement).querySelector("ul");
    if (!list) return;
    while (this.firstChild) list.appendChild(this.firstChild);
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "heading" || !this.native) return;
    let heading = this.native.querySelector<HTMLElement>("h3");
    if (value === "") {
      heading?.remove();
      return;
    }
    if (!heading) {
      heading = document.createElement("h3");
      heading.className = kernelClass("Sources", "heading");
      this.native.insertBefore(heading, this.native.firstChild);
    }
    heading.textContent = value ?? "Sources";
  }
}

/**
 * `<kernel-source>` — one cited source link. Host uses `display: contents`
 * so its `<li>` participates under the parent list.
 *
 * Attributes: `href` (required for navigation), `title`, `host`
 * (defaults from `href`), `index` (optional citation number).
 */
export class KernelSource extends KernelElement {
  static get observedAttributes() {
    return ["href", "title", "host", "index"];
  }

  connectedCallback() {
    this.style.display = "contents";
    super.connectedCallback();
  }

  protected createNative(): HTMLElement {
    const item = document.createElement("li");
    item.className = kernelClass("Sources", "item");

    const link = document.createElement("a");
    link.className = kernelClass("Sources", "link");
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const index = document.createElement("span");
    index.className = kernelClass("Sources", "index");
    index.hidden = true;

    const title = document.createElement("span");
    title.className = kernelClass("Sources", "title");

    const sep = document.createElement("span");
    sep.className = kernelClass("Sources", "sep");
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "·";
    sep.hidden = true;

    const host = document.createElement("span");
    host.className = kernelClass("Sources", "host");
    host.hidden = true;

    link.append(index, title, sep, host, externalArrow());
    item.append(link);
    return item;
  }

  protected moveChildrenInto(_target: Node) {
    // Title comes from the `title` attribute; light-DOM children are unused.
  }

  protected syncAttr(name: string, value: string | null) {
    const link = this.native?.querySelector("a");
    if (!link) return;
    const index = link.querySelector(`.${kernelClass("Sources", "index")}`) as HTMLElement | null;
    const title = link.querySelector(`.${kernelClass("Sources", "title")}`);
    const sep = link.querySelector(`.${kernelClass("Sources", "sep")}`) as HTMLElement | null;
    const host = link.querySelector(`.${kernelClass("Sources", "host")}`) as HTMLElement | null;

    if (name === "href") {
      if (value) link.href = value;
      else link.removeAttribute("href");
      if (host && !this.hasAttribute("host")) {
        const derived = hostFromHref(value);
        if (derived) {
          host.hidden = false;
          host.textContent = derived;
          if (sep) sep.hidden = false;
        } else {
          host.hidden = true;
          host.textContent = "";
          if (sep) sep.hidden = true;
        }
      }
    } else if (name === "title" && title) {
      title.textContent = value ?? "";
    } else if (name === "host" && host && sep) {
      if (value) {
        host.hidden = false;
        host.textContent = value;
        sep.hidden = false;
      } else {
        const derived = hostFromHref(this.getAttribute("href"));
        if (derived) {
          host.hidden = false;
          host.textContent = derived;
          sep.hidden = false;
        } else {
          host.hidden = true;
          host.textContent = "";
          sep.hidden = true;
        }
      }
    } else if (name === "index" && index) {
      if (value != null && value !== "") {
        index.hidden = false;
        index.textContent = value;
      } else {
        index.hidden = true;
        index.textContent = "";
      }
    }
  }
}

/**
 * `<kernel-citation>` — a compact numbered citation chip for use inside
 * response prose. Attributes: `index` (required), `href`.
 */
export class KernelCitation extends KernelElement {
  static get observedAttributes() {
    return ["index", "href"];
  }

  protected createNative(): HTMLElement {
    const link = document.createElement("a");
    link.className = kernelClass("Sources", "citation");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  protected moveChildrenInto(_target: Node) {
    // Content is the index attribute.
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "href") {
      if (value) (this.native as HTMLAnchorElement).href = value;
      else this.native.removeAttribute("href");
    } else if (name === "index") {
      this.native.textContent = value ?? "";
    }
  }
}

customElements.define("kernel-sources", KernelSources);
customElements.define("kernel-source", KernelSource);
customElements.define("kernel-citation", KernelCitation);
