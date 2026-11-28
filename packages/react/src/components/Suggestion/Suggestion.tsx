import { createContext, forwardRef, useContext } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { pillIconAttrs, usePillIconRef } from "../../utils/pillIcons";
import styles from "./Suggestion.module.css";

export interface SuggestionState {
  disabled: boolean;
}

/** A disabled `Suggestion` disables every chip in it, not just the pointer:
 * `pointer-events: none` alone would still let Tab + Enter fire them. */
const SuggestionDisabledContext = createContext(false);

export interface SuggestionProps extends Omit<HTMLAttributes<HTMLUListElement>, "className"> {
  /** Accessible name for the suggestion list. */
  label?: string;
  /** Disables every `SuggestionItem` inside (each chip's real `disabled`). */
  disabled?: boolean;
  /** `SuggestionItem`s. */
  children: ReactNode;
  className?: ClassNameValue<SuggestionState>;
}

/**
 * A horizontal row of prompt suggestions — the chips that sit above or
 * below a chat composer and seed the next message. A real `<ul>` of
 * `<button>`s (via `SuggestionItem`), not a div of clickable spans: the
 * list announces as a group, each chip is a genuine button, and keyboard
 * focus works without inventing a roving-tabindex pattern for a small
 * set of peer actions.
 *
 * Each item is an optical pill (see `Badge`): the inline padding includes
 * the width the round ends cut away, and an icon at either end of an
 * item's children becomes a `1lh` box concentric with the cap.
 */
export function Suggestion({
  label = "Suggestions",
  disabled = false,
  children,
  className,
  ...rest
}: SuggestionProps) {
  const state: SuggestionState = { disabled };
  return (
    <ul
      {...rest}
      role="list"
      aria-label={label}
      data-disabled={dataAttr(disabled)}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <SuggestionDisabledContext.Provider value={disabled}>{children}</SuggestionDisabledContext.Provider>
    </ul>
  );
}

export interface SuggestionItemState {
  disabled: boolean;
}

export interface SuggestionItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "onSelect"> {
  /** Value handed to `onSelect`. Defaults to the button's text content. */
  value?: string;
  onSelect?: (value: string) => void;
  className?: ClassNameValue<SuggestionItemState>;
  children: ReactNode;
}

export const SuggestionItem = forwardRef<HTMLButtonElement, SuggestionItemProps>(
  function SuggestionItem(
    { value, onSelect, disabled: ownDisabled = false, className, children, onClick, ...rest },
    ref,
  ) {
    const disabled = useContext(SuggestionDisabledContext) || ownDisabled;
    const state: SuggestionItemState = { disabled };
    const pillRef = usePillIconRef<HTMLButtonElement>();
    return (
      <li className={styles.item}>
        <button
          {...pillIconAttrs(children)}
          {...rest}
          ref={mergeRefs(ref, pillRef)}
          type="button"
          disabled={disabled}
          className={[styles.button, resolveClassName(className, state)].filter(Boolean).join(" ")}
          onClick={(event) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            const next =
              value ??
              (typeof children === "string" || typeof children === "number"
                ? String(children)
                : event.currentTarget.textContent ?? "");
            onSelect?.(next);
          }}
        >
          {children}
        </button>
      </li>
    );
  },
);
