---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Menus now open the way the WAI-ARIA menu button pattern describes. Opening DropdownMenu (popover, disclosure and morph) with a pointer focuses the menu with no item highlighted. Opening it with Enter, Space or ArrowDown focuses the first item, and ArrowUp on the trigger opens it on the last. The highlight follows the pointer, so only one row is highlighted at a time, and focus rings show only for keyboard use. ContextMenu opens on right-click with nothing highlighted, and arrow keys, Home and End now move between its items.
