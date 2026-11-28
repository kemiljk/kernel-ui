/**
 * Mirrors `@kernelui-lib/react`'s `pillIconAttrs`: sets `data-icon-start` /
 * `data-icon-end` on an optical pill when its first or last meaningful
 * child is an icon. CSS can't make this call itself because `:first-child`
 * ignores text nodes (see the React helper for the full reasoning).
 *
 * An icon is an `svg`, `img` or `picture` element, or any element with a
 * `data-icon` attribute (use that for a custom-element icon). Text nodes
 * and every other element count as text. Re-runs whenever the pill's
 * content changes, so frameworks that patch children later stay correct.
 */
const ICON_SELECTOR = "svg, img, picture, [data-icon]";

export function syncPillIcons(pill: HTMLElement) {
  const nodes = [...pill.childNodes].filter((node) =>
    node.nodeType === Node.ELEMENT_NODE
      ? true
      : node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
  );
  const isIcon = (node: Node | undefined) =>
    node instanceof Element && node.matches(ICON_SELECTOR) && node.getAttribute("data-icon") !== "false";
  toggle(pill, "data-icon-start", isIcon(nodes[0]));
  toggle(pill, "data-icon-end", isIcon(nodes[nodes.length - 1]));
}

/** Runs `syncPillIcons` now and after every content change. */
export function observePillIcons(pill: HTMLElement): MutationObserver {
  syncPillIcons(pill);
  const observer = new MutationObserver(() => syncPillIcons(pill));
  observer.observe(pill, { childList: true, characterData: true, subtree: true });
  return observer;
}

function toggle(element: HTMLElement, name: string, on: boolean) {
  if (on) element.setAttribute(name, "true");
  else element.removeAttribute(name);
}
