/**
 * Development-only deprecation warnings, as promised by the deprecation
 * policy: one `console.warn` per component + message per page load, naming
 * the replacement, and nothing at all in production.
 *
 * Gate every call site on `process.env.NODE_ENV !== "production"` as well:
 *
 *   if (process.env.NODE_ENV !== "production" && className !== undefined) {
 *     warnDeprecated("Dialog", "`className` is deprecated. Use `classNames.root` instead.");
 *   }
 *
 * The library build leaves `process.env.NODE_ENV` untouched (Vite's library
 * mode doesn't replace `process.env`), so the consumer's bundler sees it, the
 * same way it sees React's own checks. A production build replaces it with
 * `"production"`, which makes the call site dead code; with no call left,
 * this module is tree-shaken out too. The guard inside the function is a
 * second line for a call site that forgot it.
 */

const warned = new Set<string>();

function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    // No bundler defined `process` (an unbundled ESM import). React itself
    // reads the same variable, so this only happens outside a normal setup;
    // stay silent rather than throw.
    return false;
  }
}

export function warnDeprecated(component: string, message: string): void {
  if (!isDevelopment()) return;
  const key = `${component}\u0000${message}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[Kernel UI] ${component}: ${message}`);
}

/** Test hook: forget which warnings have fired. Not exported from the package. */
export function resetDeprecationWarnings(): void {
  warned.clear();
}
