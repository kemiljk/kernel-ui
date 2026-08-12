import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { dataAttr } from "../../utils/polymorphic";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import styles from "./CommandPalette.module.css";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

export interface CommandPaletteGroup {
  id: string;
  label?: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: CommandPaletteItem[];
  groups?: CommandPaletteGroup[];
  placeholder?: string;
  emptyMessage?: ReactNode;
  /** Light frost on the `::backdrop` (`backdrop-filter: blur(8px)`). */
  blur?: boolean;
  /** Set to false when results are filtered by the consumer. */
  shouldFilter?: boolean;
  renderItem?: (
    item: CommandPaletteItem,
    state: { active: boolean; group?: CommandPaletteGroup; index: number },
  ) => ReactNode;
  children?: ReactNode;
}

export interface CommandPaletteInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface CommandPaletteItemProps {
  id?: string;
  value?: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect?: () => void;
  children: ReactNode | ((state: { active: boolean }) => ReactNode);
}

export interface CommandPaletteGroupProps {
  id?: string;
  heading?: ReactNode;
  children: ReactNode;
}

interface RegisteredItem {
  id: string;
  value: string;
  keywords: string[];
  disabled: boolean;
  onSelect?: () => void;
  group?: CommandPaletteGroup;
}

interface PaletteContextValue {
  listboxId: string;
  query: string;
  activeId: string | null;
  registerItem: (item: RegisteredItem) => () => void;
  setQuery: (value: string) => void;
  setActiveId: (id: string, fromKeyboard?: boolean) => void;
  selectableItems: RegisteredItem[];
  selectItem: (item: RegisteredItem) => void;
  isVisible: (item: RegisteredItem) => boolean;
  setInputElement: (element: HTMLInputElement | null) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);
const GroupContext = createContext<CommandPaletteGroup | undefined>(undefined);
const noKeywords: string[] = [];

function usePaletteContext() {
  const context = useContext(PaletteContext);
  if (!context) throw new Error("CommandPalette compound components must be used inside CommandPalette");
  return context;
}

function matchesQuery(item: RegisteredItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [item.value, ...item.keywords].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function generatedId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function CommandPaletteInput({ value, onValueChange, ...props }: CommandPaletteInputProps) {
  const context = usePaletteContext();
  const { query, setQuery } = context;

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [setQuery, value]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const activeIndex = context.selectableItems.findIndex((item) => item.id === context.activeId);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      context.setActiveId(context.selectableItems[Math.min(activeIndex + 1, context.selectableItems.length - 1)]?.id ?? "");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      context.setActiveId(context.selectableItems[Math.max(activeIndex - 1, 0)]?.id ?? "");
    } else if (event.key === "Enter") {
      const active = context.selectableItems[activeIndex];
      if (active) {
        event.preventDefault();
        context.selectItem(active);
      }
    }
  }

  return (
    <input
      {...props}
      ref={context.setInputElement}
      type={props.type ?? "text"}
      role="combobox"
      aria-expanded="true"
      aria-controls={context.listboxId}
      aria-autocomplete="list"
      aria-activedescendant={context.activeId ?? undefined}
      value={value ?? query}
      autoComplete="off"
      onChange={(event) => {
        setQuery(event.target.value);
        onValueChange?.(event.target.value);
      }}
      onKeyDown={handleKeyDown}
      className={[styles.input, props.className].filter(Boolean).join(" ")}
    />
  );
}

function CommandPaletteItem({ id, value, keywords, disabled = false, onSelect, children }: CommandPaletteItemProps) {
  const context = usePaletteContext();
  const group = useContext(GroupContext);
  const generated = useId();
  const itemId = id ?? `${context.listboxId}-item-${generatedId(generated)}`;
  const normalizedKeywords = keywords ?? noKeywords;
  const entry = useMemo<RegisteredItem>(
    () => ({ id: itemId, value: value ?? "", keywords: normalizedKeywords, disabled, onSelect, group }),
    [disabled, group, itemId, normalizedKeywords, onSelect, value],
  );

  useEffect(() => context.registerItem(entry), [context.registerItem, entry]);
  if (!context.isVisible(entry)) return null;

  const active = context.activeId === itemId;
  return (
    <div
      id={itemId}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      data-active={dataAttr(active)}
      className={styles.option}
      onPointerDown={(event) => event.preventDefault()}
      onPointerMove={() => { if (!disabled) context.setActiveId(itemId, false); }}
      onClick={() => { if (!disabled) context.selectItem(entry); }}
    >
      {typeof children === "function" ? children({ active }) : children}
    </div>
  );
}

function CommandPaletteGroup({ id, heading, children }: CommandPaletteGroupProps) {
  const context = usePaletteContext();
  const generated = useId();
  const groupId = id ?? `${context.listboxId}-group-${generatedId(generated)}`;
  const headingId = `${groupId}-heading`;
  const group = useMemo<CommandPaletteGroup>(
    () => ({ id: groupId, label: typeof heading === "string" ? heading : undefined, items: [] }),
    [groupId, heading],
  );

  return (
    <GroupContext.Provider value={group}>
      <div role="group" aria-labelledby={heading !== undefined ? headingId : undefined}>
        {heading !== undefined ? <div id={headingId} role="presentation" className={styles.groupLabel}>{heading}</div> : null}
        {children}
      </div>
    </GroupContext.Provider>
  );
}

function CommandPaletteList({ children }: { children: ReactNode }) {
  const context = usePaletteContext();
  return <ScrollArea id={context.listboxId} role="listbox" edgeShadow className={styles.listbox}>{children}</ScrollArea>;
}

function CommandPaletteEmpty({ children }: { children: ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

function CommandPaletteLoading({ children }: { children: ReactNode }) {
  return <div role="status" className={styles.empty}>{children}</div>;
}

function CommandPaletteShorthand({ items, groups, renderItem }: Pick<CommandPaletteProps, "items" | "groups" | "renderItem">) {
  const isGrouped = Boolean(groups && groups.length > 0);
  const sourceGroups = isGrouped ? groups ?? [] : [{ id: "__items__", items: items ?? [] }];
  return <>
    {sourceGroups.map((group) => <CommandPaletteGroup key={group.id} id={group.id} heading={group.label}>
      {group.items.map((item, index) => <CommandPaletteItem key={item.id} id={item.id} value={`${item.label} ${item.description ?? ""}`} onSelect={item.onSelect}>
        {({ active }) => renderItem
          ? renderItem(item, { active, group: isGrouped ? group : undefined, index })
          : <><div className={styles.optionLabel}>{item.label}</div>{item.description ? <div className={styles.optionDescription}>{item.description}</div> : null}</>}
      </CommandPaletteItem>)}
    </CommandPaletteGroup>)}
  </>;
}

function CommandPaletteRoot({
  open,
  onOpenChange,
  items = [],
  groups,
  placeholder = "Filter commands",
  emptyMessage = "No results",
  blur = false,
  shouldFilter = true,
  renderItem,
  children,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [registeredItems, setRegisteredItems] = useState<RegisteredItem[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const exitAbortRef = useRef<AbortController | null>(null);
  const skipCloseSyncRef = useRef(false);
  const keyboardNavRef = useRef(false);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const registerItem = useCallback((item: RegisteredItem) => {
    setRegisteredItems((current) => [...current.filter((entry) => entry.id !== item.id), item]);
    return () => setRegisteredItems((current) => current.filter((entry) => entry.id !== item.id));
  }, []);
  const isVisible = useCallback((item: RegisteredItem) => !shouldFilter || matchesQuery(item, query), [query, shouldFilter]);
  const selectableItems = useMemo(
    () => registeredItems.filter((item) => !item.disabled && isVisible(item)),
    [isVisible, registeredItems],
  );
  const setActiveId = useCallback((nextId: string, fromKeyboard = true) => {
    keyboardNavRef.current = fromKeyboard;
    setActiveIdState(nextId || null);
  }, []);
  const setInputElement = useCallback((element: HTMLInputElement | null) => {
    inputElementRef.current = element;
  }, []);

  useEffect(() => {
    setActiveIdState((current) => selectableItems.some((item) => item.id === current) ? current : selectableItems[0]?.id ?? null);
  }, [selectableItems]);

  useEffect(() => {
    if (!keyboardNavRef.current || !activeId) return;
    keyboardNavRef.current = false;
    document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const context = useMemo<PaletteContextValue>(() => ({
    listboxId,
    query,
    activeId,
    registerItem,
    setQuery,
    setActiveId,
    selectableItems,
    selectItem: (item) => {
      item.onSelect?.();
      onOpenChange(false);
    },
    isVisible,
    setInputElement,
  }), [activeId, isVisible, listboxId, onOpenChange, query, registerItem, selectableItems, setActiveId, setInputElement]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open) {
      exitAbortRef.current?.abort();
      setClosing(false);
      if (!node.open) node.showModal();
      return;
    }
    if (!node.open) return;
    const controller = new AbortController();
    exitAbortRef.current?.abort();
    exitAbortRef.current = controller;
    setClosing(true);
    void (async () => {
      if (!prefersReducedMotion()) await waitForExitTransition(node, { signal: controller.signal });
      if (controller.signal.aborted) return;
      skipCloseSyncRef.current = true;
      node.close();
      setClosing(false);
    })();
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
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
    if (!open) return;
    setQuery("");
    setActiveIdState(null);
    requestAnimationFrame(() => inputElementRef.current?.focus());
  }, [open]);

  const dataState = closing ? "closing" : open || dialogRef.current?.open ? "open" : undefined;
  const shorthand = <><CommandPaletteInput placeholder={placeholder} aria-label={placeholder} />
    <CommandPaletteList>{selectableItems.length === 0 ? <CommandPaletteEmpty>{emptyMessage}</CommandPaletteEmpty> : null}
      <CommandPaletteShorthand items={items} groups={groups} renderItem={renderItem} />
    </CommandPaletteList></>;

  return <PaletteContext.Provider value={context}><dialog ref={dialogRef} className={styles.content} aria-label="Command palette"
    data-state={dataState} data-open={dataAttr(open && !closing)} data-closing={dataAttr(closing)} data-blur={dataAttr(blur)}
    onClick={(event) => { if (event.target === dialogRef.current) onOpenChange(false); }}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onOpenChange(false); }}>
    {children ?? shorthand}
  </dialog></PaletteContext.Provider>;
}

type CommandPaletteComponent = typeof CommandPaletteRoot & {
  Input: typeof CommandPaletteInput;
  List: typeof CommandPaletteList;
  Group: typeof CommandPaletteGroup;
  Item: typeof CommandPaletteItem;
  Empty: typeof CommandPaletteEmpty;
  Loading: typeof CommandPaletteLoading;
};

export const CommandPalette = Object.assign(CommandPaletteRoot, {
  Input: CommandPaletteInput,
  List: CommandPaletteList,
  Group: CommandPaletteGroup,
  Item: CommandPaletteItem,
  Empty: CommandPaletteEmpty,
  Loading: CommandPaletteLoading,
}) as CommandPaletteComponent;