import { Children, isValidElement } from "react";
import type { ReactNode } from "react";

/**
 * Which ends of an optical pill hold an icon, as the `data-icon-start` /
 * `data-icon-end` attributes the pill's CSS reads.
 *
 * The optical pill technique (see `Badge.module.css`) pulls an icon at an
 * edge in until it is concentric with the round end cap. That needs to
 * know whether the edge holds an icon or text, and CSS can't tell: `:first-child`
 * ignores text nodes, so icon-then-text, text-then-icon and a lone icon
 * all look identical to a selector. Reading `children` here costs nothing
 * and doesn't add wrapper elements to the DOM.
 *
 * Counts as an icon: an `svg`, `img` or `picture` element, any element with
 * a `data-icon` prop (how TagInput marks its remove button), and any
 * component element, since icon libraries ship icons as components. A
 * host element such as `<span>` counts as text. To keep a component that
 * renders text from being treated as an icon, wrap it in a `<span>`.
 * Both attributes on one pill means icon-only or an icon at each end.
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
    "data-icon-start": isIcon(nodes[0]) ? "true" : undefined,
    "data-icon-end": isIcon(nodes[nodes.length - 1]) ? "true" : undefined,
  };
}

const ICON_TAGS = new Set(["svg", "img", "picture"]);

function isIcon(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;
  const props = node.props as Record<string, unknown>;
  if (props["data-icon"] !== undefined && props["data-icon"] !== false) return true;
  if (typeof node.type === "string") return ICON_TAGS.has(node.type);
  return true;
}
