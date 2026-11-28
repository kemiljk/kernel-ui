import { Fragment, forwardRef, useSyncExternalStore } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Kbd.module.css";

export type KbdPlatform = "auto" | "apple" | "other";

export interface KbdState {
  /** True when the element renders a multi-key combination from `keys`. */
  combo: boolean;
  /** The platform the key names were resolved for. */
  platform: "apple" | "other";
}

export interface KbdProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  /** A key combination, one entry per key, e.g. `["mod", "K"]`. Each key
   * renders as its own nested `<kbd>`. The lowercase aliases `mod`, `alt`,
   * `shift` and `ctrl` are resolved per platform (`mod` is ⌘ on Apple
   * platforms and Ctrl elsewhere); anything else renders as written. When
   * omitted, `children` render as a single key. */
  keys?: string[];
  /** Text between keys in a combination. It's real text, so a screen reader
   * reads "Command plus K" rather than two unrelated keys. Defaults to `+`. */
  separator?: ReactNode;
  /** Which platform's key names to use for the aliases. `auto` (default)
   * reads it from the browser after hydration; server rendering and the
   * first client render use the non-Apple names so the markup matches. */
  platform?: KbdPlatform;
  className?: ClassNameValue<KbdState>;
}

const APPLE_ALIASES: Record<string, string> = { mod: "⌘", alt: "⌥", shift: "⇧", ctrl: "⌃" };
const OTHER_ALIASES: Record<string, string> = { mod: "Ctrl", alt: "Alt", shift: "Shift", ctrl: "Ctrl" };

/** Spoken names for the symbol keys. Screen readers announce these glyphs
 * inconsistently (or not at all), so each one renders as an `aria-hidden`
 * glyph followed by its name in visually hidden text. */
const SPOKEN: Record<string, string> = {
  "⌘": "Command",
  "⌥": "Option",
  "⇧": "Shift",
  "⌃": "Control",
  "↵": "Enter",
  "⏎": "Return",
  "⌫": "Backspace",
  "⌦": "Delete",
  "⎋": "Escape",
  "⇥": "Tab",
  "␣": "Space",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "←": "Left arrow",
  "→": "Right arrow",
};

function detectApple(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const noopSubscribe = () => () => {};

/** Resolves a key alias (`mod`, `alt`, `shift`, `ctrl`) for a platform. */
export function resolveKbdKey(key: string, platform: "apple" | "other"): string {
  const aliases = platform === "apple" ? APPLE_ALIASES : OTHER_ALIASES;
  return aliases[key] ?? key;
}

function KeyLabel({ label }: { label: string }) {
  const spoken = SPOKEN[label];
  if (!spoken) return <>{label}</>;
  return (
    <>
      <span aria-hidden="true">{label}</span>
      <span className="kernel-sr-only">{spoken}</span>
    </>
  );
}

/**
 * A keyboard key or shortcut, on the real `<kbd>` element, the one HTML
 * element that means "user input from a keyboard". A combination follows
 * the HTML spec's own pattern: an outer `<kbd>` holding one nested `<kbd>`
 * per key, with the separator as real text between them, so the shortcut
 * reads as one unit ("Command plus K") instead of a row of unrelated
 * glyphs.
 *
 * Modifier symbols (⌘ ⌥ ⇧ ⌃, arrows, Enter) get a visually hidden spoken
 * name, because screen readers announce those glyphs inconsistently. The
 * `mod` alias renders ⌘ on Apple platforms and Ctrl elsewhere, as text
 * rather than icons, so it inherits the font and scales with it.
 *
 * Each key is sized like `Badge`: the same height, a radius that follows
 * `--kernel-radius-control` but stops at a true half-height pill, and
 * inline padding that grows by the width the rounded corners cut away.
 * Tabular figures keep a row of shortcuts aligned.
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  { keys, separator = "+", platform = "auto", className, children, ...rest },
  ref,
) {
  const detected = useSyncExternalStore(noopSubscribe, detectApple, () => false);
  const resolvedPlatform: "apple" | "other" =
    platform === "auto" ? (detected ? "apple" : "other") : platform;
  const combo = Array.isArray(keys) && keys.length > 0;
  const state: KbdState = { combo, platform: resolvedPlatform };

  return (
    <kbd
      {...rest}
      ref={ref}
      data-slot="kbd"
      data-combo={dataAttr(combo)}
      data-platform={resolvedPlatform}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      {combo
        ? keys.map((key, index) => (
            <Fragment key={`${key}-${index}`}>
              {index > 0 ? <span className={styles.separator}>{separator}</span> : null}
              <kbd className={styles.key} data-slot="kbd-key">
                <KeyLabel label={resolveKbdKey(key, resolvedPlatform)} />
              </kbd>
            </Fragment>
          ))
        : typeof children === "string"
          ? <KeyLabel label={children} />
          : children}
    </kbd>
  );
});
