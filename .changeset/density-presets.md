---
"@kernelui-lib/styles": minor
---

Density presets: `data-kernel-density="compact" | "comfortable"` on any element.

- **compact** is a 3px space unit (was 4px): every gap, padding and control height drops by a quarter, and font sizes don't change. Small controls stay at 24px, the WCAG 2.2 minimum target size, which is why 3px is the floor.
- **comfortable** is the default and today's spacing, so nothing changes unless you set the attribute. Use it to put the default back inside a compact scope.
- **Works on a subtree, not just `:root`.** Tokens built from `--kernel-space-unit` with `calc()` resolve where they're declared, so the attribute re-declares the whole derived set (`--kernel-space-*`, control heights, `--kernel-control-inset`, `--kernel-radius-control-inner`, container and sheet padding, their `-curve` pairs and the container and sheet radii). Any value of the attribute does this, so `<section data-kernel-density="custom" style="--kernel-space-unit: 0.3rem">` works too.
- If you pin a derived token yourself on `:root` (for example `--kernel-radius-container: 0`), pin it on `:root, [data-kernel-density]` so it holds inside density scopes.
