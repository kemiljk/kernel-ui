---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Motion pass, following Emil Kowalski's animation principles.

- **Reduced motion now works as intended.** The reset no longer forces every transition to near zero: in a layer with `!important`, that override defeated every component's gentler reduced-motion variant. Busy spinners and indeterminate progress, marked `data-kernel-motion="essential"`, now slow down instead of freezing.
- **New tokens:** `--kernel-scale-enter-lg`, `--kernel-scale-recede`, `--kernel-ease-drawer`, `--kernel-duration-sheet`, `--kernel-ease-loop`, `--kernel-duration-spin`, `--kernel-duration-pulse` and `--kernel-duration-shimmer`. `--kernel-ease-in-out` is now the stronger `cubic-bezier(0.77, 0, 0.175, 1)`.
- **Tooltip:** opens after 400ms by default (was 0). Once one tooltip has shown, its neighbours open instantly with no enter transition.
- **Dialog:** enters from 0.98 and exits to 0.99. Side panels and Sheet travel on the iOS drawer curve. Fixed a duplicated `translate` transition.
- **Toast:** exits faster than it enters, dropping back toward its edge, and its stack scales use tokens.
- **ContextMenu:** pops open from the cursor with a short fade and overshoot. The elements ContextMenu and Combobox now play their exit animation before closing, matching React.
- **Disclosures** (Accordion, Reasoning, ToolCall, FileDiff…): the height now uses the in-out curve, and the content fades with it, including when you reverse mid-way.
- **Select:** the customizable picker fades and scales in.
- **Loops:** every loading loop uses the shared tokens.
- **Other fixes:**
  - The Checkbox draw is quicker.
  - The FileUpload drop wash blooms with a `clip-path` from the pointer, replacing an inherited scale from 0.001.
  - The Message entrance uses the translate token.
  - CodeBlock copy, Toast close and the MessageScroller jump button have press feedback.
  - CodeBlock's copy hover is gated to devices that hover.
  - Carousel's smooth scrolling respects reduced motion.
