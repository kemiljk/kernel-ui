---
"@kernelui-lib/styles": patch
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Add the `--kernel-ease-fade` token (linear) for in-place opacity and blur crossfades, and use it wherever component transitions hard-coded `linear`, so the curve can be retuned in one place. Fix right-to-left layouts: Dialog and inset Sheet side panels now slide in and out from their own edge, and Table's overflow fade and edge shadow sit on the correct side.
