import { forwardRef, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import { useControllableState } from "../../utils/useControllableState";
import { showModalReturningFocus, trackPressedControl } from "../../utils/focusReturn";
import { Button } from "../Button/Button";
import { Tab, TabPanel, Tabs, TabsList } from "../Tabs/Tabs";
import styles from "./ArtifactPanel.module.css";

export type ArtifactPanelPresentation = "auto" | "docked" | "overlay";
export type ArtifactPanelStatus = "ready" | "streaming" | "error";

export interface ArtifactPanelState {
  /** What `presentation="auto"` resolved to. */
  presentation: "docked" | "overlay";
  status: ArtifactPanelStatus;
  open: boolean;
  closing: boolean;
}

/** Built-in strings, overridable for translation via `labels`. */
export interface ArtifactPanelLabels {
  /** Close button's accessible name. Default `"Close"`. */
  close: string;
  /** Previous-version button's accessible name. Default `"Previous version"`. */
  previousVersion: string;
  /** Next-version button's accessible name. Default `"Next version"`. */
  nextVersion: string;
  /** The version readout. Default `` (current, total) => `v${current} of ${total}` ``. */
  version: (current: number, total: number) => string;
  /** Accessible name of the version switcher group. Default `"Versions"`. */
  versions: string;
  /** Accessible name of the view tablist. Default `"Views"`. */
  views: string;
  /** Status text while `status="streaming"`. Default `"Generating…"`. */
  streaming: string;
  /** Status text when `status="error"`. Default `"Generation failed"`. */
  error: string;
}

export const defaultArtifactPanelLabels: ArtifactPanelLabels = {
  close: "Close",
  previousVersion: "Previous version",
  nextVersion: "Next version",
  version: (current, total) => `v${current} of ${total}`,
  versions: "Versions",
  views: "Views",
  streaming: "Generating…",
  error: "Generation failed",
};

export interface ArtifactPanelView {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface ArtifactPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "title" | "className" | "children"> {
  /** The artifact's name. Rendered as a real heading and used as the
   * panel's accessible name in both presentations. */
  title: ReactNode;
  /** Level of the title heading in docked mode. Defaults to `2`. A modal
   * overlay is its own document context, so it always uses `h2`. */
  headingLevel?: 2 | 3 | 4;
  /** Whether the panel is showing. Defaults to `true`, the usual case for a
   * docked panel the host mounts and unmounts itself. */
  open?: boolean;
  /** Close button, Escape and backdrop clicks (overlay) ask for `false`. */
  onOpenChange?: (open: boolean) => void;
  /** `"docked"`: an `<aside>` in the page flow — put it in a `Resizable`
   * pane or a grid column. `"overlay"`: a modal `<dialog>` sliding in from
   * the inline end. `"auto"` (default) is docked, and overlay when the
   * viewport is narrower than `overlayBelow`. */
  presentation?: ArtifactPanelPresentation;
  /** Viewport width in px below which `"auto"` becomes an overlay.
   * Defaults to `768`. */
  overlayBelow?: number;
  /** `"streaming"` while the model is still writing the artifact,
   * `"error"` when it failed. Shown as a small dot and a short line of
   * text by the title, announced politely. */
  status?: ArtifactPanelStatus;
  /** The version on show, 1-based. With `versionCount` above 1 the
   * header gets previous/next buttons and a "v3 of 5" readout. */
  version?: number;
  versionCount?: number;
  onVersionChange?: (version: number) => void;
  /** Your own header controls — copy, download, open in a new window.
   * Rendered before the built-in close button. */
  actions?: ReactNode;
  /** Views of the artifact ("Preview", "Code"), switched with Kernel's
   * `Tabs`. Without `views`, `children` is the body. */
  views?: ArtifactPanelView[];
  view?: string;
  defaultView?: string;
  onViewChange?: (view: string) => void;
  children?: ReactNode;
  /** Hide the built-in close button. Escape still closes an overlay. */
  showCloseButton?: boolean;
  labels?: Partial<ArtifactPanelLabels>;
  className?: ClassNameValue<ArtifactPanelState>;
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const list = window.matchMedia(query);
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  };
}

function useNarrowViewport(maxWidth: number, enabled: boolean): boolean {
  // Media query, not a container query, on purpose: the switch changes the
  // element (an `<aside>` becomes a modal `<dialog>`) and its focus
  // behaviour, which CSS can't do — and the question is whether there's
  // room for the panel beside the chat *on this screen*, not how wide the
  // panel's own pane happens to be. A narrow `Resizable` pane on a desktop
  // should stay a docked pane, not turn into a modal.
  const query = `(max-width: ${maxWidth - 0.02}px)`;
  const subscribe = useCallback((cb: () => void) => subscribeMedia(query)(cb), [query]);
  return useSyncExternalStore(
    subscribe,
    () => enabled && typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    // Server and hydration render docked; the client corrects it after.
    () => false,
  );
}

const closeIcon = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const chevronStart = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16" data-flip-rtl="">
    <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const chevronEnd = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16" data-flip-rtl="">
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The side panel an AI app opens beside the chat to show what it made —
 * a page preview, a document, the code behind it.
 *
 * It's two native elements, chosen by `presentation`. Docked, it's an
 * `<aside>` named by its title heading (a complementary landmark): it sits
 * in the page flow, so it drops straight into a `Resizable` pane, and
 * focus moves in and out of it like any other region. As an overlay it's
 * a `<dialog>` opened with `showModal()`, the same way `Dialog` and `Sheet`
 * do it, so the focus trap, Escape, `::backdrop`, inert page and focus
 * restoration are the browser's. `"auto"` picks overlay below
 * `overlayBelow` (a viewport media query, because the choice changes the
 * element and its focus model, which no container query can). Crossing the
 * breakpoint swaps the element, which remounts the body: an iframe preview
 * reloads once on a resize across it, never during normal use.
 *
 * Views are Kernel's `Tabs` (the ARIA tablist pattern, inactive panels
 * truly `hidden`). The status line is a polite live region that's mounted
 * from the start, so "Generating…" and "Generation failed" are announced
 * when they change rather than when they appear.
 */
export const ArtifactPanel = forwardRef<HTMLElement, ArtifactPanelProps>(function ArtifactPanel(
  {
    title,
    headingLevel = 2,
    open = true,
    onOpenChange,
    presentation = "auto",
    overlayBelow = 768,
    status = "ready",
    version,
    versionCount,
    onVersionChange,
    actions,
    views,
    view,
    defaultView,
    onViewChange,
    children,
    showCloseButton = true,
    labels,
    className,
    ...rest
  },
  forwardedRef,
) {
  const l = { ...defaultArtifactPanelLabels, ...labels };
  const titleId = useId();
  const statusId = useId();
  const narrow = useNarrowViewport(overlayBelow, presentation === "auto");
  const resolved: ArtifactPanelState["presentation"] =
    presentation === "overlay" || (presentation === "auto" && narrow) ? "overlay" : "docked";

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);
  const skipCloseSyncRef = useRef(false);

  const [activeView, setActiveView] = useControllableState({
    value: view,
    defaultValue: defaultView ?? views?.[0]?.value ?? "",
    onChange: onViewChange,
  });

  // WebKit never focuses a clicked button; remember it for the restore.
  useEffect(trackPressedControl, []);

  const requestClose = useCallback(() => {
    if (!open || closing) return;
    onOpenChange?.(false);
  }, [open, closing, onOpenChange]);

  // Overlay: keep the native modal state in sync with `open`, holding the
  // final `close()` until the exit transition has played. Same sequence as
  // `Dialog`.
  useEffect(() => {
    if (resolved !== "overlay") return;
    const node = dialogRef.current;
    if (!node) return;
    if (open) {
      setClosing(false);
      if (!node.open) {
        setOpening(true);
        showModalReturningFocus(node);
        requestAnimationFrame(() => setOpening(false));
      }
      return;
    }
    if (!node.open) return;
    const controller = new AbortController();
    setClosing(true);
    void (async () => {
      if (!prefersReducedMotion()) await waitForExitTransition(node, { signal: controller.signal });
      if (controller.signal.aborted) return;
      skipCloseSyncRef.current = true;
      node.close();
      setClosing(false);
    })();
    return () => controller.abort();
  }, [open, resolved]);

  useEffect(() => {
    if (resolved !== "overlay") return;
    const node = dialogRef.current;
    if (!node) return;
    const handleClose = () => {
      if (skipCloseSyncRef.current) {
        skipCloseSyncRef.current = false;
        return;
      }
      onOpenChange?.(false);
    };
    node.addEventListener("close", handleClose);
    return () => node.removeEventListener("close", handleClose);
  }, [onOpenChange, resolved]);

  const state: ArtifactPanelState = { presentation: resolved, status, open: open || closing, closing };
  const Heading = (resolved === "overlay" ? "h2" : `h${headingLevel}`) as "h2";
  const total = versionCount ?? 0;
  const current = Math.min(Math.max(version ?? total, 1), Math.max(total, 1));

  const statusText = status === "streaming" ? l.streaming : status === "error" ? l.error : "";

  const header = (
    <header className={styles.header} data-slot="artifact-panel-header">
      <div className={styles.bar}>
        <div className={styles.heading}>
          <Heading id={titleId} className={styles.title} data-slot="artifact-panel-title">
            {title}
          </Heading>
          {/* Always mounted: a live region only announces changes to content
              it already held when the change happened. */}
          <span id={statusId} role="status" className={styles.status} data-status={status}>
            <span className={styles.statusDot} aria-hidden="true" data-kernel-motion="essential" />
            <span className={styles.statusText}>{statusText}</span>
          </span>
        </div>
        {total > 1 ? (
          <div role="group" aria-label={l.versions} className={styles.versions} data-slot="artifact-panel-versions">
            <Button
              variant="ghost"
              size="sm"
              aria-label={l.previousVersion}
              disabled={current <= 1}
              onClick={() => onVersionChange?.(current - 1)}
              iconStart={chevronStart}
            />
            <span className={styles.versionLabel} aria-live="polite">
              {l.version(current, total)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={l.nextVersion}
              disabled={current >= total}
              onClick={() => onVersionChange?.(current + 1)}
              iconStart={chevronEnd}
            />
          </div>
        ) : null}
        {actions || showCloseButton ? (
          <div className={styles.actions} data-slot="artifact-panel-actions">
            {actions}
            {showCloseButton ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label={l.close}
                onClick={requestClose}
                iconStart={closeIcon}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {views && views.length > 0 ? (
        <TabsList aria-label={l.views} className={styles.tabs}>
          {views.map((item) => (
            <Tab key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </Tab>
          ))}
        </TabsList>
      ) : null}
    </header>
  );

  const body =
    views && views.length > 0 ? (
      <div className={styles.body} data-slot="artifact-panel-body">
        {views.map((item) => (
          <TabPanel key={item.value} value={item.value} className={styles.panel}>
            {item.content}
          </TabPanel>
        ))}
      </div>
    ) : (
      <div className={styles.body} data-slot="artifact-panel-body">
        {children}
      </div>
    );

  const inner =
    views && views.length > 0 ? (
      <Tabs value={activeView} defaultValue={activeView} onValueChange={setActiveView} className={styles.frame}>
        {header}
        {body}
      </Tabs>
    ) : (
      <div className={styles.frame}>
        {header}
        {body}
      </div>
    );

  const common = {
    ...rest,
    "aria-labelledby": titleId,
    "aria-busy": status === "streaming" || undefined,
    "data-slot": "artifact-panel",
    "data-presentation": resolved,
    "data-status": status,
    className: [styles.root, resolveClassName(className, state)].filter(Boolean).join(" "),
  };

  if (resolved === "docked") {
    return (
      <aside {...common} ref={forwardedRef} hidden={!open}>
        {inner}
      </aside>
    );
  }

  return (
    <dialog
      {...common}
      ref={mergeRefs(forwardedRef, dialogRef)}
      data-state={closing ? "closing" : open ? "open" : undefined}
      data-opening={dataAttr(opening)}
      data-closing={dataAttr(closing)}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        rest.onClick?.(event);
        if (event.target === dialogRef.current) requestClose();
      }}
      onCancel={(event) => {
        // Hold the native close until the exit transition has played.
        event.preventDefault();
        requestClose();
      }}
    >
      {inner}
    </dialog>
  );
});
