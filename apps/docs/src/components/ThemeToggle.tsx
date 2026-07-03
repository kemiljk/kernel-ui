import { useEffect, useState } from "react";
import { Switch } from "@kernelui-lib/react";
import { THEME_CHANGE_EVENT, applyColorScheme, getStoredColorScheme } from "../lib/theme";
import { MoonIcon as MoonGlyph, SunIcon as SunGlyph } from "./icons";

function SunIcon({ active }: { active: boolean }) {
  return (
    <SunGlyph
      width="14"
      height="14"
      className="theme-toggle-icon"
      data-active={active || undefined}
    />
  );
}

function MoonIcon({ active }: { active: boolean }) {
  return (
    <MoonGlyph
      width="14"
      height="14"
      className="theme-toggle-icon"
      data-active={active || undefined}
    />
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
