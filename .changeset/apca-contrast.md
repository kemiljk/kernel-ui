---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Contrast fixes, measured with APCA (the method proposed for WCAG 3) with WCAG 2 as a floor.

- **Focus ring:** `--kernel-color-focus-ring` is now accent-11. Accent-9 failed in light mode for the amber preset (1.95:1), and every preset scored about Lc 30 in dark mode.
- **New `--kernel-color-border-control` token:** gray-9 in light, gray-11 in dark, for controls whose border is their only outline. Checkbox, Radio and the Switch track now use it, where they used to measure 1.66:1 in light mode.
- **Muted text:** gray-11 is lighter in dark mode (78%, up from 72%), so muted text clears Lc 60.
- **Checkbox at Round:** its radius is capped, so it no longer turns into a circle that looks like a radio button.
- **Switch in RTL:** the thumb now slides the correct way.
