---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

CommandPalette highlights the first match when it opens and whenever the query changes, so typing and pressing Enter runs the top result.

- **React**: opening the palette cleared the highlight and relied on the results changing to set it again. With memoised `items` or `groups`, nothing changed on open, so no option was highlighted and Enter did nothing until the user typed or pressed an arrow key. A query change also kept a previously highlighted option that still matched instead of moving to the top result. Other changes to the results, such as async items being replaced, still keep the highlighted option while it's selectable.
- **Elements**: new `items` or `groups` set while the palette is open no longer leave the highlight past the end of a shorter list; it falls back to the first match.
