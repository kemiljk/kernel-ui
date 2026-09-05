import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import {
  dataAttr,
  mergeRefs,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingPlacement,
} from "../../utils/useFloatingPosition";
import { useMenuMorph } from "../../utils/useMenuMorph";
import styles from "./DropdownMenu.module.css";

interface MenuContextValue {
  close: () => void;
}

/** Exported so other menu-shaped triggers (ContextMenu) can share
 * MenuItem/MenuSeparator without duplicating them. */
export const MenuContext = createContext<MenuContextValue | null>(null);

/** Arrow-key/Home/End roving between a menu's items — shared between
 * `DropdownMenu` and `DropdownMenuMorph` since both use the same
 * `role="menu"` of `role="menuitem"` shape and differ only in how the
 * panel itself opens and closes. */
function roveMenuItems(menu: HTMLElement | null, event: KeyboardEvent<HTMLElement>) {
  const items = Array.from(
    menu?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [],
  );
  if (items.length === 0) return;
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  let nextIndex: number | null = null;

  switch (event.key) {
    case "ArrowDown":
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
      break;
    case "ArrowUp":
      nextIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = items.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  items[nextIndex]?.focus();
}

export interface DropdownMenuState {
  open: boolean;
  placement: FloatingPlacement;
  align: FloatingAlign;
}

export interface DropdownMenuProps {
  /** Native popover (default), or a details/summary disclosure that stays
   * in the page's stacking context. For disclosure, render a <summary>
   * (or Button render={<summary />}) instead of a button. */
  presentation?: "popover" | "disclosure";
  render: RenderProp<{ open: boolean }>;
  children: ReactNode;
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the trigger. */
  align?: FloatingAlign;
  /** Gap between the trigger and the menu, in pixels. */
  offset?: number;
  /** Classes for the menu popup. */
  className?: ClassNameValue<DropdownMenuState>;
  /** Replace the popup element (e.g. wrap with Motion). */
  renderContent?: RenderProp<DropdownMenuState>;
}

/**
 * `role="menu"` on a `popover="auto"` element: outside-click and Escape
 * dismissal, and top-layer stacking, are native to the popover, arrow-key
 * roving between items is the one part of the WAI-ARIA menu pattern that
 * has to be wired up by hand, there's no native menu element.
 */
export function DropdownMenu(props: DropdownMenuProps) {
  return props.presentation === "disclosure"
    ? <DisclosureDropdownMenu {...props} />
    : <PopoverDropdownMenu {...props} />;
}

/** A real details/summary owns toggling and the closed subtree. CSS keeps
 * ::details-content painted through the exit, without a top-layer backdrop
 * or an animation timer. Only menu focus, dismissal and roving need JS. */
function DisclosureDropdownMenu({
  render, children, placement = "bottom", align = "center", offset = 8,
  className, renderContent,
}: DropdownMenuProps) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<boolean>();
  const state = { open: Boolean(open), placement, align };

  function close() {
    const details = detailsRef.current;
    if (!details) return;
    if (menuRef.current?.contains(document.activeElement)) {
      details.querySelector<HTMLElement>("summary")?.focus();
    }
    details.open = false;
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) close();
    }
    // Touch browsers can blur to no relatedTarget before summary's click.
    // Only an actual focus destination outside the disclosure dismisses it.
    function focusOutside(event: FocusEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) close();
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", focusOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", focusOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <MenuContext.Provider value={{ close }}>
      <details
        ref={detailsRef}
        className={styles.disclosure}
        data-placement={placement}
        data-align={align}
        style={{ "--kernel-menu-offset": `${offset}px` } as import("react").CSSProperties}
        onToggle={(event) => {
          const nowOpen = event.currentTarget.open;
          setOpen(nowOpen);
          // Wait for WebKit to lay out the previously skipped subtree.
          if (nowOpen) requestAnimationFrame(() => requestAnimationFrame(() => {
            if (detailsRef.current?.open) menuRef.current
              ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
          }));
        }}
      >
        {renderElement(render, "summary", {
          className: styles.disclosureTrigger,
          "aria-haspopup": "menu",
          "aria-controls": id,
          "aria-expanded": open,
        }, { open: Boolean(open) })}
        {renderElement(renderContent, "div", {
          ref: menuRef, id, role: "menu", inert: open === false,
          "data-slot": "dropdown-menu-content",
          "data-placement": placement, "data-align": align,
          "data-open": dataAttr(open),
          className: [styles.content, styles.disclosureContent, resolveClassName(className, state)].filter(Boolean).join(" "),
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => roveMenuItems(menuRef.current, event),
          children,
        }, state)}
      </details>
    </MenuContext.Provider>
  );
}

function PopoverDropdownMenu({
  render,
  children,
  placement = "bottom",
  align = "center",
  offset = 8,
  className,
  renderContent,
}: DropdownMenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });

  const state: DropdownMenuState = { open, placement, align };

  useEffect(() => {
    const node = menuRef.current;
    if (!node) return;

    function handleToggle(event: Event) {
      const nowOpen = (event as ToggleEvent).newState === "open";
      setOpen(nowOpen);
      if (nowOpen) {
        requestAnimationFrame(() => {
          menuRef.current
            ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
            ?.focus();
        });
      }
    }

    node.addEventListener("toggle", handleToggle);
    return () => node.removeEventListener("toggle", handleToggle);
  }, []);

  function close() {
    menuRef.current?.hidePopover?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    roveMenuItems(menuRef.current, event);
  }

  const trigger = renderElement(
    render,
    "button",
    {
      ref: anchorRef,
      popoverTarget: id,
      "aria-haspopup": "menu",
      "aria-expanded": open,
    },
    { open },
  );

  const popupProps: Record<string, unknown> = {
    ref: mergeRefs(menuRef, floatingRef),
    id,
    role: "menu",
    popover: "auto",
    onKeyDown: handleKeyDown,
    "data-slot": "dropdown-menu-content",
    "data-placement": placement,
    "data-align": align,
    "data-open": dataAttr(open),
    className: [styles.content, resolveClassName(className, state)]
      .filter(Boolean)
      .join(" "),
    children,
  };

  const popup = renderElement(renderContent, "div", popupProps, state);

  return (
    <MenuContext.Provider value={{ close }}>
      {trigger}
      {popup}
    </MenuContext.Provider>
  );
}

export interface MenuItemState {
  disabled: boolean;
  destructive: boolean;
  highlighted: boolean;
}

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "role"> {
  destructive?: boolean;
  onSelect?: () => void;
  className?: ClassNameValue<MenuItemState>;
  /** Render as a different element — typically an `<a>`, React Router
   * `Link`, or Next.js `Link` — while keeping menu keyboard behaviour. */
  render?: RenderProp<MenuItemState>;
}

export function MenuItem({
  destructive = false,
  onSelect,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  disabled,
  children,
  className,
  render,
  ...rest
}: MenuItemProps) {
  const context = useContext(MenuContext);
  const [highlighted, setHighlighted] = useState(false);
  const state: MenuItemState = {
    disabled: Boolean(disabled),
    destructive,
    highlighted,
  };

  function handleClick(event: ReactMouseEvent<HTMLElement>) {
    onClick?.(event as ReactMouseEvent<HTMLButtonElement>);
    if (event.defaultPrevented || disabled) return;
    // Modifier-clicks / middle-click keep native link behaviour (new tab,
    // etc.) — we never preventDefault here, only close after select.
    onSelect?.();
    context?.close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(event as KeyboardEvent<HTMLButtonElement>);
    if (event.defaultPrevented || disabled) return;
    // Anchors activate on Enter natively; Space does not. Mirror button
    // menu-item behaviour so keyboard users get a consistent activation.
    if (event.key === " ") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }

  const sharedProps: Record<string, unknown> = {
    ...rest,
    role: "menuitem",
    tabIndex: -1,
    "aria-disabled": disabled || undefined,
    "data-slot": "menu-item",
    "data-highlighted": dataAttr(highlighted),
    "data-disabled": dataAttr(disabled),
    "data-destructive": dataAttr(destructive),
    className: [styles.item, resolveClassName(className, state)]
      .filter(Boolean)
      .join(" "),
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onFocus: (event: ReactFocusEvent<HTMLElement>) => {
      setHighlighted(true);
      onFocus?.(event as ReactFocusEvent<HTMLButtonElement>);
    },
    onBlur: (event: ReactFocusEvent<HTMLElement>) => {
      setHighlighted(false);
      onBlur?.(event as ReactFocusEvent<HTMLButtonElement>);
    },
    children,
  };

  if (render) {
    return renderElement(
      render,
      "button",
      {
        ...sharedProps,
        // Non-button renders can't take the boolean `disabled` attribute
        // meaningfully — aria-disabled above covers assistive tech.
      },
      state,
    );
  }

  return (
    <button
      {...(sharedProps as ButtonHTMLAttributes<HTMLButtonElement>)}
      type="button"
      disabled={disabled}
    />
  );
}

export function MenuSeparator() {
  return <div role="separator" data-slot="menu-separator" className={styles.separator} />;
}

/**
 * The same down chevron `NavigationMenuTrigger` bakes in automatically —
 * exported here instead, since `DropdownMenu`'s trigger is an arbitrary
 * `render` element rather than a dedicated trigger component, so there's
 * no single place to inject it silently (see `RenderProp`'s doc comment:
 * what renders is always visible at the call site, not implied). Drop it
 * in as a trigger's `iconEnd` (or any child) — it reads `aria-expanded`
 * off its nearest ancestor via CSS, so it rotates open/closed on its own
 * with no extra wiring, the same as `NavigationMenuTrigger`'s.
 */
export function MenuChevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface DropdownMenuMorphProps {
  render: RenderProp<{ open: boolean }>;
  children: ReactNode;
  placement?: FloatingPlacement;
  align?: FloatingAlign;
  /** Gap between the trigger and the menu, in pixels. */
  offset?: number;
  /** Classes for the menu popup. */
  className?: ClassNameValue<DropdownMenuState>;
  /** Replace the popup element (e.g. wrap with Motion). */
  renderContent?: RenderProp<DropdownMenuState>;
}

/**
 * `DropdownMenu`'s trigger-morphs-into-menu variant — transitions.dev's
 * "plus menu morph" recipe: the panel's own container animates
 * width/height/border-radius out from the trigger's exact footprint
 * (see `useMenuMorph`'s FLIP technique) instead of scaling/fading in
 * place the way `DropdownMenu` does.
 *
 * That one difference forces a second one: `DropdownMenu` is
 * `popover="auto"` and lets the platform's own light-dismiss close it,
 * which is why it never calls `showPopover()`/`hidePopover()` itself —
 * but a popover's hide is deliberately not cancelable, so there's no
 * way to defer it long enough for the shrink-back-to-the-trigger
 * animation to play first. This is `popover="manual"` instead, with its
 * own outside-click/Escape dismissal wired up by hand — the same
 * tradeoff `ContextMenu` and `Combobox` already make for their own
 * manual popovers, and the reason this is a separate export rather than
 * a prop on `DropdownMenu` itself: the two don't just look different,
 * they're built on a different popover mode.
 *
 * Shares `MenuItem`/`MenuSeparator`/`MenuContext` with `DropdownMenu` —
 * only the trigger/panel open-close mechanism differs, same as
 * `ContextMenu`'s own relationship to those exports.
 */
export function DropdownMenuMorph({
  render,
  children,
  placement = "bottom",
  align = "center",
  offset = 8,
  className,
  renderContent,
}: DropdownMenuMorphProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });
  const { playMorphOpen, playMorphClose, cancelMorph } = useMenuMorph(anchorRef, menuRef);

  const state: DropdownMenuState = { open, placement, align };

  function openMenu() {
    cancelMorph();
    setClosing(false);
    setOpen(true);
    const menu = menuRef.current;
    // Written directly rather than left to React's own re-render:
    // playMorphOpen below needs `[data-open]`'s transition rule already
    // active the instant it shows the popover, and React wouldn't
    // commit this attribute until after this synchronous handler
    // returns — the same reason useFloatingPosition writes
    // --kernel-transform-origin straight to the DOM instead of through
    // state. Removing data-closing matters too, not just tidiness: a
    // reopen that lands mid-close would otherwise leave both attributes
    // set at once, and [data-closing]'s rule — declared later in the
    // stylesheet — would win the tie on equal specificity, keeping the
    // calmer close timing active for what should be the bouncier open.
    menu?.removeAttribute("data-closing");
    menu?.setAttribute("data-open", "");
    playMorphOpen(() => {
      // A reopen landing mid-close cancels that close's wait (above)
      // before it ever calls hidePopover(), so the popover can still be
      // showing here — showPopover() throws on an already-shown one.
      try {
        menu?.showPopover();
      } catch {
        /* already showing */
      }
    });
    requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
        ?.focus();
    });
  }

  /** `open` flips immediately so the dismissal listeners below tear down
   * at once; the morph-close animation plays independently and hides
   * the popover itself once it finishes (see `useMenuMorph`). `data-*`
   * is written straight to the DOM, same reasoning as `openMenu`'s own
   * direct write: `playMorphClose` sets its footprint override
   * synchronously, right below, and needs `[data-closing]`'s calmer
   * transition already active at that moment — if `[data-open]` (set
   * by a still-uncommitted React render) were still the only attribute
   * present, the shrink would play on the bouncier open timing instead. */
  function close() {
    if (!open) return;
    setOpen(false);
    setClosing(true);
    const menu = menuRef.current;
    menu?.removeAttribute("data-open");
    menu?.setAttribute("data-closing", "");
    void playMorphClose().then(() => setClosing(false));
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !anchorRef.current?.contains(target)) close();
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    roveMenuItems(menuRef.current, event);
  }

  const trigger = renderElement(
    render,
    "button",
    {
      ref: anchorRef,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      onClick: () => (open ? close() : openMenu()),
    },
    { open },
  );

  const popupProps: Record<string, unknown> = {
    ref: mergeRefs(menuRef, floatingRef),
    id,
    role: "menu",
    popover: "manual",
    onKeyDown: handleMenuKeyDown,
    "data-slot": "dropdown-menu-morph-content",
    "data-placement": placement,
    "data-align": align,
    "data-open": dataAttr(open),
    "data-closing": dataAttr(closing),
    className: [styles.morphContent, resolveClassName(className, state)]
      .filter(Boolean)
      .join(" "),
    children,
  };

  const popup = renderElement(renderContent, "div", popupProps, state);

  return (
    <MenuContext.Provider value={{ close }}>
      {trigger}
      {popup}
    </MenuContext.Provider>
  );
}
