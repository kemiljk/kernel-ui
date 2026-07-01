import { forwardRef, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { Button } from "../Button/Button";
import styles from "./Dialog.module.css";

export interface DialogState {
  open: boolean;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Clicking the ::backdrop closes the dialog. On for a modal that's
   * dismissable; turn off for one that must be explicitly confirmed. */
  closeOnBackdropClick?: boolean;
  className?: ClassNameValue<DialogState>;
}

/**
 * A real `<dialog>`, opened with `showModal()`. That single call gets you
 * a native top-layer stacking context, a native focus trap, native
 * Escape-to-close, and a native `::backdrop`, none of which have to be
 * reimplemented in JavaScript. React only has to keep `open` in sync and
 * render the content.
 */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
  function Dialog(
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      closeOnBackdropClick = true,
      className,
    },
    forwardedRef,
  ) {
    const internalRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
      const node = internalRef.current;
      if (!node) return;
      if (open && !node.open) node.showModal();
      if (!open && node.open) node.close();
    }, [open]);

    useEffect(() => {
      const node = internalRef.current;
      if (!node) return;
      // Fires for every closing path: Escape, a `method="dialog"` form
      // submission, or our own `.close()` call above. Routing them all
      // through here keeps `onOpenChange` as the single source of truth.
      const handleClose = () => onOpenChange(false);
      node.addEventListener("close", handleClose);
      return () => node.removeEventListener("close", handleClose);
    }, [onOpenChange]);

    const state: DialogState = { open };

    return (
      <dialog
        ref={mergeRefs(forwardedRef, internalRef)}
        // `closedby` is a very new HTML attribute (light-dismiss control)
        // most type definitions don't know about yet; harmless no-op
        // where unsupported since the click-outside handler below and
        // the browser's built-in Escape handling cover every browser.
        {...{ closedby: "any" }}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={[styles.content, resolveClassName(className, state)]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => {
          if (closeOnBackdropClick && event.target === internalRef.current) {
            onOpenChange(false);
          }
        }}
        onCancel={(event) => {
          // Let the native close proceed; `close` above will sync state.
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            className={styles.closeButton}
            onClick={() => onOpenChange(false)}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </header>
        {description ? (
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className={styles.body}>{children}</div>
      </dialog>
    );
  },
);
