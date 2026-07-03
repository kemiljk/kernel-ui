import { KernelElement, kernelClass } from "../../base";
import "./FileUpload.css";

let fileUploadCounter = 0;

export interface KernelFileUploadErrorDetail {
  type: "max-files" | "max-size" | "accept";
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

function syncNativeFiles(input: HTMLInputElement, files: File[]) {
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

/**
 * `<kernel-file-upload>` — a real `<input type="file">` wrapped entirely
 * inside a real `<label>` that IS the drop zone, same approach as
 * `@kernelui/react`'s `<FileUpload>` (see that file for the full
 * rationale). No `files` attribute: a `FileList` can't serialize into a
 * string, and the real input's own `.files` is already the correct
 * source of truth, so this element reads it directly after every
 * `change`/drop and re-renders its own file-list DOM from it. Validation
 * rejections dispatch a `kernel-file-upload-error` `CustomEvent` (there's
 * no prop-callback equivalent for a vanilla element).
 *
 * Attributes: `label` (required, still contributes to the dropzone's
 * accessible name even when `hide-label` is set), `hide-label`
 * (boolean — hides the label heading only, the hint text underneath
 * still shows), `description` (replaces the default "Drag and drop, or
 * click to browse" hint), `accept`, `multiple` (boolean), `max-files`,
 * `max-size` (bytes), `error-message`, `invalid`, `disabled`, `name`.
 */
export class KernelFileUpload extends KernelElement {
  private readonly generatedId = `kernel-file-upload-${++fileUploadCounter}`;
  private dragCounter = 0;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "description",
      "accept",
      "multiple",
      "max-files",
      "max-size",
      "error-message",
      "invalid",
      "disabled",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("FileUpload");

    const id = this.getAttribute("id") || this.generatedId;

    const dropzone = document.createElement("label");
    dropzone.className = kernelClass("FileUpload", "dropzone");
    dropzone.htmlFor = id;
    dropzone.innerHTML = `
      <svg class="${kernelClass("FileUpload", "icon")}" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 10.5V3.5M8 3.5L5 6.5M8 3.5L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M2.5 10.5V11.5C2.5 12.0523 2.94772 12.5 3.5 12.5H12.5C13.0523 12.5 13.5 12.0523 13.5 11.5V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="${kernelClass("FileUpload", "instructions")}">
        <strong class="${kernelClass("FileUpload", "label")}"></strong>
        <span class="${kernelClass("FileUpload", "hint")}">Drag and drop, or click to browse</span>
      </span>
    `;

    const input = document.createElement("input");
    input.id = id;
    input.type = "file";
    input.className = kernelClass("FileUpload", "input");
    input.addEventListener("change", () => {
      const incoming = Array.from(input.files ?? []);
      input.value = "";
      if (incoming.length === 0) return;
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
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    dropzone.append(input);

    dropzone.addEventListener("dragenter", (event) => {
      event.preventDefault();
      this.dragCounter += 1;
      dropzone.dataset.dragActive = "true";
    });
    dropzone.addEventListener("dragover", (event) => event.preventDefault());
    dropzone.addEventListener("dragleave", (event) => {
      event.preventDefault();
      this.dragCounter -= 1;
      if (this.dragCounter <= 0) {
        this.dragCounter = 0;
        delete dropzone.dataset.dragActive;
      }
    });
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      this.dragCounter = 0;
      delete dropzone.dataset.dragActive;
      if (this.hasAttribute("disabled")) return;

      const incoming = Array.from(event.dataTransfer?.files ?? []);
      if (incoming.length === 0) return;
      const existing = Array.from(input.files ?? []);
      const result = validateFiles(
        incoming,
        existing.length,
        this.getAttribute("accept"),
        this.maxSize,
        this.maxFiles,
      );
      if ("error" in result) {
        this.dispatchEvent(new CustomEvent("kernel-file-upload-error", { detail: result.error }));
        return;
      }
      syncNativeFiles(input, [...existing, ...result.accepted]);
      this.renderFileList();
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const fileList = document.createElement("ul");
    fileList.className = kernelClass("FileUpload", "fileList");
    fileList.setAttribute("aria-label", "Selected files");

    root.append(dropzone, fileList);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
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
