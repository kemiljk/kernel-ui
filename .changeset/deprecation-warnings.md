---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Deprecated props now warn in development. Using one logs a single `console.warn` per page load, prefixed `[Kernel UI]` and naming the replacement; production builds stay silent.

- **React**: the check is gated on `process.env.NODE_ENV !== "production"`, which your bundler replaces, so a production build drops the warning code entirely. `Dialog`'s deprecated `className` is the first to warn; move it to `classNames.root`.
- **Custom Elements**: warnings show when `globalThis.KERNEL_DEV` is `true`, or when your bundler sets `process.env.NODE_ENV` to anything but `"production"`. An unbundled page with neither set stays silent; set `globalThis.KERNEL_DEV = true` before loading the package to see warnings there, or `false` to silence them anywhere. No Custom Element attribute is deprecated yet.
