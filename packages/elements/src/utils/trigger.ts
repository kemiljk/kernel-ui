/**
 * Resolves the real, natively-interactive element (`<button>`, `<a>`,
 * `<input>`) a `slot="trigger"` child actually is or contains — needed
 * because the trigger is very often a `<kernel-button>`, whose real
 * `<button>` lives one level down as its own light-DOM child, not the
 * custom element tag itself. Attributes like `popovertarget` or
 * `interestfor` only do anything on the genuine native element.
 */
export function findTriggerElement(host: Element): HTMLElement {
  if (host.matches("button, a, input")) return host as HTMLElement;
  const descendant = host.querySelector("button, a, input");
  return (descendant as HTMLElement | null) ?? (host as HTMLElement);
}
