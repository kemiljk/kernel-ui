import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode, RefCallback } from "react";

/**
 * Which ends of an optical pill hold an icon, as the `data-icon-start` /
 * `data-icon-end` attributes the pill's CSS reads.
 *
 * The optical pill technique (see `Badge.module.css`) pulls an icon at an
 * edge in until it is concentric with the round end cap. That needs to know
 * whether the edge holds an icon or text, and CSS can't tell: `:first-child`
 * ignores text nodes, so icon-then-text, text-then-icon and a lone icon all
 * look identical to a selector.
 *
 * Two passes, because neither alone is right:
 *
 * 1. At render (`pillIconAttrs`), only what is *certainly* an icon: an
 *    `svg`, `img` or `picture` element, or anything with a `data-icon` prop.
 *    This is what server rendering sees, and it never guesses.
 * 2. After render (`usePillIconRef`), the real DOM decides, exactly as the
 *    elements package does. An icon component (Lucide, Phosphor…) renders an
 *    `svg` element and is picked up; a component that renders text (`<Trans>`, an
 *    Astro slot, any wrapper) is not.
 *
 * An earlier version treated every component element as an icon at render.
 * That turned translated labels and Astro-rendered children into "icons",
 * and Button then hid them with aria-hidden. Never infer icon-ness from a
 * component type.
 */
export function pillIconAttrs(children: ReactNode): {
  "data-icon-start"?: "true";
  "data-icon-end"?: "true";
} {
  const nodes = Children.toArray(children).filter(
    (node) => !(typeof node === "string" && node.trim() === ""),
  );
  if (nodes.length === 0) return {};
  return {
    "data-icon-start": isCertainIcon(nodes[0]) ? "true" : undefined,
    "data-icon-end": isCertainIcon(nodes[nodes.length - 1]) ? "true" : undefined,
  };
}

const ICON_TAGS = new Set(["svg", "img", "picture"]);
const ICON_SELECTOR = "svg, img, picture, [data-icon]";

/** True only for an element that is an icon whatever it renders. */
export function isCertainIcon(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;
  const props = node.props as Record<string, unknown>;
  if (props["data-icon"] !== undefined) return props["data-icon"] !== false && props["data-icon"] !== "false";
  return typeof node.type === "string" && ICON_TAGS.has(node.type);
}

/** Sets data-icon-start/-end on a rendered pill from its actual DOM children. */
export function syncPillIcons(pill: HTMLElement) {
  const nodes = [...pill.childNodes].filter((node) =>
    node.nodeType === Node.ELEMENT_NODE
      ? true
      : node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
  );
  const isIcon = (node: Node | undefined) =>
    node instanceof Element && node.matches(ICON_SELECTOR) && node.getAttribute("data-icon") !== "false";
  const set = (name: string, on: boolean) => (on ? pill.setAttribute(name, "true") : pill.removeAttribute(name));
  set("data-icon-start", isIcon(nodes[0]));
  set("data-icon-end", isIcon(nodes[nodes.length - 1]));
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A ref for a pill element that re-checks its icons against the DOM after
 * every render, before paint, so component icons are found without a flash.
 */
export function usePillIconRef<T extends HTMLElement>(): RefCallback<T> {
  const node = useRef<T | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (node.current) syncPillIcons(node.current);
  });
  return useCallback((element: T | null) => {
    node.current = element;
    if (element) syncPillIcons(element);
  }, []);
}
