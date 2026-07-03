import { forwardRef, useId, useRef, useState } from "react";
import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import { Badge } from "../Badge/Badge";
import styles from "./TagInput.module.css";

export interface TagInputState {
  disabled: boolean;
  invalid: boolean;
}

export interface TagInputError {
  type: "duplicate" | "max" | "empty";
  value: string;
}

export interface TagInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "value" | "defaultValue" | "onChange" | "onError" | "type"
  > {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (tags: string[]) => void;
  /** Characters that commit the current draft as a tag, in addition to
   * Enter, which always commits. */
  delimiters?: string[];
  max?: number;
  allowDuplicates?: boolean;
  /** Fires when a commit attempt is rejected (duplicate, empty, or over
   * `max`). Distinct from `invalid`/`errorMessage`, which are for
   * form-level validation state. */
  onError?: (error: TagInputError) => void;
  description?: ReactNode;
  errorMessage?: ReactNode;
  /** Set to `false` to hard-align the label, description, and error text
   * flush with the field's left edge, undoing the default inset that lines
   * them up with the input's own text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: ClassNameValue<TagInputState>;
  wrapperClassName?: ClassNameValue<TagInputState>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * No native element for this — freeform text that commits into discrete
 * tags. `role="list"` wraps `role="listitem"` chips plus a trailing
 * `role="listitem"` text input, deliberately lighter than a full
 * `listbox`/`grid` (no roving-tabindex or arrow-key contract, since
 * there's no selection or navigation model here, just insertion and
 * removal). Each chip's remove button is a real `<button>` but
 * `tabIndex={-1}`: Backspace on an empty draft removes the last tag and
 * keeps focus in the text input, which covers the fully-keyboard-only
 * flow (the same pattern Gmail/Linear/GitHub's own tag pickers use)
 * without adding one extra Tab stop per tag. Mouse/touch users can still
 * click any chip's remove button directly. No autocomplete/suggestion
 * dropdown — that's `Combobox`'s job; this stays a simpler, freeform
 * commit-on-Enter/delimiter field on purpose.
 */
export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(function TagInput(
  {
    label,
    hideLabel = false,
    value,
    defaultValue = [],
    onValueChange,
    delimiters = [","],
    max,
    allowDuplicates = false,
    onError,
    description,
    errorMessage,
    labelOffset = true,
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
  const labelId = `${inputId}-label`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  const [tags, setTags] = useControllableState<string[]>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const delimiterPattern = delimiters.map(escapeRegExp).join("|");
  const delimiterRegex = new RegExp(delimiterPattern);
  const splitRegex = new RegExp(`${delimiterPattern}|\\r?\\n`);

  function commitDraft(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (raw !== "") onError?.({ type: "empty", value: raw });
      return;
    }
    if (!allowDuplicates && tags.includes(trimmed)) {
      onError?.({ type: "duplicate", value: trimmed });
      setDraft("");
      return;
    }
    if (max != null && tags.length >= max) {
      onError?.({ type: "max", value: trimmed });
      return;
    }
    setTags([...tags, trimmed]);
    setDraft("");
  }

  /** Committing more than one part in the same synchronous handler (a
   * typed delimiter splitting several segments at once, or a paste)
   * can't just call `commitDraft` in a loop: `setTags` isn't a functional
   * updater, and React batches state updates within one event, so every
   * call in the loop would read the same stale `tags` closure and each
   * subsequent `setTags` call would overwrite the previous one instead
   * of accumulating. This folds locally over `parts` first and commits
   * the result in one `setTags` call. */
  function commitParts(parts: string[]) {
    let next = tags;
    for (const raw of parts) {
      const trimmed = raw.trim();
      if (trimmed === "") {
        if (raw !== "") onError?.({ type: "empty", value: raw });
        continue;
      }
      if (!allowDuplicates && next.includes(trimmed)) {
        onError?.({ type: "duplicate", value: trimmed });
        continue;
      }
      if (max != null && next.length >= max) {
        onError?.({ type: "max", value: trimmed });
        continue;
      }
      next = [...next, trimmed];
    }
    if (next !== tags) setTags(next);
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }

  function handleChange(next: string) {
    if (delimiterRegex.test(next)) {
      const parts = next.split(delimiterRegex);
      const trailing = parts.pop() ?? "";
      commitParts(parts);
      setDraft(trailing);
    } else {
      setDraft(next);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    commitParts(text.split(splitRegex));
    setDraft("");
  }

  const showError = invalid && Boolean(errorMessage);
  const describedBy =
    [showError ? errorId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const state: TagInputState = { disabled, invalid };
  const atMax = max != null && tags.length >= max;

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
        className={[styles.label, hideLabel ? "kernel-sr-only" : null]
          .filter(Boolean)
          .join(" ")}
        id={labelId}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div
        className={[styles.field, resolveClassName(className, state)].filter(Boolean).join(" ")}
        role="list"
        aria-labelledby={labelId}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <Badge key={tag} role="listitem" variant="neutral" className={styles.tag}>
            <span>{tag}</span>
            <button
              type="button"
              className={styles.tagRemove}
              tabIndex={-1}
              aria-label={`Remove ${tag}`}
              onClick={(event) => {
                event.stopPropagation();
                removeTag(index);
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="12" height="12">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </Badge>
        ))}
        <input
          {...rest}
          ref={mergeRefs(ref, inputRef)}
          id={inputId}
          type="text"
          role="listitem"
          className={styles.input}
          value={draft}
          disabled={disabled || atMax}
          aria-describedby={describedBy}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      </div>
      {showError ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : description ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
    </div>
  );
});
