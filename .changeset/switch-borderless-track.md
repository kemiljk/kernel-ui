---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Switch's off track is now a solid fill with no dark outline. New `--kernel-color-track` and `--kernel-color-track-hover` tokens set its colour; hover darkens the fill instead of the border. The border stays transparent, so the size is unchanged and Windows High Contrast still draws an outline.
