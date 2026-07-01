import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Accordion.module.css";

/** Same capability-check pattern as useFloatingPosition's anchor-positioning
 * check: only browsers that actually animate `::details-content` ever fire
 * the `transitionend` this component listens for, so only they should ever
 * flip into a "transitioning" state — otherwise a browser with no
 * transition at all would set `data-state="opening"` once and never clear
 * it, permanently disabling text selection. */
const supportsAnimatedDetails =
  typeof CSS !== "undefined" && CSS.supports("selector(::details-content)");

interface AccordionContextValue {
  /** A shared `name` attribute makes the browser enforce "only one open
   * at a time" natively (`<details name="...">`), no JS coordination
   * needed. Only set when `type="single"`. */
  name?: string;
}

const AccordionContext = createContext<AccordionContextValue>({});

export interface AccordionProps {
  /** `"single"` gives every item the same `name`, so opening one closes
   * the others, natively. `"multiple"` leaves items independent. */
  type?: "single" | "multiple";
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

export function Accordion({ type = "single", children, className }: AccordionProps) {
  const generatedName = useId();

  return (
    <AccordionContext.Provider
      value={{ name: type === "single" ? generatedName : undefined }}
    >
      <div
        className={[styles.accordion, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemState {
  open: boolean;
}

export interface AccordionItemProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: ClassNameValue<AccordionItemState>;
}

/**
 * Built on `<details>`/`<summary>`: expand/collapse, keyboard support,
 * find-in-page, and print-friendliness all come from the browser. The
 * height transition is progressive enhancement (`::details-content`,
 * newly available); browsers without it still open and close instantly
 * and correctly, they just don't animate.
 */
export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  className,
}: AccordionItemProps) {
  const { name } = useContext(AccordionContext);
  const [open, setOpen] = useState(defaultOpen);
  const [transitioning, setTransitioning] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const state: AccordionItemState = { open };

  // `transitionend` for a transition declared on ::details-content
  // doesn't reliably bubble to the real <details> node in every engine
  // that otherwise runs the transition correctly, so a timer reading
  // the same --kernel-duration-base the CSS transition itself uses is
  // the dependable clear, not a fired-or-not DOM event. The listener
  // stays too, as a same-tick clear wherever it does bubble.
  useEffect(() => {
    if (!transitioning) return;
    const node = detailsRef.current;
    if (!node) return;
    const durationMs =
      parseFloat(getComputedStyle(node).getPropertyValue("--kernel-duration-base")) || 200;
    const timer = window.setTimeout(() => setTransitioning(false), durationMs);
    function handleTransitionEnd(event: TransitionEvent) {
      if (event.propertyName === "height") setTransitioning(false);
    }
    node.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      window.clearTimeout(timer);
      node.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [transitioning]);

  return (
    <details
      ref={detailsRef}
      className={[styles.item, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
      name={name}
      open={defaultOpen}
      // Only set while the panel is visually resizing: the browser
      // fighting a drag-select against a moving box looks broken, but
      // there's no reason to block selection once it's settled open.
      // Never set at all in browsers that don't animate this (no
      // transitionend would ever arrive to clear it).
      data-state={transitioning ? (open ? "opening" : "closing") : undefined}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        if (supportsAnimatedDetails) setTransitioning(true);
      }}
    >
      <summary className={styles.trigger}>
        <span className={styles.title}>{title}</span>
        <svg
          className={styles.chevron}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
