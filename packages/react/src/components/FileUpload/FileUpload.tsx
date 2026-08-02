import { forwardRef, useId, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./FileUpload.module.css";

interface PreviewEntry {
  file: File;
  url: string | null;
}

export interface FileUploadState {
  dragActive: boolean;
  disabled: boolean;
  invalid: boolean;
  preview: boolean;
}

export interface FileUploadError {
  type: "max-files" | "max-size" | "accept";
  files: File[];
}

export interface FileUploadProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "value" | "defaultValue" | "onChange" | "onError" | "size"
  > {
  label: ReactNode;
  /** Visually hides the label heading without removing it from the
   * dropzone's accessible name — see `TextField`'s `hideLabel` for the
   * full rationale. The hint text (`description`, or the default "Drag
   * and drop, or click to browse") still shows underneath either way. */
  hideLabel?: boolean;
  description?: ReactNode;
  /** Set to `false` to hard-align the error text flush with the field's
   * left edge, undoing the default inset that lines it up with the
   * dropzone's own text (`--kernel-label-inset`). Doesn't affect `label`
   * or the hint text, which sit above the dropzone as a heading, not
   * inset text-field content, so they never carry the inset in the first
   * place. */
  labelOffset?: boolean;
  files?: File[];
  defaultFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  /** Max size per file, in bytes. */
  maxSize?: number;
  /** Fires whenever a pick or drop is rejected for exceeding `maxFiles`/
   * `maxSize` or failing `accept`. Distinct from `invalid`/`errorMessage`,
   * which are for form-level validation state. */
  onError?: (error: FileUploadError) => void;
  /** When true, the dropzone moulds around the current selection:
   * browser-displayable images (`image/*` except TIFF) render as
   * object-URL thumbnails inside the zone (one image fills; several
   * tile in a grid), and non-image files show as compact name chips.
   * Opt-in so existing consumers keep the empty-state chrome until they
   * ask for it. Object URLs are revoked when the selection changes. */
  preview?: boolean;
  /** Locks the dropzone to a 1:1 tile. Off by default so existing
   * full-width upload zones keep their natural height. When set, the
   * dropzone reads Card's concentric radius pair (`--kernel-radius-sheet`
   * outer / `--kernel-radius-md` inner via `--kernel-padding-sheet`) so a
   * moulded image preview shares a corner centre with the frame. */
  aspectRatio?: "auto" | "square";
  errorMessage?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  className?: ClassNameValue<FileUploadState>;
  wrapperClassName?: ClassNameValue<FileUploadState>;
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

/** TIFF (and a few exotic image MIME types) report as `image/*` but
 * browsers won't paint them in an `<img>`, so preview treats them as
 * ordinary file chips instead of broken thumbnails. */
function isPreviewableImage(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  const type = file.type.toLowerCase();
  return type !== "image/tiff" && type !== "image/tif";
}

/** `accept`'s native filtering only applies to the OS picker dialog — it
 * does nothing for drag-and-drop, so drop handling re-implements the same
 * check by hand. Supports the same three forms `accept` itself does: a
 * file extension (`.pdf`), a MIME wildcard (`image/*`), or an exact MIME
 * type (`application/pdf`). */
function matchesAccept(file: File, accept: string | undefined): boolean {
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
  accept: string | undefined,
  maxSize: number | undefined,
  maxFiles: number | undefined,
): { accepted: File[] } | { error: FileUploadError } {
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

/** Rebuilds a `DataTransfer` from `files` and assigns it onto the real
 * `<input>`, so the native element stays the actual source of truth even
 * for drag-dropped files — it participates correctly in a native
 * `<form>` submission with no JS involved, not just in React state. */
function syncNativeFiles(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;
  const dataTransfer = new DataTransfer();
  for (const file of files) dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

function updateRevealOrigin(event: DragEvent<HTMLLabelElement>) {
  const dropzone = event.currentTarget;
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

/** Module-scoped (not per-instance) so two dropzones dragged over in quick
 * succession — or one unmounting mid-drag — can't clobber each other's
 * restore value; only the instance that takes the count to 0 restores the
 * pre-drag `overflow`/`touch-action`, matching how a use-count mutex works. */
let scrollLockCount = 0;
let previousDocumentOverflow = "";
let previousDocumentTouchAction = "";

/** Body scroll is locked for the whole page (not just `touch-action: none`
 * on the dropzone) because mobile browsers still rubber-band/scroll the
 * page from a touch point that started outside the dropzone but drags a
 * file over it, and because iOS Safari ignores `touch-action` on drag
 * sources it doesn't own. */
function lockPageScroll() {
  if (scrollLockCount === 0) {
    const root = document.documentElement;
    previousDocumentOverflow = root.style.overflow;
    previousDocumentTouchAction = root.style.touchAction;
    root.style.overflow = "hidden";
    root.style.touchAction = "none";
  }
  scrollLockCount += 1;
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    const root = document.documentElement;
    root.style.overflow = previousDocumentOverflow;
    root.style.touchAction = previousDocumentTouchAction;
  }
}

/** Some mobile/touch browsers never fire a matching `dragleave`/`drop` for
 * a drag that started as a touch gesture (the drag is abandoned, the tab is
 * backgrounded, or the OS cancels it) — `dragenter`/`dragover` re-arm this
 * watchdog on every event, so a drag that's gone silent for a beat clears
 * itself instead of leaving the dropzone stuck lit and the page scroll
 * locked. */
const DRAG_ACTIVE_TIMEOUT_MS = 1000;

const PREVIEW_GRID_CAP = 4;

/**
 * A real `<input type="file">`, wrapped entirely inside a real
 * `<label htmlFor={id}>` that IS the drop zone — icon, instructions, and
 * padding all inside the label, so the whole zone is natively clickable
 * with no manual `.click()` forwarding. Drag-and-drop is a progressive
 * enhancement on top of that: `dragenter`/`dragover`/`drop` re-assign the
 * dropped files onto the real input's own `.files` via a fresh
 * `DataTransfer`, so it stays authoritative either way. The native input
 * itself has no drag-and-drop and no size/count limits at all — `accept`
 * only filters the OS dialog, never a drop — so all of that validation is
 * reimplemented once, in `validateFiles`, and reused by both paths.
 *
 * Pass `preview` to mould the dropzone around the current selection:
 * displayable images become object-URL thumbnails (one fills the zone;
 * several tile), and other files become compact chips. Off by default.
 * Pass `aspectRatio="square"` for a 1:1 Card-radius tile — useful when
 * the selection is meant to read as a single photo rather than a wide
 * dashed field.
 *
 * `dragActive` also drives a page-level scroll lock (`documentElement`
 * `overflow`/`touch-action`) for the duration of the drag: mobile browsers
 * otherwise scroll or rubber-band the page out from under a drag gesture
 * that's hovering the dropzone. Because touch-originated drags don't
 * reliably fire a matching `dragleave`/`drop` (tab backgrounded, gesture
 * aborted by the OS, dropped outside the window), a watchdog timer
 * re-armed on every `dragenter`/`dragover` — plus `window` `dragend`/
 * `drop`/`blur` and `visibilitychange` listeners — force-clears
 * `dragActive` if the drag goes silent, so the dropzone can't get stuck
 * lit with scroll locked.
 */
export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  function FileUpload(
    {
      label,
      hideLabel = false,
      description,
      labelOffset = true,
      files,
      defaultFiles = [],
      onFilesChange,
      accept,
      multiple = false,
      maxFiles,
      maxSize,
      onError,
      preview = false,
      aspectRatio = "auto",
      errorMessage,
      invalid = false,
      disabled = false,
      id,
      className,
      wrapperClassName,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;

    const inputRef = useRef<HTMLInputElement>(null);
    const dropzoneRef = useRef<HTMLLabelElement>(null);
    const dragCounterRef = useRef(0);
    const dragActiveTimeoutRef = useRef<number | null>(null);
    const previewUrlCacheRef = useRef(new Map<string, string>());
    const [dragActive, setDragActive] = useState(false);

    function clearDragActiveTimeout() {
      if (dragActiveTimeoutRef.current !== null) {
        window.clearTimeout(dragActiveTimeoutRef.current);
        dragActiveTimeoutRef.current = null;
      }
    }

    function armDragActiveTimeout() {
      clearDragActiveTimeout();
      dragActiveTimeoutRef.current = window.setTimeout(() => {
        dragActiveTimeoutRef.current = null;
        dragCounterRef.current = 0;
        setDragActive(false);
      }, DRAG_ACTIVE_TIMEOUT_MS);
    }

    const [currentFiles, setCurrentFiles] = useControllableState<File[]>({
      value: files,
      defaultValue: defaultFiles,
      onChange: onFilesChange,
    });

    const previewEntries: PreviewEntry[] = preview
      ? currentFiles.map((file) => {
          if (!isPreviewableImage(file)) return { file, url: null };
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          let url = previewUrlCacheRef.current.get(key);
          if (!url) {
            url = URL.createObjectURL(file);
            previewUrlCacheRef.current.set(key, url);
          }
          return { file, url };
        })
      : [];

    useLayoutEffect(() => {
      syncNativeFiles(inputRef.current, currentFiles);
    }, [currentFiles]);

    useLayoutEffect(() => {
      const liveKeys = new Set(
        preview
          ? currentFiles
              .filter(isPreviewableImage)
              .map((file) => `${file.name}-${file.size}-${file.lastModified}`)
          : [],
      );
      for (const [key, url] of previewUrlCacheRef.current) {
        if (!liveKeys.has(key)) {
          URL.revokeObjectURL(url);
          previewUrlCacheRef.current.delete(key);
        }
      }
    }, [currentFiles, preview]);

    useLayoutEffect(() => {
      return () => {
        for (const url of previewUrlCacheRef.current.values()) {
          URL.revokeObjectURL(url);
        }
        previewUrlCacheRef.current.clear();
      };
    }, []);

    // Locks page scroll for as long as a drag is active, regardless of how
    // `dragActive` became false (leave, drop, or the watchdog/force-reset
    // below) — tying the lock to this effect's lifetime, rather than to
    // each individual handler, means every exit path restores scroll.
    useLayoutEffect(() => {
      if (!dragActive) return;
      lockPageScroll();
      return () => unlockPageScroll();
    }, [dragActive]);

    // Touch/mobile drags can go silent without ever firing `dragleave` or
    // `drop` on this element — leaving the window entirely, backgrounding
    // the tab, or the OS aborting the gesture. These listeners are a
    // best-effort net underneath the per-drag watchdog timeout, catching
    // the cases where the browser tells us *something* happened, just not
    // through this element.
    useLayoutEffect(() => {
      function forceResetDragState() {
        clearDragActiveTimeout();
        dragCounterRef.current = 0;
        setDragActive(false);
      }
      window.addEventListener("dragend", forceResetDragState);
      window.addEventListener("drop", forceResetDragState);
      window.addEventListener("blur", forceResetDragState);
      document.addEventListener("visibilitychange", forceResetDragState);
      return () => {
        window.removeEventListener("dragend", forceResetDragState);
        window.removeEventListener("drop", forceResetDragState);
        window.removeEventListener("blur", forceResetDragState);
        document.removeEventListener("visibilitychange", forceResetDragState);
        clearDragActiveTimeout();
      };
    }, []);

    function handleNativeChange(event: ChangeEvent<HTMLInputElement>) {
      const incoming = Array.from(event.target.files ?? []);
      // Native <input type="file"> quirk: without resetting .value, picking
      // the same file twice in a row never fires a second `change` event.
      event.target.value = "";
      if (incoming.length === 0) return;

      // Keyboard / picker selection has no pointer — don't reuse a stale drag origin.
      resetRevealOrigin(dropzoneRef.current);

      const result = validateFiles(incoming, 0, accept, maxSize, maxFiles);
      if ("error" in result) {
        onError?.(result.error);
        return;
      }
      setCurrentFiles(result.accepted);
      syncNativeFiles(inputRef.current, result.accepted);
    }

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
      event.preventDefault();
      // Capture origin one last time at the drop point before clearing drag state.
      updateRevealOrigin(event);
      dragCounterRef.current = 0;
      clearDragActiveTimeout();
      setDragActive(false);
      if (disabled) return;

      const incoming = Array.from(event.dataTransfer.files);
      if (incoming.length === 0) return;

      const result = validateFiles(incoming, currentFiles.length, accept, maxSize, maxFiles);
      if ("error" in result) {
        onError?.(result.error);
        return;
      }
      const combined = [...currentFiles, ...result.accepted];
      setCurrentFiles(combined);
      syncNativeFiles(inputRef.current, combined);
    }

    function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
      event.preventDefault();
      updateRevealOrigin(event);
      dragCounterRef.current += 1;
      armDragActiveTimeout();
      setDragActive(true);
    }

    function handleDragOver(event: DragEvent<HTMLLabelElement>) {
      // Required for `drop` to fire at all.
      event.preventDefault();
      updateRevealOrigin(event);
      // Re-arms the stuck-state watchdog on every `dragover`, not just
      // `dragenter` — a drag that's actively hovering keeps resetting the
      // clock, so only a drag that's gone silent (the touch quirks this
      // guards against) ever hits the timeout.
      armDragActiveTimeout();
    }

    function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
      event.preventDefault();
      // dragenter/dragleave fire on every child element traversed, not
      // just the label itself — a plain boolean here would flicker every
      // time the pointer crosses the icon or instructions text.
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        clearDragActiveTimeout();
        setDragActive(false);
      }
    }

    function removeFile(index: number) {
      const next = currentFiles.filter((_, i) => i !== index);
      setCurrentFiles(next);
      syncNativeFiles(inputRef.current, next);
    }

    const showError = invalid && Boolean(errorMessage);
    const describedBy =
      [showError ? errorId : null, description ? descriptionId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const state: FileUploadState = { dragActive, disabled, invalid, preview };
    const showMould = preview && currentFiles.length > 0;
    const imageCount = previewEntries.filter((entry) => entry.url).length;
    const previewLayout = imageCount === 1 && previewEntries.length === 1 ? "single" : "grid";
    const square = aspectRatio === "square";
    const gridOverflow =
      previewLayout === "grid" && previewEntries.length > PREVIEW_GRID_CAP
        ? previewEntries.length - (PREVIEW_GRID_CAP - 1)
        : 0;
    const visiblePreviewEntries =
      gridOverflow > 0 ? previewEntries.slice(0, PREVIEW_GRID_CAP - 1) : previewEntries;

    return (
      <div
        className={[styles.root, resolveClassName(wrapperClassName, state)]
          .filter(Boolean)
          .join(" ")}
        data-slot="file-upload"
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
        data-preview={dataAttr(preview)}
        data-aspect-ratio={square ? "square" : undefined}
        data-label-offset={labelOffset === false ? "false" : undefined}
      >
        <label
          ref={dropzoneRef}
          className={[styles.dropzone, resolveClassName(className, state)]
            .filter(Boolean)
            .join(" ")}
          data-slot="file-upload-dropzone"
          htmlFor={inputId}
          data-drag-active={dataAttr(dragActive)}
          data-has-preview={dataAttr(showMould)}
          data-preview-layout={showMould ? previewLayout : undefined}
          data-aspect-ratio={square ? "square" : undefined}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Empty chrome + preview stay stacked so the mould is a CSS
              crossfade/scale (transitions.dev DnD "zone morphs into the
              image"), not a hard cut from unmounting one tree for the other. */}
          <span className={styles.empty} aria-hidden={showMould || undefined}>
            <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 10.5V3.5M8 3.5L5 6.5M8 3.5L11 6.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2.5 10.5V11.5C2.5 12.0523 2.94772 12.5 3.5 12.5H12.5C13.0523 12.5 13.5 12.0523 13.5 11.5V10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.instructions}>
              <strong
                className={[styles.label, hideLabel ? "kernel-sr-only" : null]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </strong>
              <span className={styles.hint}>
                {description ?? "Drag and drop, or click to browse"}
              </span>
            </span>
          </span>
          {preview ? (
            <span
              className={styles.preview}
              data-slot="file-upload-preview"
              data-layout={showMould ? previewLayout : undefined}
              aria-hidden="true"
            >
              {visiblePreviewEntries.map((entry, index) =>
                entry.url ? (
                  <img
                    key={`${entry.file.name}-${entry.file.size}-${entry.file.lastModified}-${index}`}
                    className={styles.previewImage}
                    src={entry.url}
                    alt=""
                  />
                ) : (
                  <span
                    key={`${entry.file.name}-${entry.file.size}-${entry.file.lastModified}-${index}`}
                    className={styles.previewFile}
                  >
                    <span className={styles.previewFileName}>{entry.file.name}</span>
                  </span>
                ),
              )}
              {gridOverflow > 0 ? (
                <span className={styles.previewOverflow}>+{gridOverflow}</span>
              ) : null}
            </span>
          ) : null}
          {showMould ? (
            <span className="kernel-sr-only">
              {label}
              {description ? ` ${description}` : ""}
            </span>
          ) : null}
          <input
            {...rest}
            ref={mergeRefs(ref, inputRef)}
            id={inputId}
            type="file"
            className={styles.input}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={handleNativeChange}
          />
        </label>

        {showError ? (
          <p className={styles.error} id={errorId} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {currentFiles.length > 0 ? (
          <ul
            className={styles.fileList}
            data-slot="file-upload-list"
            aria-label="Selected files"
          >
            {currentFiles.map((file, index) => (
              <li className={styles.fileItem} key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(index)}
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="14" height="14">
                    <path
                      d="M4 4L12 12M12 4L4 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
);
