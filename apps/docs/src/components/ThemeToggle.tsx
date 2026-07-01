import { useEffect, useState } from "react";
import { Switch } from "@kernelui/react";
import { THEME_CHANGE_EVENT, applyColorScheme, getStoredColorScheme } from "../lib/theme";

function SunIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      className="theme-toggle-icon"
      data-active={active || undefined}
    >
      <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5l-1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      className="theme-toggle-icon"
      data-active={active || undefined}
    >
      <path
        d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * `data-theme` on `<html>` forces `light-dark()` to resolve one way
 * regardless of the OS setting. No `data-theme` at all means "follow
 * the system", which is the default until a visitor picks one. Sun
 * and moon glyphs flank the switch so the current mode reads at a
 * glance instead of having to infer it from which side a plain switch
 * is sitting on; the switch itself still carries the actual
 * accessible name and keyboard/ARIA behaviour.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    function sync() {
      setDark(getStoredColorScheme() === "dark");
    }
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  return (
    <span className="theme-toggle">
      <SunIcon active={!dark} />
      <Switch
        checked={dark}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        onCheckedChange={(checked) => {
          setDark(checked);
          applyColorScheme(checked ? "dark" : "light");
        }}
      />
      <MoonIcon active={dark} />
    </span>
  );
}
