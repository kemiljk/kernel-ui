---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Surface-aware fills. New `--kernel-color-fill-subtle`, `--kernel-color-fill` and `--kernel-color-fill-strong` tokens back every well, track and hover background (Tabs, inset and default Slider, Progress, Skeleton, Toggle, Pagination, date pickers, Table row hover, Avatar, Badge, Carousel, Toast). Card re-sets them one grey step up and raised containers (Dialog, Sheet, Popover, HoverCard, DropdownMenu, ContextMenu, NavigationMenu, Toast, CommandPalette, Combobox and Select popups) two, so a Tabs track or Slider keeps its contrast instead of disappearing into a raised surface of the same grey.

ScrollArea's `edgeShadow` is now driven by a CSS scroll-driven animation (same 48px ramp); its scroll listener only runs as a fallback in browsers without scroll timelines.
