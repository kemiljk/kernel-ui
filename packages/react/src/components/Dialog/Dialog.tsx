import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  dataAttr,
  mergeRefs,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import { Button } from "../Button/Button";
import styles from "./Dialog.module.css";

export interface DialogState {
  open: boolean;
  opening: boolean;
  closing: boolean;
}

export interface DialogClassNames {
  root?: ClassNameValue<DialogState>;
  header?: ClassNameValue<DialogState>;
  title?: ClassNameValue<DialogState>;
  description?: ClassNameValue<DialogState>;
  content?: ClassNameValue<DialogState>;
  close?: ClassNameValue<DialogState>;
}

export type DialogBackdrop = "default" | "blur" | "opaque" | "transparent";

export type DialogSide = "center" | "left" | "right" | "top" | "bottom";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Clicking the ::backdrop closes the dialog. On for a modal that's
   * dismissable; turn off for one that must be explicitly confirmed. */
  closeOnBackdropClick?: boolean;
  /** Hide the built-in close control entirely. */
  showCloseButton?: boolean;
  /** Replace the built-in close control. */
  renderClose?: RenderProp<DialogState>;
  /** Per-dialog `::backdrop` treatment. Style further via
   * `--kernel-dialog-backdrop-bg` / `--kernel-dialog-backdrop-filter`. */
  backdrop?: DialogBackdrop;
  /** Appear direction. `"center"` keeps the default scale-settling card;
   * a side turns the dialog into an edge-anchored sheet that slides in
   * by translate instead — a drawer (nav, filters, details panel) reads
   * as pulled in from off-screen, not grown from the middle of the
   * screen. */
  side?: DialogSide;
  /** @deprecated Prefer `classNames.root`. Still applied to the root. */
  className?: ClassNameValue<DialogState>;
  /** Typed class hooks for every structural slot. */
  classNames?: DialogClassNames;
}

/**
 * A real `<dialog>`, opened with `showModal()`. That single call gets you
 * a native top-layer stacking context, a native focus trap, native
 * Escape-to-close, and a native `::backdrop`, none of which have to be
 * reimplemented in JavaScript. React keeps `open` in sync, exposes slot
 * class hooks for composition, and delays the final native `close()`
 * until exit transitions finish so consumer-owned animations can run.
 * Focus is restored by the browser when that final `close()` fires.
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
      showCloseButton = true,
      renderClose,
      backdrop = "default",
      side = "center",
      className,
      classNames,
    },
    forwardedRef,
  ) {
    const internalRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const [opening, setOpening] = useState(false);
    const [closing, setClosing] = useState(false);
    const exitAbortRef = useRef<AbortController | null>(null);
    const skipCloseSyncRef = useRef(false);

    const state: DialogState = {
      open: open || closing,
      opening,
      closing,
    };
    const dataState = closing ? "closing" : open || internalRef.current?.open ? "open" : undefined;

    useEffect(() => {
      const node = internalRef.current;
      if (!node) return;

      if (open) {
        exitAbortRef.current?.abort();
        exitAbortRef.current = null;
        setClosing(false);
        if (!node.open) {
          setOpening(true);
          node.showModal();
          requestAnimationFrame(() => setOpening(false));
        }
        return;
      }

      if (!node.open) return;

      let cancelled = false;
      const controller = new AbortController();
      exitAbortRef.current?.abort();
      exitAbortRef.current = controller;
      setClosing(true);

      void (async () => {
        if (!prefersReducedMotion()) {
          await waitForExitTransition(node, { signal: controller.signal });
        }
        if (cancelled || controller.signal.aborted) return;
        skipCloseSyncRef.current = true;
        node.close();
        setClosing(false);
      })();

      return () => {
        cancelled = true;
        controller.abort();
      };
    }, [open]);

    useEffect(() => {
      const node = internalRef.current;
      if (!node) return;
      // Fires for every closing path after the native `close()` — Escape
      // (once we allow it through), a `method="dialog"` form submission,
      // or our delayed `.close()` above. Routing them all through here
      // keeps `onOpenChange` as the single source of truth.
      const handleClose = () => {
        if (skipCloseSyncRef.current) {
          skipCloseSyncRef.current = false;
          return;
        }
        onOpenChange(false);
      };
      node.addEventListener("close", handleClose);
      return () => node.removeEventListener("close", handleClose);
    }, [onOpenChange]);

    useEffect(() => {
      return () => exitAbortRef.current?.abort();
    }, []);

    function requestClose() {
      if (!open || closing) return;
      onOpenChange(false);
    }

    const closeControl =
      showCloseButton === false
        ? null
        : renderClose !== undefined
          ? renderElement(
              renderClose,
              "button",
              {
                type: "button",
                "aria-label": "Close",
                "data-slot": "dialog-close",
                className: [styles.closeButton, resolveClassName(classNames?.close, state)]
                  .filter(Boolean)
                  .join(" "),
                onClick: requestClose,
              },
              state,
            )
          : (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close"
                data-slot="dialog-close"
                className={[styles.closeButton, resolveClassName(classNames?.close, state)]
                  .filter(Boolean)
                  .join(" ")}
                onClick={requestClose}
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
            );

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
        data-slot="dialog"
        data-state={dataState}
        data-open={dataAttr((open || closing) && !opening)}
        data-opening={dataAttr(opening)}
        data-closing={dataAttr(closing)}
        data-backdrop={backdrop === "default" ? undefined : backdrop}
        data-side={side}
        className={[
          styles.content,
          resolveClassName(className, state),
          resolveClassName(classNames?.root, state),
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => {
          if (closeOnBackdropClick && event.target === internalRef.current) {
            requestClose();
          }
        }}
        onCancel={(event) => {
          // Hold the native close until the exit transition finishes —
          // otherwise consumer exit animations never get a frame.
          event.preventDefault();
          event.stopPropagation();
          requestClose();
        }}
      >
        <header
          data-slot="dialog-header"
          className={[styles.header, resolveClassName(classNames?.header, state)]
            .filter(Boolean)
            .join(" ")}
        >
          <h2
            data-slot="dialog-title"
            className={[styles.title, resolveClassName(classNames?.title, state)]
              .filter(Boolean)
              .join(" ")}
            id={titleId}
          >
            {title}
          </h2>
          {closeControl}
        </header>
        {description ? (
          <p
            data-slot="dialog-description"
            className={[styles.description, resolveClassName(classNames?.description, state)]
              .filter(Boolean)
              .join(" ")}
            id={descriptionId}
          >
            {description}
          </p>
        ) : null}
        <div
          data-slot="dialog-content"
          className={[styles.body, resolveClassName(classNames?.content, state)]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      </dialog>
    );
  },
);
