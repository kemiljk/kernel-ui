import { createContext, forwardRef, useContext } from "react";
import type { HTMLAttributes } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Attachment.module.css";

const InAttachmentList = createContext(false);

const SIZE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;

/** Formats a byte count with `Intl.NumberFormat`'s unit style, in decimal
 * (1 kB = 1000 bytes) steps: `2_400` → `"2.4 kB"`, `2_400_000` →
 * `"2.4 MB"`, in the reader's locale unless `locale` is given. Unit names
 * come from the locale's data, so they translate with it. */
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

/** Splits a file name so the tail (the last few characters of the stem
 * plus the extension) can stay visible while the start truncates. */
function splitName(name: string): { start: string; end: string; extension: string } {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
  const stem = extension ? name.slice(0, dot) : name;
  const tail = stem.length > 8 ? stem.slice(-4) : "";
  return { start: stem.slice(0, stem.length - tail.length), end: tail + extension, extension };
}

export interface AttachmentListProps
  extends Omit<HTMLAttributes<HTMLUListElement>, "className"> {
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A row of attachments: a real `<ul>`, with `role="list"` restated because
 * Safari drops list semantics from a list whose markers are removed with
 * `list-style: none`. Each `Attachment` inside renders as its `<li>`, so a
 * screen reader announces "list, 3 items" before the files.
 */
export const AttachmentList = forwardRef<HTMLUListElement, AttachmentListProps>(
  function AttachmentList({ className, ...rest }, ref) {
    return (
      <InAttachmentList.Provider value>
        <ul
          {...rest}
          ref={ref}
          role="list"
          data-slot="attachment-list"
          className={[styles.list, resolveClassName(className, {})].filter(Boolean).join(" ")}
        />
      </InAttachmentList.Provider>
    );
  },
);

export interface AttachmentState {
  uploading: boolean;
  removable: boolean;
  preview: boolean;
}

export interface AttachmentProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "onRemove"> {
  /** The file name. The start truncates first, so the extension (and the
   * last few characters before it) stay visible. */
  name: string;
  /** Size in bytes, shown formatted (`2.4 MB`) in the reader's locale. */
  size?: number;
  /** MIME type, e.g. `"application/pdf"`. Used for the type label when
   * the name has no extension. */
  type?: string;
  /** An image URL (often an object URL for a just-picked file) shown as a
   * thumbnail in place of the generic file icon. */
  previewSrc?: string;
  /** Upload progress from 0 to 1. While below 1, a thin native
   * `<progress>` runs along the bottom edge and the percentage replaces
   * the type label. Omit once the upload is done. */
  progress?: number;
  /** Shows a remove button. Called when it's pressed. */
  onRemove?: () => void;
  /** Accessible name of the remove button. Defaults to `Remove {name}`. */
  removeLabel?: string;
  /** BCP 47 locale for the size and percentage. Defaults to the reader's. */
  locale?: string;
  className?: ClassNameValue<AttachmentState>;
}

/**
 * A file chip for composers and messages: type icon (or image
 * thumbnail), name, size, an optional remove button and optional upload
 * progress. Inside an `AttachmentList` it renders as that list's `<li>`;
 * on its own it's a `<div>`.
 *
 * The name truncates in the middle, not at the end: the start ellipsises
 * while the last few characters and the extension stay put, because
 * `quarterly-report-final-v3.pdf` and `quarterly-report-final-v4.pdf` are
 * only told apart by their tail. The full name is still one run of text
 * for assistive tech and in the `title` tooltip.
 *
 * Upload progress is a real `<progress>` (implicit `progressbar` role and
 * value, no ARIA bookkeeping), labelled "Uploading {name}". The remove
 * button follows `TagInput`'s chip: a real `<button>` named
 * "Remove {name}", but it stays in the tab order here, since an
 * attachment has no Backspace-to-remove path.
 *
 * The chip has a fixed height so its radius can stop at a true
 * half-height pill (`min(--kernel-radius-lg, height / 2)`), and the
 * thumbnail tile inside is concentric with it: its radius is the outer
 * radius minus the inset.
 */
export const Attachment = forwardRef<HTMLElement, AttachmentProps>(function Attachment(
  {
    name,
    size,
    type,
    previewSrc,
    progress,
    onRemove,
    removeLabel,
    locale,
    className,
    ...rest
  },
  ref,
) {
  const inList = useContext(InAttachmentList);
  const Root = (inList ? "li" : "div") as "div";
  const { start, end, extension } = splitName(name);
  const uploading = progress != null && progress < 1;
  const clamped = progress == null ? 0 : Math.min(1, Math.max(0, progress));
  const state: AttachmentState = {
    uploading,
    removable: Boolean(onRemove),
    preview: Boolean(previewSrc),
  };

  const typeLabel = extension
    ? extension.slice(1).toUpperCase()
    : type
      ? (type.split("/").pop() ?? "").toUpperCase()
      : "";
  const meta = [
    uploading
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(clamped)
      : typeLabel,
    size != null ? formatFileSize(size, locale) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Root
      {...rest}
      ref={ref as never}
      data-slot="attachment"
      data-uploading={dataAttr(uploading)}
      data-removable={dataAttr(Boolean(onRemove))}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <span className={styles.icon} aria-hidden="true">
        {previewSrc ? (
          <img className={styles.thumbnail} src={previewSrc} alt="" />
        ) : (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M9 1.75H4.75a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V5L9 1.75Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <path d="M9 1.75V5h3.25" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={styles.text}>
        <span className={styles.name} title={name} data-slot="attachment-name">
          <span className={styles.nameStart}>{start}</span>
          <span className={styles.nameEnd}>{end}</span>
        </span>
        {meta ? (
          <span className={styles.meta} data-slot="attachment-meta">
            {meta}
          </span>
        ) : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          className={styles.remove}
          aria-label={removeLabel ?? `Remove ${name}`}
          onClick={onRemove}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="12" height="12">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      {uploading ? (
        <progress
          className={styles.progress}
          max={1}
          value={clamped}
          aria-label={`Uploading ${name}`}
        />
      ) : null}
    </Root>
  );
});
