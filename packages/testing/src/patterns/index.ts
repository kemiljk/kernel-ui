import type { PatternName } from "../types.js";
import type { PatternCheck } from "./common.js";
import { combobox, grid, listbox, menu, radioGroup, tabs, toolbar } from "./composite.js";
import { accordion, dialog, disclosure, hoverCard, tooltip } from "./overlay.js";
import { button, checkbox, field, select, slider, switchPattern, toggleButton } from "./widgets.js";

export const PATTERNS: Record<PatternName, PatternCheck> = {
  accordion,
  button,
  checkbox,
  combobox,
  dialog,
  disclosure,
  field,
  grid,
  "hover-card": hoverCard,
  listbox,
  menu,
  "radio-group": radioGroup,
  select,
  slider,
  switch: switchPattern,
  tabs,
  "toggle-button": toggleButton,
  toolbar,
  tooltip,
};

/** Every pattern name `checkPattern` accepts. */
export const patternNames = Object.keys(PATTERNS) as PatternName[];

export { checkCommon } from "./common.js";
