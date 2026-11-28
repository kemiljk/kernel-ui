---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Optical pills for Badge, TagInput tags and Suggestion items.

- Icons go straight in as children, before or after the text or on their own, from any icon set. An icon at either end becomes a `1lh` slot, concentric with the rounded end.
- Inline padding grows by the width the rounded ends cut away.
- The radius stops at a true half-height pill, so a wrapped Suggestion keeps its one-line end caps instead of turning into a stadium.
- Capitals are centred by cap height, so fonts with lopsided ascent and descent metrics no longer sit low.
- New tokens: `--kernel-icon-size`, `--kernel-icon-stroke-width` and `--kernel-pill-cut`.
- `<kernel-badge>` now follows `--kernel-radius-control` like React's `Badge` (it was always a pill).
- `<kernel-tag-input>` tags now share Badge's styles, matching React.
- Suggestion items are now 40px tall on one line, the md control height, down from about 43px.
