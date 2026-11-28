---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Optical-pill rollout to fields and the remaining pill-shaped controls, plus focus and danger tokens.

- **Fields at Round:** TextField (and so DataTable's filter), Select, Combobox, NumberField, TagInput's field and ColorPicker's hex field add the optical-pill label edge to their text inset, so text no longer jams into a pill's end cap. Their label, description and error move by the same amount and keep lining up with the text. At the default radius this is about 0.7px; at Sharp it is 0.
- **TagInput:** one row is now exactly the control height (40px, was 46.8px), and its corners stop at the one-row radius when the field wraps.
- **NumberField:** the stacked up/down chevrons are now inline − and + buttons. Each is at least 24×24 (30×30 at md), sits concentric with the field's corner and nests inside the end cap at Round. The buttons are in the order − then +.
- **Toggle and NavigationMenu** use Button's optical-pill recipe: label-edge padding, cap-height centring, and concentric icon slots. Toggle detects icon children like Badge and Button do, so an icon-only toggle stays square, or a circle at Round. Toggle now sets its font size per `size`, matching Button.
- **Heights snapped to the control scale:** Suggestion 40px (was 40.6px), NavigationMenu items 40px (was 37.3px), CodeBlock's copy button 32px (was 31.3px).
- **New tokens:** `--kernel-focus-offset` (2px), `--kernel-focus-offset-inset` (−2px) and `--kernel-focus-offset-tight` (1px) replace hard-coded `outline-offset` values, and `--kernel-color-danger-hover` (danger step 10, light/dark aware) replaces Button's `color-mix(… black)` danger hover.
- **Slider:** the track thickness is a component-local `--track-size`, and the range inputs set `user-select: none`, as does ColorPicker's colour input.
