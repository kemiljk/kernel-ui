---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Breadcrumb links now meet the WCAG 2.2 AA minimum target size.

The link had no block padding, so its hit area was exactly its 21px line
box at `--kernel-font-size-sm` — under the 24px floor in SC 2.5.8. Since
breadcrumbs are a nav list rather than links inside a sentence, the
inline-target exception doesn't apply.

The item now guarantees a 24px minimum height and the link stretches into
it, instead of the link growing itself with padding: the `/` separators
are siblings in the same centred flex row, so padding on the link alone
would have pushed them off the text's centre line, and it would have
changed breadcrumb density for every consumer. Text position is
unchanged; the row is 3px taller and the focus ring wraps a correctly
sized box.
