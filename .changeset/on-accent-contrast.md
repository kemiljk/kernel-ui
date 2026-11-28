---
"@kernelui-lib/styles": patch
---

Text on solid fills now meets APCA Lc 60 and WCAG 4.5:1 in every accent preset, light and dark. That covers the primary button label on its fill, hover and pressed states, the danger, success and warning fills, and the tinted text in Badge.

- Dark mode accent, danger and success fills are darker (step 9 at L49–53%, hover at L53–57%) and carry a white label. The old L58–66% fills sat in the range where neither a white nor a black label is readable.
- The teal and green presets use a white label in dark mode, and a slightly darker fill in light mode.
- The amber fill is lighter in both schemes (L79%, with a lighter L83% hover and an L77% pressed state), so its near-black label stays readable.
- The warning fill is lighter (L79%) in both schemes for its near-black label.
- The dark mode text step (step 11) moves from L74–78% to L80–81%, so Badge text clears Lc 60 on its subtle fill.
