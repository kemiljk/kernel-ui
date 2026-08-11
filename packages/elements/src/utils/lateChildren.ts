/**
 * Keeps children written into a custom element *after* connect flowing into
 * the real element it owns.
 *
 * Kernel's elements adopt their light-DOM children once, in
 * `connectedCallback`, which is right for static content and wrong for
 * anything that grows: appending a message to `<kernel-message-list>` would
 * otherwise land it outside the `<ol>` it belongs to — rendered, but no
 * longer part of the list. A `MutationObserver` on the host is the only
 * hook the platform gives us for "a child arrived later" without a shadow
 * root and real `<slot>`s (which Kernel deliberately doesn't use, so one
 * token cascade can reach every component).
 */
export function adoptLateChildren(
  host: HTMLElement,
  target: () => Node | null,
  isOwn: (node: Node) => boolean,
): MutationObserver {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (isOwn(node)) continue;
        target()?.appendChild(node);
      }
    }
  });
  observer.observe(host, { childList: true });
  return observer;
}
