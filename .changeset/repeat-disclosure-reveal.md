---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Move disclosure-menu reveal motion onto the native `::details-content` box so entry and exit animate on every toggle, including repeated touch interactions in Chromium and WebKit.
