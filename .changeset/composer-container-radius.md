---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

`Composer` moves to `--kernel-radius-container` with its paired curve padding.
It reads as an input, but it *holds* controls — a send button, action slots — and
a box that holds pill controls has to be concentric with them or they read as
bulging out of its corners. At `--kernel-radius-md` the composer's own curvature
was close enough to the send button's that the two corners fought at Round. The
container tier is only usable here because the curve padding comes with it:
that's what stops a modest two-line box reading as a stadium pill, which is what
went wrong the first time this tier was tried.
