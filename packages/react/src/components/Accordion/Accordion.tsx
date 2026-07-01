import { createContext, useContext, useId, useState } from "react";
import type { ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Accordion.module.css";

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
  const state: AccordionItemState = { open };

  return (
    <details
      className={[styles.item, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
      name={name}
      open={defaultOpen}
      onToggle={(event) => setOpen(event.currentTarget.open)}
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
