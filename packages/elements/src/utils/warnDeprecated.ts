/**
 * Development-only deprecation warnings, as promised by the deprecation
 * policy: one `console.warn` per component + message per page load, naming
 * the replacement, and nothing in production.
 *
 * Custom Elements are often loaded with no bundler at all (a `<script
 * type="module">` from a CDN), so "development" can't rely on a build step
 * alone. It's decided in this order:
 *
 * 1. `globalThis.KERNEL_DEV`, when it's a boolean. Set it before the package
 *    loads to force warnings on (`true`, e.g. an unbundled prototype) or off
 *    (`false`, e.g. a noisy test run).
 * 2. `process.env.NODE_ENV !== "production"`, which bundlers (Vite, webpack,
 *    esbuild, Rollup with a replace plugin) substitute at build time. The
 *    package's own build leaves it in place, since Vite's library mode only
 *    replaces `import.meta.env`, which is why this reads `process.env` and not
 *    `import.meta.env.DEV`: that would be baked to `false` when the package
 *    itself is built.
 * 3. Otherwise silent: an unbundled page with no `KERNEL_DEV` is treated as
 *    production, so a CDN-served site never logs.
 *
 * Call it wherever the deprecated attribute or property is read:
 *
 *   if (this.hasAttribute("old-name")) {
 *     warnDeprecated("kernel-dialog", "`old-name` is deprecated. Use `new-name` instead.");
 *   }
 */

declare const process: { readonly env: { readonly NODE_ENV?: string } } | undefined;

const warned = new Set<string>();

export function isKernelDev(): boolean {
  const flag = (globalThis as { KERNEL_DEV?: unknown }).KERNEL_DEV;
  if (typeof flag === "boolean") return flag;
  try {
    return process!.env.NODE_ENV !== "production";
  } catch {
    // `process` isn't defined: no bundler replaced it.
    return false;
  }
}

export function warnDeprecated(component: string, message: string): void {
  if (!isKernelDev()) return;
  const key = `${component}\u0000${message}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[Kernel UI] ${component}: ${message}`);
}

/** Test hook: forget which warnings have fired. Not exported from the package. */
export function resetDeprecationWarnings(): void {
  warned.clear();
}
