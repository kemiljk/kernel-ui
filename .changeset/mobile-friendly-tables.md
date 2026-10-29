---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Tables are mobile-friendly. `Table` (and `<kernel-table>`) now renders its `<table>` inside a horizontal scroll container, so a wide table scrolls in place instead of widening the page on a phone; `className` still targets the table and the new `wrapperClassName` targets the container. An edge fade and inset shadow show which side still has content to scroll to, driven by a CSS scroll-driven animation. DataTable gets the same scroll container, its pagination wraps (centred) when the page links don't fit on one line, and the filter field gains a real placeholder: `filterPlaceholder` (`filter-placeholder`) now sets it, with a new `filterLabel` (`filter-label`) for the visible label, which falls back to `filterPlaceholder` as before. Pagination's page list wraps instead of overflowing.
