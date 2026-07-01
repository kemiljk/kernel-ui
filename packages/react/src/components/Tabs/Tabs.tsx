import { createContext, useContext, useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./Tabs.module.css";

interface TabsContextValue {
  baseId: string;
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${component} must be used inside <Tabs>.`);
  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * There's no native tabs element, this is the WAI-ARIA `tablist` pattern.
 * `TabPanel` uses the native `hidden` attribute for the inactive panels,
 * so they're genuinely removed from layout and the accessibility tree,
 * not just visually hidden.
 */
export function Tabs({ value, defaultValue, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  const [current, setCurrent] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  return (
    <TabsContext.Provider value={{ baseId, value: current, setValue: setCurrent }}>
      <div className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  "aria-label": string;
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

export function TabsList({ children, className, ...rest }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const previousXRef = useRef<number | null>(null);
  const { value: activeValue } = useTabsContext("TabsList");

  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const activeTab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!activeTab) return;

    const nextX = activeTab.offsetLeft;
    const nextWidth = activeTab.offsetWidth;
    const previousX = previousXRef.current;
    const isFirstRender = previousX === null;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let duration = 0;
    if (!isFirstRender && !reducedMotion) {
      const distance = Math.abs(nextX - previousX);
      duration = Math.min(320, Math.max(120, distance * 0.6));
    }

    indicator.style.transitionDuration = `${duration}ms`;
    indicator.style.setProperty("--kernel-tabs-indicator-x", `${nextX}px`);
    indicator.style.setProperty("--kernel-tabs-indicator-width", `${nextWidth}px`);

    previousXRef.current = nextX;
  }, [activeValue]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = currentIndex === -1 ? tabs.length - 1 : (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  }

  return (
    <div
      {...rest}
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={[styles.list, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      <span className={styles.indicator} ref={indicatorRef} />
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: ClassNameValue<{ selected: boolean }>;
}

export function Tab({ value, children, disabled = false, className }: TabProps) {
  const { baseId, value: activeValue, setValue } = useTabsContext("Tab");
  const selected = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={[styles.tab, resolveClassName(className, { selected })]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { baseId, value: activeValue } = useTabsContext("TabPanel");
  const selected = activeValue === value;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!selected}
      tabIndex={0}
      className={[styles.panel, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
