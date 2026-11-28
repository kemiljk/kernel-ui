---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Cross-browser fixes found by running the browser checks in WebKit and under RTL.

- **Focus returns to the opener in Safari.** WebKit never focuses a button when it's clicked or tapped, so a Dialog, Sheet, CommandPalette, ArtifactPanel overlay, DropdownMenu or Popover opened by a click restored focus to `<body>` on Escape or close, and the next Tab started from the top of the page. They now remember the control the pointer pressed and send focus back to it when focus would otherwise be lost. Focus the user already moved elsewhere is left alone, and Chromium and Firefox, which restore it natively, are unchanged. An outside press on a menu or popover still doesn't pull focus back.
- **Side sheets drag the right way under RTL.** `side="left"` and `side="right"` are logical, so in a right-to-left page a `left` sheet sits on the right-hand edge, but the drag engine read them as physical. Dragging such a sheet toward its own edge didn't dismiss it. The engine now flips the axis using the sheet's computed `direction`.
- **HoverCard: Escape stays dismissed.** A card that appears or animates under a pointer that hasn't moved gets boundary events the user never made. Firefox delivers them a frame or more late, so a `pointerenter` could land during the Escape exit and bring the card straight back. Hover is now ignored after Escape until the pointer actually leaves the trigger or card, or the trigger is focused again.
