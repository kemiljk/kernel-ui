---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Give every inline SVG icon intrinsic `width`/`height` attributes matching its styled size. Without component CSS, an SVG with only a `viewBox` renders at the browser default of 300×150, so a Select or Accordion chevron could push the whole form off-screen. Styled rendering is unchanged.
