---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Optical Button, plus icon slots for `<kernel-button>`.

- Button's radius stops at half the control height, so it's a true pill at Round, and its inline padding grows by the width the corners cut away.
- Capitals are centred by cap height, so fonts with lopsided metrics don't sit low.
- Icons sit in a slot concentric with the corner, drawn at `--kernel-icon-size` and spaced from the label by the same distance as from the edge.
- Icon-only buttons are now square at every size, or a circle at Round. They used to be wider than tall.
- A lone `<svg>` or `<img>` passed as `children` is treated as icon-only. A component child is always treated as the label; pass icon components through `iconStart`/`iconEnd`.
- `<kernel-button>` now supports icons: an `svg`, `img` or `data-icon` child placed first or last moves into an icon slot, matching React's `iconStart` and `iconEnd`. It also forwards `aria-label` to the real `<button>`.
- The Dialog close button is now an icon-only Button in both packages.
