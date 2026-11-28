import { forwardRef, useId, useRef, useState } from "react";
import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import type { ChangeDetails, ChangeEventSource } from "../../utils/changeDetails";
import { useControllableStateWithDetails } from "../../utils/useControllableState";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
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

/** Built-in strings, overridable for translation via `labels`. */
export interface TagInputLabels {
  /** Accessible name of a chip's remove button. Default ``(tag) => `Remove ${tag}` ``. */
  removeTag: (tag: string) => string;
}

const defaultTagInputLabels: TagInputLabels = { removeTag: (tag) => `Remove ${tag}` };

/** What changed a `TagInput`'s tags: Enter, a typed delimiter, a paste, a
 * chip's remove button, or Backspace on an empty draft. */
export type TagInputChangeReason = "enter" | "separator" | "paste" | "remove-button" | "backspace";

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
  /** Called before the tags change, with the reason (`"enter"`, `"separator"`, `"paste"`, `"remove-button"` or `"backspace"`); `details.cancel()`
   * keeps them as they were (an added tag stays in the draft). A removal is
   * reported once the chip's exit transition has played, so a cancelled
   * removal brings the chip back. */
  onValueChange?: (tags: string[], details: ChangeDetails<TagInputChangeReason>) => void;
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
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<TagInputLabels>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * No native element for this — freeform text that commits into discrete
 * tags. The committed tags are a `role="list"` of `role="listitem"`
 * chips, named by the field's label. The text input sits *beside* that
 * list, not inside it: a plain `<input type="text">` that keeps its
 * native textbox role, its `<label for>` name and its `aria-describedby`.
 * (An earlier version gave the input `role="listitem"` so the list would
 * own only listitems, but overriding a textbox's role hides it from
 * assistive tech, and from agents looking for a text field.) The list
 * wrapper is `display: contents`, so the chips and the input are still
 * sibling flex items of the field and flow inline together, and it is
 * only rendered while there are tags, since an empty list is noise.
 * Deliberately lighter than a full
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
    labels,
    ...rest
  },
  ref,
) {
  const l = { ...defaultTagInputLabels, ...labels };
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  const [tags, setTags] = useControllableStateWithDetails<string[], TagInputChangeReason>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Dissolve-then-remove, not instant: a tag stays in the DOM through its
  // own exit transition, so removing it reads as the chip fading away
  // rather than the row snapping shorter. Keyed by the tag's own string
  // value, same identity `key={tag}` below already uses — index would
  // drift if a second removal starts (and finishes) before the first
  // one's deferred setTags runs, silently removing the wrong tag once
  // the array had already shortened underneath it.
  const [removingTags, setRemovingTags] = useState<Set<string>>(new Set());
  const tagsRef = useRef(tags);
  tagsRef.current = tags;
  const tagNodesRef = useRef(new Map<string, HTMLElement>());

  function removeTag(tag: string, reason: "remove-button" | "backspace", event?: ChangeEventSource) {
    inputRef.current?.focus();
    const node = tagNodesRef.current.get(tag);
    if (!node || prefersReducedMotion()) {
      setTags(tagsRef.current.filter((t) => t !== tag), reason, event);
      return;
    }
    setRemovingTags((prev) => {
      const next = new Set(prev);
      next.add(tag);
      return next;
    });
    // The event is long gone by the time the transition ends; only the
    // reason travels.
    void waitForExitTransition(node).then(() => {
      setTags(tagsRef.current.filter((t) => t !== tag), reason);
      setRemovingTags((prev) => {
        if (!prev.has(tag)) return prev;
        const next = new Set(prev);
        next.delete(tag);
        return next;
      });
    });
  }

  const delimiterPattern = delimiters.map(escapeRegExp).join("|");
  const delimiterRegex = new RegExp(delimiterPattern);
  const splitRegex = new RegExp(`${delimiterPattern}|\\r?\\n`);

  function commitDraft(raw: string, event: ChangeEventSource) {
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
    if (setTags([...tags, trimmed], "enter", event)) setDraft("");
  }

  /** Committing more than one part in the same synchronous handler (a
   * typed delimiter splitting several segments at once, or a paste)
   * can't just call `commitDraft` in a loop: `setTags` isn't a functional
   * updater, and React batches state updates within one event, so every
   * call in the loop would read the same stale `tags` closure and each
   * subsequent `setTags` call would overwrite the previous one instead
   * of accumulating. This folds locally over `parts` first and commits
   * the result in one `setTags` call. */
  function commitParts(parts: string[], reason: "separator" | "paste", event: ChangeEventSource): boolean {
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
    return next === tags || setTags(next, reason, event);
  }

  function handleChange(next: string, event: ChangeEventSource) {
    if (delimiterRegex.test(next)) {
      const parts = next.split(delimiterRegex);
      const trailing = parts.pop() ?? "";
      // Vetoed: keep the typed text (minus the delimiter) as the draft.
      setDraft(commitParts(parts, "separator", event) ? trailing : next.replace(delimiterRegex, ""));
    } else {
      setDraft(next);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(draft, event);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]!, "backspace", event);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    if (commitParts(text.split(splitRegex), "paste", event)) setDraft("");
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
        onClick={() => inputRef.current?.focus()}
      >
        {tags.length > 0 ? (
          <div className={styles.tags} role="list" aria-labelledby={labelId}>
            {tags.map((tag) => (
              <Badge
                key={tag}
                ref={(node) => {
                  if (node) tagNodesRef.current.set(tag, node);
                  else tagNodesRef.current.delete(tag);
                }}
                role="listitem"
                variant="neutral"
                className={styles.tag}
                data-tag={tag}
                data-removing={dataAttr(removingTags.has(tag))}
              >
                <span>{tag}</span>
                <button
                  type="button"
                  className={styles.tagRemove}
                  data-icon
                  tabIndex={-1}
                  aria-label={l.removeTag(tag)}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTag(tag, "remove-button", event);
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
          </div>
        ) : null}
        <input
          {...rest}
          ref={mergeRefs(ref, inputRef)}
          id={inputId}
          type="text"
          className={styles.input}
          value={draft}
          disabled={disabled || atMax}
          aria-describedby={describedBy}
          onChange={(event) => handleChange(event.target.value, event)}
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
