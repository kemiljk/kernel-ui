import { forwardRef, useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./FileUpload.module.css";

export interface FileUploadState {
  dragActive: boolean;
  disabled: boolean;
  invalid: boolean;
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
    const dragCounterRef = useRef(0);
    const [dragActive, setDragActive] = useState(false);

    const [currentFiles, setCurrentFiles] = useControllableState<File[]>({
      value: files,
      defaultValue: defaultFiles,
      onChange: onFilesChange,
    });

    function handleNativeChange(event: ChangeEvent<HTMLInputElement>) {
      const incoming = Array.from(event.target.files ?? []);
      // Native <input type="file"> quirk: without resetting .value, picking
      // the same file twice in a row never fires a second `change` event.
      event.target.value = "";
      if (incoming.length === 0) return;

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
      dragCounterRef.current = 0;
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
      dragCounterRef.current += 1;
      setDragActive(true);
    }

    function handleDragOver(event: DragEvent<HTMLLabelElement>) {
      // Required for `drop` to fire at all.
      event.preventDefault();
    }

    function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
      event.preventDefault();
      // dragenter/dragleave fire on every child element traversed, not
      // just the label itself — a plain boolean here would flicker every
      // time the pointer crosses the icon or instructions text.
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
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

    const state: FileUploadState = { dragActive, disabled, invalid };

    return (
      <div
        className={[styles.root, resolveClassName(wrapperClassName, state)]
          .filter(Boolean)
          .join(" ")}
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
        data-label-offset={labelOffset === false ? "false" : undefined}
      >
        <label
          className={[styles.dropzone, resolveClassName(className, state)]
            .filter(Boolean)
            .join(" ")}
          htmlFor={inputId}
          data-drag-active={dataAttr(dragActive)}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
          <ul className={styles.fileList} aria-label="Selected files">
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
