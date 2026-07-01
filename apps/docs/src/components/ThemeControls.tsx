import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@kernelui/react";
import {
  ACCENTS,
  RADII,
  THEME_CHANGE_EVENT,
  applyAccent,
  applyRadius,
  getStoredAccent,
  getStoredRadiusName,
} from "../lib/theme";

/**
 * The accent + radius controls, shared by ThemePlayground's homepage
 * demo, ThemeMenu's header popover, and MobileHeaderNav's panel — one
 * implementation instead of three copies to keep in sync. All three
 * read/write through src/lib/theme.ts, so a change made in any one is
 * reflected in the others immediately via THEME_CHANGE_EVENT.
 */
export default function ThemeControls() {
  const [accent, setAccent] = useState<(typeof ACCENTS)[number]>("amber");
  const [activeRadius, setActiveRadius] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      setAccent(getStoredAccent() ?? "amber");
      setActiveRadius(getStoredRadiusName());
    }
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  return (
    <>
      <div>
        <p className="playground-label">Accent theme</p>
        <div className="playground-row">
          {ACCENTS.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={accent === name ? "primary" : "secondary"}
              aria-pressed={accent === name}
              onClick={() => {
                setAccent(name);
                applyAccent(name);
              }}
            >
              {name[0]?.toUpperCase()}
              {name.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="playground-label">Base radius</p>
        <div className="playground-row">
          {RADII.map((radius) => (
            <Button
              key={radius.name}
              size="sm"
              variant={activeRadius === radius.name ? "primary" : "secondary"}
              aria-pressed={activeRadius === radius.name}
              // Each swatch shows its OWN preset radius, not the
              // currently-applied one — otherwise all three collapse
              // to whatever's active and there's nothing left to
              // compare.
              style={{ "--kernel-radius-control": radius.value } as CSSProperties}
              onClick={() => {
                setActiveRadius(radius.name);
                applyRadius(radius.value);
              }}
            >
              {radius.name}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
