import { KernelElement, kernelClass } from "../../base";
import "./Attachment.css";

const FILE_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">' +
  '<path d="M9 1.75H4.75a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V5L9 1.75Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" />' +
  '<path d="M9 1.75V5h3.25" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" /></svg>';
const REMOVE_ICON =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="12" height="12">' +
  '<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>';

const SIZE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;

/** Same as `@kernelui-lib/react`'s `formatFileSize`: decimal steps,
 * `Intl.NumberFormat` unit style. */
export function formatFileSize(bytes: number, locale?: string): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1000 && unit < SIZE_UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: SIZE_UNITS[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 || value >= 100 ? 0 : 1,
  }).format(value);
}

function splitName(name: string) {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
  const stem = extension ? name.slice(0, dot) : name;
  const tail = stem.length > 8 ? stem.slice(-4) : "";
  return { start: stem.slice(0, stem.length - tail.length), end: tail + extension, extension };
}

/**
 * `<kernel-attachment-list>` — a row of attachments on a real `<ul>`, with
 * `role="list"` restated because Safari drops list semantics once markers
 * are removed. Each `<kernel-attachment>` inside renders as its `<li>`.
 * Mirrors `@kernelui-lib/react`'s `<AttachmentList>`.
 */
export class KernelAttachmentList extends KernelElement {
  protected createNative(): HTMLElement {
    const list = document.createElement("ul");
    list.className = kernelClass("Attachment", "list");
    list.setAttribute("role", "list");
    list.setAttribute("data-slot", "attachment-list");
    for (const name of ["aria-label", "aria-labelledby"]) {
      const value = this.getAttribute(name);
      if (value !== null) {
        list.setAttribute(name, value);
        this.removeAttribute(name);
      }
    }
    return list;
  }
}

/**
 * `<kernel-attachment>` — a file chip for composers and messages: type
 * icon (or image thumbnail), name, size, optional remove button and
 * upload progress. Inside `<kernel-attachment-list>` it owns a real
 * `<li>` (the host is `display: contents`, since custom elements can't be
 * list items); elsewhere a `<div>`. Mirrors `@kernelui-lib/react`'s
 * `<Attachment>`: the name truncates in the middle so the extension stays
 * visible, upload progress is a real `<progress>` labelled
 * "Uploading {name}", and the remove button is a real `<button>` named
 * "Remove {name}".
 *
 * Attributes: `name`, `size` (bytes), `type` (MIME), `preview-src` (image
 * thumbnail URL), `progress` (0–1; the bar shows while below 1),
 * `removable` (boolean: show the remove button), `remove-label`,
 * `locale`.
 *
 * Events: `remove` (bubbling CustomEvent, `detail.name`) when the remove
 * button is pressed. The element doesn't remove itself — the same as
 * React's `onRemove`, the owner of the file list decides.
 */
export class KernelAttachment extends KernelElement {
  private icon: HTMLSpanElement | null = null;
  private nameEl: HTMLSpanElement | null = null;
  private metaEl: HTMLSpanElement | null = null;
  private removeButton: HTMLButtonElement | null = null;
  private progressEl: HTMLProgressElement | null = null;

  static get observedAttributes() {
    return ["name", "size", "type", "preview-src", "progress", "removable", "remove-label", "locale"];
  }

  connectedCallback() {
    if (this.native) return;
    this.style.display = "contents";
    const root = document.createElement(this.closest("kernel-attachment-list") ? "li" : "div");
    root.className = kernelClass("Attachment");
    root.setAttribute("data-slot", "attachment");

    const icon = document.createElement("span");
    icon.className = kernelClass("Attachment", "icon");
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = kernelClass("Attachment", "text");
    const name = document.createElement("span");
    name.className = kernelClass("Attachment", "name");
    name.setAttribute("data-slot", "attachment-name");
    const meta = document.createElement("span");
    meta.className = kernelClass("Attachment", "meta");
    meta.setAttribute("data-slot", "attachment-meta");
    text.append(name, meta);

    root.append(icon, text);
    this.icon = icon;
    this.nameEl = name;
    this.metaEl = meta;
    this.replaceChildren(root);
    this.native = root;
    this.render();
  }

  protected syncAttr() {
    this.render();
  }

  private render() {
    const root = this.native;
    if (!root || !this.icon || !this.nameEl || !this.metaEl) return;
    const name = this.getAttribute("name") ?? "";
    const locale = this.getAttribute("locale") ?? undefined;
    const sizeAttr = this.getAttribute("size");
    const size = sizeAttr !== null && sizeAttr !== "" ? Number(sizeAttr) : null;
    const type = this.getAttribute("type");
    const progressAttr = this.getAttribute("progress");
    const progress = progressAttr !== null && progressAttr !== "" ? Number(progressAttr) : null;
    const uploading = progress !== null && progress < 1;
    const clamped = progress === null ? 0 : Math.min(1, Math.max(0, progress));
    const removable = this.hasAttribute("removable");
    const preview = this.getAttribute("preview-src");

    // Icon or thumbnail.
    const img = this.icon.querySelector("img");
    if (preview) {
      if (img) img.src = preview;
      else {
        const thumb = document.createElement("img");
        thumb.className = kernelClass("Attachment", "thumbnail");
        thumb.alt = "";
        thumb.src = preview;
        this.icon.replaceChildren(thumb);
      }
    } else if (img || !this.icon.firstChild) {
      this.icon.innerHTML = FILE_ICON;
    }

    // Name, split for middle truncation.
    const { start, end, extension } = splitName(name);
    const startEl = document.createElement("span");
    startEl.className = kernelClass("Attachment", "nameStart");
    startEl.textContent = start;
    const endEl = document.createElement("span");
    endEl.className = kernelClass("Attachment", "nameEnd");
    endEl.textContent = end;
    this.nameEl.replaceChildren(startEl, endEl);
    this.nameEl.title = name;

    const typeLabel = extension
      ? extension.slice(1).toUpperCase()
      : type
        ? (type.split("/").pop() ?? "").toUpperCase()
        : "";
    const meta = [
      uploading
        ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(clamped)
        : typeLabel,
      size !== null && Number.isFinite(size) ? formatFileSize(size, locale) : "",
    ]
      .filter(Boolean)
      .join(" · ");
    this.metaEl.textContent = meta;
    this.metaEl.hidden = meta === "";

    // Remove button.
    if (removable) {
      if (!this.removeButton) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = kernelClass("Attachment", "remove");
        button.innerHTML = REMOVE_ICON;
        button.addEventListener("click", () => {
          this.dispatchEvent(
            new CustomEvent("remove", { bubbles: true, detail: { name: this.getAttribute("name") ?? "" } }),
          );
        });
        this.removeButton = button;
        root.querySelector(`.${kernelClass("Attachment", "text")}`)?.after(button);
      }
      this.removeButton.setAttribute("aria-label", this.getAttribute("remove-label") ?? `Remove ${name}`);
      root.dataset.removable = "true";
    } else {
      this.removeButton?.remove();
      this.removeButton = null;
      delete root.dataset.removable;
    }

    // Upload progress.
    if (uploading) {
      if (!this.progressEl) {
        const bar = document.createElement("progress");
        bar.className = kernelClass("Attachment", "progress");
        bar.max = 1;
        this.progressEl = bar;
        root.append(bar);
      }
      this.progressEl.value = clamped;
      this.progressEl.setAttribute("aria-label", `Uploading ${name}`);
      root.dataset.uploading = "true";
    } else {
      this.progressEl?.remove();
      this.progressEl = null;
      delete root.dataset.uploading;
    }
  }
}

customElements.define("kernel-attachment-list", KernelAttachmentList);
customElements.define("kernel-attachment", KernelAttachment);
