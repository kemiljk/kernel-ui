import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { inputModality, trackInputModality, type ChangeDetails, type ChangeEventSource } from "../../utils/changeDetails";
import { fuzzyFilter, fuzzyScore, fuzzySegments } from "../../utils/fuzzy";
import { dataAttr } from "../../utils/polymorphic";
import { emitChange } from "../../utils/useControllableState";
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

/** Built-in strings, overridable for translation via `labels`. The
 * filter field's text and the empty state are the `placeholder` and
 * `emptyMessage` props. */
export interface CommandPaletteLabels {
  /** Accessible name of the palette's `<dialog>`. Default `"Command palette"`. */
  dialog: string;
}

const defaultCommandPaletteLabels: CommandPaletteLabels = { dialog: "Command palette" };

/** Why the palette asked to close: Escape, a click on the backdrop, an item
 * chosen by pointer or by Enter, or the native `<dialog>` closing some other
 * way (a `method="dialog"` form, `dialog.close()`). */
export type CommandPaletteOpenChangeReason =
  | "escape-key"
  | "outside-press"
  | "item-press"
  | "item-keyboard"
  | "programmatic";

/** A custom filter: return a score above 0 to keep an item (higher ranks
 * first) or 0 to hide it. Same shape as cmdk's `filter`. */
export type CommandPaletteFilter = (text: string, query: string, keywords?: string[]) => number;

export interface CommandPaletteProps {
  open: boolean;
  /** Called with the reason the palette wants to close — `"escape-key"`,
   * `"outside-press"`, `"item-press"`, `"item-keyboard"` or
   * `"programmatic"`. The palette is
   * controlled, so not updating `open` keeps it open; `details.cancel()`
   * says so explicitly (an item's `onSelect` still runs either way). */
  onOpenChange: (open: boolean, details: ChangeDetails<CommandPaletteOpenChangeReason>) => void;
  items?: CommandPaletteItem[];
  groups?: CommandPaletteGroup[];
  /** Filter field placeholder, also its accessible name. Defaults to `"Filter commands"`. */
  placeholder?: string;
  /** Shown when nothing matches. Defaults to `"No results"`. */
  emptyMessage?: ReactNode;
  /** Light frost on the `::backdrop` (`backdrop-filter: blur(8px)`). Defaults to `false`. */
  blur?: boolean;
  /** Set to false when results are filtered by the consumer. */
  shouldFilter?: boolean;
  /** Replace the built-in ranked fuzzy match (see `fuzzyScore`). Return a
   * score above 0 to keep an item, higher first; 0 hides it. */
  filter?: CommandPaletteFilter;
  renderItem?: (
    item: CommandPaletteItem,
    state: { active: boolean; group?: CommandPaletteGroup; index: number },
  ) => ReactNode;
  children?: ReactNode;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<CommandPaletteLabels>;
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
  selectItem: (item: RegisteredItem, event?: ChangeEventSource) => void;
  /** Visible, enabled items in the order they're rendered — ranked results
   * reorder the DOM, so registration order isn't navigation order. */
  orderedItems: () => RegisteredItem[];
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

function matchesQuery(item: RegisteredItem, query: string, filter?: CommandPaletteFilter) {
  if (!query.trim()) return true;
  if (filter) return filter(item.value, query, item.keywords) > 0;
  return [item.value, ...item.keywords].some((value) => fuzzyScore(query, value) !== null);
}

function inDomOrder(items: RegisteredItem[]): RegisteredItem[] {
  if (typeof document === "undefined") return items;
  return [...items].sort((a, b) => {
    const first = document.getElementById(a.id);
    const second = document.getElementById(b.id);
    if (!first || !second) return 0;
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}

/** Matched label text wrapped in `<mark>`, the rest plain. */
function Highlighted({ text, ranges }: { text: string; ranges: Array<[number, number]> }) {
  if (ranges.length === 0) return <>{text}</>;
  return (
    <>
      {fuzzySegments(text, ranges).map((segment, index) =>
        segment.match ? (
          <mark key={index} className={styles.match}>
            {segment.text}
          </mark>
        ) : (
          segment.text
        ),
      )}
    </>
  );
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
    const items = context.orderedItems();
    const activeIndex = items.findIndex((item) => item.id === context.activeId);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      context.setActiveId(items[Math.min(activeIndex + 1, items.length - 1)]?.id ?? "");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      context.setActiveId(items[Math.max(activeIndex - 1, 0)]?.id ?? "");
    } else if (event.key === "Enter") {
      const active = items[activeIndex];
      if (active) {
        event.preventDefault();
        context.selectItem(active, event);
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
      onClick={(event) => { if (!disabled) context.selectItem(entry, event); }}
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

function CommandPaletteShorthand({
  items,
  groups,
  renderItem,
  shouldFilter = true,
  filter,
}: Pick<CommandPaletteProps, "items" | "groups" | "renderItem" | "shouldFilter" | "filter">) {
  const { query } = usePaletteContext();
  const isGrouped = Boolean(groups && groups.length > 0);
  const sourceGroups = isGrouped ? groups ?? [] : [{ id: "__items__", items: items ?? [] }];
  const ranked = shouldFilter && !filter && query.trim() !== "";
  return <>
    {sourceGroups.map((group) => {
      // The data-driven API ranks: best match first within each group, in
      // the DOM itself (so arrow keys and screen readers follow the same
      // order the eye does), with the matched label characters marked.
      const ordered = ranked
        ? fuzzyFilter(group.items, query, (item) => [item.label, item.description ?? ""])
        : group.items.map((item, index) => ({ item, index, field: 0, ranges: [] as Array<[number, number]> }));
      return <CommandPaletteGroup key={group.id} id={group.id} heading={group.label}>
        {ordered.map(({ item, index, field, ranges }) => <CommandPaletteItem key={item.id} id={item.id} value={`${item.label} ${item.description ?? ""}`} onSelect={item.onSelect}>
          {({ active }) => renderItem
            ? renderItem(item, { active, group: isGrouped ? group : undefined, index })
            : <><div className={styles.optionLabel}><Highlighted text={item.label} ranges={field === 0 ? ranges : []} /></div>{item.description ? <div className={styles.optionDescription}><Highlighted text={item.description} ranges={field === 1 ? ranges : []} /></div> : null}</>}
        </CommandPaletteItem>)}
      </CommandPaletteGroup>;
    })}
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
  filter,
  renderItem,
  children,
  labels,
}: CommandPaletteProps) {
  const l = { ...defaultCommandPaletteLabels, ...labels };
  const [query, setQuery] = useState("");
  const [registeredItems, setRegisteredItems] = useState<RegisteredItem[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const keyboardNavRef = useRef(false);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const registerItem = useCallback((item: RegisteredItem) => {
    setRegisteredItems((current) => [...current.filter((entry) => entry.id !== item.id), item]);
    return () => setRegisteredItems((current) => current.filter((entry) => entry.id !== item.id));
  }, []);
  const isVisible = useCallback(
    (item: RegisteredItem) => !shouldFilter || matchesQuery(item, query, filter),
    [filter, query, shouldFilter],
  );
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

  useEffect(trackInputModality, []);

  // After commit, so the DOM already shows the newly ranked order.
  useEffect(() => {
    const ordered = inDomOrder(selectableItems);
    setActiveIdState((current) =>
      query.trim() === "" && selectableItems.some((item) => item.id === current)
        ? current
        : ordered[0]?.id ?? null,
    );
  }, [query, selectableItems]);

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
    selectItem: (item, event) => {
      item.onSelect?.();
      emitChange(onOpenChange, false, inputModality(event) === "keyboard" ? "item-keyboard" : "item-press", event);
    },
    orderedItems: () => inDomOrder(selectableItems),
    isVisible,
    setInputElement,
  }), [activeId, isVisible, listboxId, onOpenChange, query, registerItem, selectableItems, setActiveId, setInputElement]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
      return;
    }
    if (node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const handleClose = (event: Event) => {
      if (openRef.current) emitChange(onOpenChange, false, "programmatic", event);
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

  const shorthand = <><CommandPaletteInput placeholder={placeholder} aria-label={placeholder} />
    <CommandPaletteList>{selectableItems.length === 0 ? <CommandPaletteEmpty>{emptyMessage}</CommandPaletteEmpty> : null}
      <CommandPaletteShorthand items={items} groups={groups} renderItem={renderItem} shouldFilter={shouldFilter} filter={filter} />
    </CommandPaletteList></>;

  return <PaletteContext.Provider value={context}><dialog ref={dialogRef} className={styles.content} aria-label={l.dialog}
    data-state={open ? "open" : undefined} data-open={dataAttr(open)} data-blur={dataAttr(blur)}
    onClick={(event) => { if (event.target === dialogRef.current) emitChange(onOpenChange, false, "outside-press", event); }}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); emitChange(onOpenChange, false, "escape-key", event); }}>
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
