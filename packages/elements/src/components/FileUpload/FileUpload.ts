import { KernelElement, kernelClass } from "../../base";
import "./FileUpload.css";

let fileUploadCounter = 0;

export interface KernelFileUploadErrorDetail {
  type: "max-files" | "max-size" | "accept" | "directory";
  files: File[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function isPreviewableImage(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  const type = file.type.toLowerCase();
  return type !== "image/tiff" && type !== "image/tif";
}

function matchesAccept(file: File, accept: string | null): boolean {
  if (!accept) return true;
  const patterns = accept
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern);
    if (pattern.endsWith("/*")) return file.type.toLowerCase().startsWith(pattern.slice(0, -1));
    return file.type.toLowerCase() === pattern;
  });
}

function validateFiles(
  incoming: File[],
  existingCount: number,
  accept: string | null,
  maxSize: number | null,
  maxFiles: number | null,
): { accepted: File[] } | { error: KernelFileUploadErrorDetail } {
  const typeRejected = incoming.filter((file) => !matchesAccept(file, accept));
  if (typeRejected.length > 0) return { error: { type: "accept", files: typeRejected } };

  if (maxSize != null) {
    const sizeRejected = incoming.filter((file) => file.size > maxSize);
    if (sizeRejected.length > 0) return { error: { type: "max-size", files: sizeRejected } };
  }

  if (maxFiles != null && existingCount + incoming.length > maxFiles) {
    return { error: { type: "max-files", files: incoming } };
  }

  return { accepted: incoming };
}

/** A dropped folder still turns up in `dataTransfer.files`, as a 0-byte
 * pseudo-`File` with an empty `type` that no reader can open — so without
 * this it lists as a perfectly ordinary row that silently uploads nothing.
 * Only the entry API can tell the two apart, and only synchronously: the
 * `items` list is neutered the moment the drop handler yields. Mirrors
 * `@kernelui-lib/react`'s `collectDroppedDirectories` 1:1. */
function collectDroppedDirectories(dataTransfer: DataTransfer, files: File[]): File[] {
  const items = dataTransfer.items;
  if (!items) return [];
  const directories: File[] = [];
  // `items` also carries non-file entries (dragged text, URLs); only the
  // `kind === "file"` ones line up, in order, with `dataTransfer.files`.
  let fileIndex = 0;
  for (const item of Array.from(items)) {
    if (item.kind !== "file") continue;
    const file = files[fileIndex];
    fileIndex += 1;
    if (file && item.webkitGetAsEntry?.()?.isDirectory) directories.push(file);
  }
  return directories;
}

function syncNativeFiles(input: HTMLInputElement, files: File[]) {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

function updateRevealOrigin(dropzone: HTMLElement, event: DragEvent) {
  const rect = dropzone.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
  dropzone.style.setProperty("--kernel-drop-origin-x", `${x}%`);
  dropzone.style.setProperty("--kernel-drop-origin-y", `${y}%`);
}

function resetRevealOrigin(dropzone: HTMLElement | null) {
  if (!dropzone) return;
  dropzone.style.setProperty("--kernel-drop-origin-x", "50%");
  dropzone.style.setProperty("--kernel-drop-origin-y", "50%");
}

/** Watchdog interval for stuck touch-originated drags — see the class
 * doc comment and `@kernelui-lib/react`'s `FileUpload` for the full
 * rationale (mirrored 1:1 here). */
const DRAG_ACTIVE_TIMEOUT_MS = 1000;

const PREVIEW_GRID_CAP = 4;

/**
 * `<kernel-file-upload>` — a real `<input type="file">` wrapped entirely
 * inside a real `<label>` that IS the drop zone, same approach as
 * `@kernelui-lib/react`'s `<FileUpload>` (see that file for the full
 * rationale). No `files` attribute: a `FileList` can't serialize into a
 * string, and the real input's own `.files` is already the correct
 * source of truth, so this element reads it directly after every
 * `change`/drop and re-renders its own file-list DOM from it. Validation
 * rejections dispatch a `kernel-file-upload-error` `CustomEvent` (there's
 * no prop-callback equivalent for a vanilla element) — including
 * `type: "directory"` for a dropped folder, which the platform hands over
 * as an unreadable 0-byte `File` rather than refusing outright.
 *
 * Attributes: `label` (required, still contributes to the dropzone's
 * accessible name even when `hide-label` is set), `hide-label`
 * (boolean — hides the label heading only, the hint text underneath
 * still shows), `description` (replaces the default "Drag and drop, or
 * click to browse" hint), `accept`, `multiple` (boolean), `max-files`,
 * `max-size` (bytes), `preview` (boolean — moulds the dropzone around
 * the current selection with image object-URL thumbnails / file chips;
 * off by default), `aspect-ratio="square"` (locks a 1:1 Card-radius
 * tile; omit or `"auto"` for the default full-width field),
 * `error-message`, `no-label-offset` (boolean —
 * hard-aligns the error text flush left instead of the default inset;
 * doesn't affect `label` or the hint text, which sit above the dropzone
 * as a heading rather than inset text-field content), `invalid`,
 * `disabled`, `name`.
 *
 * While a drag is over the dropzone, page scroll is locked (`documentElement`
 * `overflow`/`touch-action`) so mobile browsers don't scroll/rubber-band the
 * page out from under the gesture. Touch-originated drags don't reliably
 * fire a matching `dragleave`/`drop` (backgrounded tab, OS-aborted gesture,
 * dropped outside the window), so a watchdog timer re-armed on every
 * `dragenter`/`dragover` — plus `window` `dragend`/`drop`/`blur` and
 * `visibilitychange` listeners — force-clears the drag-active state if the
 * drag goes silent, so the dropzone can't get stuck lit with scroll locked.
 */
export class KernelFileUpload extends KernelElement {
  private readonly generatedId = `kernel-file-upload-${++fileUploadCounter}`;
  private dragCounter = 0;
  private dragActive = false;
  private dragActiveTimeout: number | null = null;
  private previewUrls = new Map<File, string>();

  /** Module-scoped across every `<kernel-file-upload>` instance (not
   * per-element) so overlapping drags — or an element unmounting mid-drag
   * — can't clobber each other's restore value; only the instance that
   * takes the count to 0 restores the pre-drag `overflow`/`touch-action`. */
  private static scrollLockCount = 0;
  private static previousDocumentOverflow = "";
  private static previousDocumentTouchAction = "";

  private static lockPageScroll() {
    if (KernelFileUpload.scrollLockCount === 0) {
      const root = document.documentElement;
      KernelFileUpload.previousDocumentOverflow = root.style.overflow;
      KernelFileUpload.previousDocumentTouchAction = root.style.touchAction;
      root.style.overflow = "hidden";
      root.style.touchAction = "none";
    }
    KernelFileUpload.scrollLockCount += 1;
  }

  private static unlockPageScroll() {
    KernelFileUpload.scrollLockCount = Math.max(0, KernelFileUpload.scrollLockCount - 1);
    if (KernelFileUpload.scrollLockCount === 0) {
      const root = document.documentElement;
      root.style.overflow = KernelFileUpload.previousDocumentOverflow;
      root.style.touchAction = KernelFileUpload.previousDocumentTouchAction;
    }
  }

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "description",
      "accept",
      "multiple",
      "max-files",
      "max-size",
      "preview",
      "aspect-ratio",
      "error-message",
      "no-label-offset",
      "invalid",
      "disabled",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("FileUpload");
    root.setAttribute("data-slot", "file-upload");

    const id = this.getAttribute("id") || this.generatedId;

    const dropzone = document.createElement("label");
    dropzone.className = kernelClass("FileUpload", "dropzone");
    dropzone.setAttribute("data-slot", "file-upload-dropzone");
    dropzone.htmlFor = id;
    dropzone.innerHTML = `
      <span class="${kernelClass("FileUpload", "empty")}">
        <svg class="${kernelClass("FileUpload", "icon")}" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 10.5V3.5M8 3.5L5 6.5M8 3.5L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M2.5 10.5V11.5C2.5 12.0523 2.94772 12.5 3.5 12.5H12.5C13.0523 12.5 13.5 12.0523 13.5 11.5V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="${kernelClass("FileUpload", "instructions")}">
          <strong class="${kernelClass("FileUpload", "label")}"></strong>
          <span class="${kernelClass("FileUpload", "hint")}">Drag and drop, or click to browse</span>
        </span>
      </span>
      <span class="${kernelClass("FileUpload", "preview")}" data-slot="file-upload-preview" aria-hidden="true" hidden></span>
    `;

    const input = document.createElement("input");
    input.id = id;
    input.type = "file";
    input.className = kernelClass("FileUpload", "input");
    input.addEventListener("change", () => {
      const incoming = Array.from(input.files ?? []);
      input.value = "";
      if (incoming.length === 0) return;
      // Keyboard / picker selection has no pointer — don't reuse a stale drag origin.
      resetRevealOrigin(this.dropzone);
      const result = validateFiles(
        incoming,
        0,
        this.getAttribute("accept"),
        this.maxSize,
        this.maxFiles,
      );
      if ("error" in result) {
        this.dispatchEvent(new CustomEvent("kernel-file-upload-error", { detail: result.error }));
        return;
      }
      syncNativeFiles(input, result.accepted);
      this.renderFileList();
      this.renderPreview();
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    dropzone.append(input);

    dropzone.addEventListener("dragenter", (event) => {
      event.preventDefault();
      updateRevealOrigin(dropzone, event);
      this.dragCounter += 1;
      this.setDragActive(true);
      this.armDragActiveTimeout();
    });
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      updateRevealOrigin(dropzone, event);
      // Re-arms the stuck-state watchdog on every `dragover`, not just
      // `dragenter` — a drag that's actively hovering keeps resetting the
      // clock, so only a drag that's gone silent (the touch quirks this
      // guards against) ever hits the timeout.
      this.armDragActiveTimeout();
    });
    dropzone.addEventListener("dragleave", (event) => {
      event.preventDefault();
      // dragenter/dragleave fire on every child element traversed, not
      // just the label itself — a plain counter here avoids flicker every
      // time the pointer crosses the icon or instructions text.
      this.dragCounter -= 1;
      if (this.dragCounter <= 0) {
        this.dragCounter = 0;
        this.clearDragActiveTimeout();
        this.setDragActive(false);
      }
    });
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      updateRevealOrigin(dropzone, event);
      this.dragCounter = 0;
      this.clearDragActiveTimeout();
      this.setDragActive(false);
      if (this.hasAttribute("disabled")) return;

      const incoming = Array.from(event.dataTransfer?.files ?? []);
      if (incoming.length === 0) return;

      const directories = event.dataTransfer
        ? collectDroppedDirectories(event.dataTransfer, incoming)
        : [];
      if (directories.length > 0) {
        this.dispatchEvent(
          new CustomEvent("kernel-file-upload-error", {
            detail: { type: "directory", files: directories } satisfies KernelFileUploadErrorDetail,
          }),
        );
        return;
      }

      const allowMultiple = input.hasAttribute("multiple");
      const existing = allowMultiple ? Array.from(input.files ?? []) : [];
      const dropped = allowMultiple ? incoming : incoming.slice(0, 1);
      const result = validateFiles(
        dropped,
        allowMultiple ? existing.length : 0,
        this.getAttribute("accept"),
        this.maxSize,
        this.maxFiles,
      );
      if ("error" in result) {
        this.dispatchEvent(new CustomEvent("kernel-file-upload-error", { detail: result.error }));
        return;
      }
      syncNativeFiles(input, allowMultiple ? [...existing, ...result.accepted] : result.accepted);
      this.renderFileList();
      this.renderPreview();
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const fileList = document.createElement("ul");
    fileList.className = kernelClass("FileUpload", "fileList");
    fileList.setAttribute("data-slot", "file-upload-list");
    fileList.setAttribute("aria-label", "Selected files");

    root.append(dropzone, fileList);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();

    // Touch-originated drags don't reliably fire a matching `dragleave`/
    // `drop` on the dropzone itself (backgrounded tab, OS-aborted gesture,
    // dropped outside the window) — these are a best-effort net underneath
    // the per-drag watchdog timeout above.
    window.addEventListener("dragend", this.forceResetDrag);
    window.addEventListener("drop", this.forceResetDrag);
    window.addEventListener("blur", this.forceResetDrag);
    document.addEventListener("visibilitychange", this.forceResetDrag);
  }

  disconnectedCallback() {
    this.revokePreviewUrls();
    this.clearDragActiveTimeout();
    this.setDragActive(false);
    window.removeEventListener("dragend", this.forceResetDrag);
    window.removeEventListener("drop", this.forceResetDrag);
    window.removeEventListener("blur", this.forceResetDrag);
    document.removeEventListener("visibilitychange", this.forceResetDrag);
  }

  private readonly forceResetDrag = () => {
    this.dragCounter = 0;
    this.clearDragActiveTimeout();
    this.setDragActive(false);
  };

  private setDragActive(active: boolean) {
    if (active === this.dragActive) return;
    this.dragActive = active;
    if (active) {
      this.dropzone?.setAttribute("data-drag-active", "true");
      KernelFileUpload.lockPageScroll();
    } else {
      this.dropzone?.removeAttribute("data-drag-active");
      KernelFileUpload.unlockPageScroll();
    }
  }

  private armDragActiveTimeout() {
    this.clearDragActiveTimeout();
    this.dragActiveTimeout = window.setTimeout(() => {
      this.dragActiveTimeout = null;
      this.dragCounter = 0;
      this.setDragActive(false);
    }, DRAG_ACTIVE_TIMEOUT_MS);
  }

  private clearDragActiveTimeout() {
    if (this.dragActiveTimeout !== null) {
      window.clearTimeout(this.dragActiveTimeout);
      this.dragActiveTimeout = null;
    }
  }

  private get maxFiles(): number | null {
    const raw = this.getAttribute("max-files");
    return raw ? Number(raw) : null;
  }

  private get maxSize(): number | null {
    const raw = this.getAttribute("max-size");
    return raw ? Number(raw) : null;
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector(`.${kernelClass("FileUpload", "input")}`) ?? null;
  }

  private get dropzone(): HTMLLabelElement | null {
    return this.native?.querySelector(`.${kernelClass("FileUpload", "dropzone")}`) ?? null;
  }

  private revokePreviewUrls() {
    for (const url of this.previewUrls.values()) URL.revokeObjectURL(url);
    this.previewUrls.clear();
  }

  /** Keyed on the `File` object, never on `name`/`size`/`lastModified`:
   * two distinct files can share all three (the same photo dropped loose
   * and again inside a folder), and they each need their own URL. Only the
   * entries whose file has left the selection are revoked — re-creating
   * every URL on each render, as this used to, made the browser re-decode
   * every surviving thumbnail on any add or remove. */
  private syncPreviewUrls(files: File[]) {
    const live = new Set(files);
    for (const [file, url] of this.previewUrls) {
      if (!live.has(file)) {
        URL.revokeObjectURL(url);
        this.previewUrls.delete(file);
      }
    }
  }

  private previewUrlFor(file: File): string {
    let url = this.previewUrls.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      this.previewUrls.set(file, url);
    }
    return url;
  }

  private updateDescribedBy() {
    const input = this.input;
    if (!input) return;
    const id = input.id;
    const invalid = this.hasAttribute("invalid");
    const hasError = invalid && this.hasAttribute("error-message");
    if (hasError) input.setAttribute("aria-describedby", `${id}-error`);
    else input.removeAttribute("aria-describedby");
    this.renderError();
  }

  private renderError() {
    const root = this.native;
    const input = this.input;
    const fileList = root?.querySelector(`.${kernelClass("FileUpload", "fileList")}`);
    if (!root || !input || !fileList) return;
    root.querySelector(`.${kernelClass("FileUpload", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("FileUpload", "error");
      p.id = `${input.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.insertBefore(p, fileList);
    }
  }

  private updateHint() {
    const hint = this.native?.querySelector(`.${kernelClass("FileUpload", "hint")}`);
    if (hint) hint.textContent = this.getAttribute("description") ?? "Drag and drop, or click to browse";
  }

  private removeFileAt(index: number) {
    const input = this.input;
    if (!input) return;
    const next = Array.from(input.files ?? []).filter((_, i) => i !== index);
    syncNativeFiles(input, next);
    this.renderFileList();
    this.renderPreview();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  private renderFileList() {
    const fileList = this.native?.querySelector(`.${kernelClass("FileUpload", "fileList")}`);
    const input = this.input;
    if (!fileList || !input) return;
    fileList.innerHTML = "";
    Array.from(input.files ?? []).forEach((file, index) => {
      const item = document.createElement("li");
      item.className = kernelClass("FileUpload", "fileItem");

      const name = document.createElement("span");
      name.className = kernelClass("FileUpload", "fileName");
      name.textContent = file.name;

      const size = document.createElement("span");
      size.className = kernelClass("FileUpload", "fileSize");
      size.textContent = formatBytes(file.size);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = kernelClass("FileUpload", "remove");
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="14" height="14"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>';
      remove.addEventListener("click", () => this.removeFileAt(index));

      item.append(name, size, remove);
      fileList.append(item);
    });
  }

  private renderPreview() {
    const dropzone = this.dropzone;
    const input = this.input;
    if (!dropzone || !input) return;

    dropzone.querySelector(`.${kernelClass("FileUpload", "previewLabel")}`)?.remove();

    const files = Array.from(input.files ?? []);
    const previewEnabled = this.hasAttribute("preview");
    const empty = dropzone.querySelector(`.${kernelClass("FileUpload", "empty")}`);
    let preview = dropzone.querySelector(
      `.${kernelClass("FileUpload", "preview")}`,
    ) as HTMLElement | null;
    if (!preview) {
      preview = document.createElement("span");
      preview.className = kernelClass("FileUpload", "preview");
      preview.setAttribute("data-slot", "file-upload-preview");
      preview.setAttribute("aria-hidden", "true");
      dropzone.insertBefore(preview, input);
    }

    if (!previewEnabled) {
      this.syncPreviewUrls([]);
      preview.setAttribute("hidden", "");
      preview.innerHTML = "";
      delete dropzone.dataset.hasPreview;
      delete dropzone.dataset.previewLayout;
      empty?.removeAttribute("aria-hidden");
      return;
    }

    preview.removeAttribute("hidden");

    if (files.length === 0) {
      this.syncPreviewUrls([]);
      delete dropzone.dataset.hasPreview;
      delete dropzone.dataset.previewLayout;
      preview.innerHTML = "";
      delete preview.dataset.layout;
      empty?.removeAttribute("aria-hidden");
      return;
    }

    const imageFiles = files.filter(isPreviewableImage);
    const layout = imageFiles.length === 1 && files.length === 1 ? "single" : "grid";
    dropzone.dataset.hasPreview = "true";
    dropzone.dataset.previewLayout = layout;
    preview.dataset.layout = layout;
    empty?.setAttribute("aria-hidden", "true");

    const gridOverflow =
      layout === "grid" && files.length > PREVIEW_GRID_CAP
        ? files.length - (PREVIEW_GRID_CAP - 1)
        : 0;
    const visibleFiles = gridOverflow > 0 ? files.slice(0, PREVIEW_GRID_CAP - 1) : files;

    this.syncPreviewUrls(visibleFiles);

    preview.innerHTML = "";
    for (const file of visibleFiles) {
      if (isPreviewableImage(file)) {
        const url = this.previewUrlFor(file);
        const img = document.createElement("img");
        img.className = kernelClass("FileUpload", "previewImage");
        img.src = url;
        img.alt = "";
        preview.append(img);
      } else {
        const chip = document.createElement("span");
        chip.className = kernelClass("FileUpload", "previewFile");
        const name = document.createElement("span");
        name.className = kernelClass("FileUpload", "previewFileName");
        name.textContent = file.name;
        chip.append(name);
        preview.append(chip);
      }
    }
    if (gridOverflow > 0) {
      const overflow = document.createElement("span");
      overflow.className = kernelClass("FileUpload", "previewOverflow");
      overflow.textContent = `+${gridOverflow}`;
      preview.append(overflow);
    }

    const sr = document.createElement("span");
    sr.className = `${kernelClass("FileUpload", "previewLabel")} kernel-sr-only`;
    const labelText =
      this.native?.querySelector(`.${kernelClass("FileUpload", "label")}`)?.textContent ?? "";
    const hintText =
      this.native?.querySelector(`.${kernelClass("FileUpload", "hint")}`)?.textContent ?? "";
    sr.textContent = `${labelText} ${hintText}`.trim();
    dropzone.insertBefore(sr, input);
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    const input = this.input;

    switch (name) {
      case "label": {
        const labelEl = this.native.querySelector(`.${kernelClass("FileUpload", "label")}`);
        if (labelEl) labelEl.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const labelEl = this.native.querySelector(`.${kernelClass("FileUpload", "label")}`);
        labelEl?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "description":
        this.updateHint();
        break;
      case "preview":
        if (value !== null) this.native.setAttribute("data-preview", "");
        else this.native.removeAttribute("data-preview");
        this.renderPreview();
        break;
      case "aspect-ratio": {
        const square = value === "square";
        const dropzone = this.dropzone;
        if (square) {
          this.native.setAttribute("data-aspect-ratio", "square");
          dropzone?.setAttribute("data-aspect-ratio", "square");
        } else {
          this.native.removeAttribute("data-aspect-ratio");
          dropzone?.removeAttribute("data-aspect-ratio");
        }
        break;
      }
      case "no-label-offset":
        if (value !== null) this.native.setAttribute("data-label-offset", "false");
        else this.native.removeAttribute("data-label-offset");
        break;
      case "invalid":
        if (value !== null) this.native.setAttribute("data-invalid", "");
        else this.native.removeAttribute("data-invalid");
        this.updateDescribedBy();
        break;
      case "error-message":
        this.updateDescribedBy();
        break;
      case "accept":
        if (input) {
          if (value === null) input.removeAttribute("accept");
          else input.accept = value;
        }
        break;
      case "multiple":
        if (input) input.multiple = value !== null;
        break;
      case "disabled":
        if (input) input.disabled = value !== null;
        break;
      case "name":
        if (input) {
          if (value === null) input.removeAttribute("name");
          else input.name = value;
        }
        break;
    }
  }
}

customElements.define("kernel-file-upload", KernelFileUpload);
