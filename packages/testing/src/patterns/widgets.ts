import { accessibleName, isDisabled, isFocusable, labelsFor, roleOf, within } from "../dom.js";
import type { Run } from "../run.js";
import { checkRefs, noInstances, requireName } from "./common.js";

/* ------------------------------------------------------------------ */
/* button — every button and link is named; icons inside are decorative */
/* ------------------------------------------------------------------ */

export async function button(run: Run, root: Element) {
  // Hidden ones too: a button in a closed dialog or menu still needs a name,
  // and accessibleName() computes it from the button's own subtree.
  const buttons = within(root, "button, summary, [role=button], a[href], input[type=button], input[type=submit], input[type=reset], input[type=image]");
  if (!buttons.length) return noInstances(run, "button", "button or link", root);
  for (const el of buttons) {
    const name = requireName(run, "button/name", el, `This ${roleOf(el)}`);
    checkRefs(run, "button", el);
    if (el.getAttribute("role") === "button" && el.tagName !== "BUTTON") {
      run.warn("button/native", `Use a real <button> instead of role="button" on a <${el.tagName.toLowerCase()}>: it brings focus, Enter and Space for free.`, el);
      run.expect(isFocusable(el), "button/focusable", `role="button" without tabindex="0" can't be reached with the keyboard.`, el);
    }
    // An icon-only control: the svg must be decorative, the name must come from elsewhere.
    for (const svg of Array.from(el.querySelectorAll("svg"))) {
      const decorative = svg.getAttribute("aria-hidden") === "true" || svg.closest("[aria-hidden=true]") !== null;
      const labelled = svg.hasAttribute("aria-label") || svg.querySelector(":scope > title") !== null || svg.hasAttribute("aria-labelledby");
      run.expect(
        decorative || labelled,
        "button/decorative-icon",
        `An icon inside "${name || el.tagName.toLowerCase()}" isn't aria-hidden="true", so screen readers may announce it as an unlabelled image.`,
        svg,
        "warning",
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* switch — APG switch: role=switch on a button, or <input switch>     */
/* ------------------------------------------------------------------ */

export async function switchPattern(run: Run, root: Element) {
  const switches = within(root, "[role=switch], input[type=checkbox][switch]");
  if (!switches.length) return noInstances(run, "switch", `role="switch" element`, root);
  for (const el of switches) {
    requireName(run, "switch/name", el, "The switch");
    checkRefs(run, "switch", el);
    const native = el.tagName === "BUTTON" || el.tagName === "INPUT";
    run.expect(native, "switch/native", `role="switch" belongs on a <button> (or <input type="checkbox" switch>) so Space, Enter and focus come from the browser.`, el, "warning");
    const isInput = el.tagName === "INPUT";
    const read = () => (isInput ? String((el as HTMLInputElement).checked) : el.getAttribute("aria-checked"));
    const before = read();
    if (!isInput) {
      run.expect(before === "true" || before === "false", "switch/aria-checked", `A switch needs aria-checked="true" or "false" (found ${before === null ? "none" : `"${before}"`}).`, el);
    }
    if (!native) run.expect(isFocusable(el), "switch/focusable", "The switch isn't focusable; add tabindex=\"0\" or use a <button>.", el);

    if (isDisabled(el) || !run.canInteract("switch/toggles")) continue;
    await run.click(el);
    const after = read();
    if (run.expect(after !== before, "switch/toggles", `Clicking the switch didn't change its state (still ${after}).`, el)) {
      await run.click(el); // restore
    }
    if (el.tagName === "BUTTON") {
      run.skip("switch/keyboard", "native", "Space and Enter activate a <button> natively; synthetic key events can't trigger that, and the switch is a real button.", el);
    } else if (!isInput) {
      const start = read();
      await run.focus(el);
      await run.press(" ", el);
      run.expect(read() !== start, "switch/keyboard", "Space didn't toggle the switch.", el);
      if (read() !== start) await run.press(" ", el);
    }
  }
}

/* ------------------------------------------------------------------ */
/* checkbox                                                             */
/* ------------------------------------------------------------------ */

export async function checkbox(run: Run, root: Element) {
  const boxes = within(root, "input[type=checkbox]:not([switch]), [role=checkbox]");
  if (!boxes.length) return noInstances(run, "checkbox", "checkbox", root);
  for (const el of boxes) {
    requireName(run, "checkbox/name", el, "The checkbox");
    checkRefs(run, "checkbox", el);
    const isInput = el.tagName === "INPUT";
    if (!isInput) {
      run.warn("checkbox/native", `Use <input type="checkbox"> instead of role="checkbox": checked, indeterminate, forms and Space come for free.`, el);
      const state = el.getAttribute("aria-checked");
      run.expect(state === "true" || state === "false" || state === "mixed", "checkbox/aria-checked", `role="checkbox" needs aria-checked="true", "false" or "mixed".`, el);
      run.expect(isFocusable(el), "checkbox/focusable", "The checkbox isn't focusable.", el);
    } else if (el.hasAttribute("aria-checked")) {
      run.warn("checkbox/no-aria-checked", "aria-checked on a native checkbox overrides its real state for assistive tech and drifts out of sync; remove it.", el);
    }
    if (isDisabled(el) || !run.canInteract("checkbox/toggles")) continue;
    const read = () => (isInput ? String((el as HTMLInputElement).checked) : el.getAttribute("aria-checked"));
    const before = read();
    await run.click(el);
    if (run.expect(read() !== before, "checkbox/toggles", "Clicking the checkbox didn't change its state.", el)) await run.click(el);
  }
}

/* ------------------------------------------------------------------ */
/* toggle-button — <button aria-pressed>                               */
/* ------------------------------------------------------------------ */

export async function toggleButton(run: Run, root: Element) {
  const toggles = within(root, "[aria-pressed]");
  if (!toggles.length) return noInstances(run, "toggle-button", "aria-pressed button", root);
  for (const el of toggles) {
    const name = requireName(run, "toggle-button/name", el, "The toggle button");
    checkRefs(run, "toggle-button", el);
    run.expect(roleOf(el) === "button", "toggle-button/role", `aria-pressed is only valid on a button (found role "${roleOf(el)}").`, el);
    run.expect(el.tagName === "BUTTON", "toggle-button/native", "Put aria-pressed on a real <button>.", el, "warning");
    const before = el.getAttribute("aria-pressed");
    run.expect(before === "true" || before === "false" || before === "mixed", "toggle-button/aria-pressed", `aria-pressed must be "true", "false" or "mixed" (found "${before}").`, el);
    if (/^(on|off)\b|\b(on|off)$/i.test(name)) {
      run.warn("toggle-button/stable-name", `"${name}" changes meaning with state; a toggle button's name should stay the same while aria-pressed changes.`, el);
    }
    if (isDisabled(el) || !run.canInteract("toggle-button/toggles")) continue;
    await run.click(el);
    const after = el.getAttribute("aria-pressed");
    if (run.expect(after !== before, "toggle-button/toggles", `Clicking didn't change aria-pressed (still "${after}").`, el)) await run.click(el);
    run.skip("toggle-button/keyboard", "native", "Space and Enter activate a <button> natively.", el);
  }
}

/* ------------------------------------------------------------------ */
/* field — labelled form controls                                      */
/* ------------------------------------------------------------------ */

const FIELD = "input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([type=image]), select, textarea, [role=textbox], [role=spinbutton], [role=searchbox]";

export async function field(run: Run, root: Element) {
  const fields = within(root, FIELD);
  if (!fields.length) return noInstances(run, "field", "form field", root);
  for (const el of fields) {
    checkRefs(run, "field", el);
    const name = accessibleName(el);
    const placeholder = el.getAttribute("placeholder")?.trim();
    const onlyPlaceholder = name.length > 0 && name === placeholder && !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby") && labelsFor(el).length === 0;
    if (!name) run.fail("field/name", "The field has no label. Use a <label> (visually hidden if it must be) — never drop it.", el);
    else if (onlyPlaceholder) run.fail("field/name", `The field is named only by its placeholder ("${placeholder}"), which disappears as soon as someone types. Add a <label>.`, el);
    else run.pass("field/name");

    if (el.getAttribute("aria-invalid") === "true") {
      run.expect(
        el.hasAttribute("aria-errormessage") || el.hasAttribute("aria-describedby"),
        "field/error-message",
        "The field is aria-invalid but nothing (aria-describedby or aria-errormessage) says what's wrong.",
        el,
        "warning",
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* select — native <select>                                            */
/* ------------------------------------------------------------------ */

export async function select(run: Run, root: Element) {
  const selects = within(root, "select");
  if (!selects.length) {
    if (within(root, "[role=combobox], [role=listbox]").length) {
      run.skip("select/native", "not-applicable", "No native <select> here; this is an ARIA combobox/listbox — use the combobox or listbox pattern.");
    }
    return noInstances(run, "select", "<select>", root);
  }
  for (const el of selects as HTMLSelectElement[]) {
    requireName(run, "select/name", el, "The select");
    checkRefs(run, "select", el);
    if (el.hasAttribute("role")) run.fail("select/no-role", `role="${el.getAttribute("role")}" on a <select> overrides its native semantics.`, el);
    const options = Array.from(el.options);
    run.expect(options.length > 0, "select/options", "The select has no options.", el);
    const unnamed = options.filter((option) => !(option.label || option.textContent || "").trim());
    run.expect(unnamed.length === 0, "select/option-text", `${unnamed.length} option(s) have no text.`, unnamed[0] ?? el);
    run.skip("select/keyboard", "native", "Arrow keys, type-ahead and Escape are the browser's own for a native <select>.", el);
  }
}

/* ------------------------------------------------------------------ */
/* slider — <input type=range> or role=slider                          */
/* ------------------------------------------------------------------ */

export async function slider(run: Run, root: Element) {
  const sliders = within(root, "input[type=range], [role=slider]");
  if (!sliders.length) return noInstances(run, "slider", "slider", root);
  for (const el of sliders) {
    requireName(run, "slider/name", el, "The slider");
    checkRefs(run, "slider", el);
    if (el.tagName === "INPUT") {
      const input = el as HTMLInputElement;
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value);
      run.expect(min < max, "slider/range", `min (${min}) must be below max (${max}).`, el);
      run.expect(value >= min && value <= max, "slider/value", `value ${value} is outside ${min}–${max}.`, el);
      if (el.hasAttribute("aria-valuenow")) run.warn("slider/no-aria-valuenow", "aria-valuenow on a native range input drifts out of sync with its real value; remove it (aria-valuetext is fine).", el);
      run.skip("slider/keyboard", "native", "Arrow keys, Page Up/Down, Home and End are the browser's own for <input type=range>.", el);
      continue;
    }
    const now = Number(el.getAttribute("aria-valuenow"));
    const min = Number(el.getAttribute("aria-valuemin") ?? 0);
    const max = Number(el.getAttribute("aria-valuemax") ?? 100);
    run.warn("slider/native", `Prefer <input type="range">: keyboard, forms and assistive tech support are native.`, el);
    run.expect(el.hasAttribute("aria-valuenow") && !Number.isNaN(now), "slider/aria-valuenow", "role=slider needs a numeric aria-valuenow.", el);
    run.expect(now >= min && now <= max, "slider/value", `aria-valuenow ${now} is outside ${min}–${max}.`, el);
    run.expect(isFocusable(el), "slider/focusable", "The slider isn't focusable.", el);
    if (!run.canInteract("slider/keyboard") || isDisabled(el)) continue;
    await run.focus(el);
    const vertical = el.getAttribute("aria-orientation") === "vertical";
    const start = Number(el.getAttribute("aria-valuenow"));
    await run.press(start >= max ? "ArrowLeft" : vertical ? "ArrowUp" : "ArrowRight", el);
    const moved = Number(el.getAttribute("aria-valuenow"));
    run.expect(moved !== start, "slider/keyboard", "Arrow keys didn't change aria-valuenow.", el);
    await run.press("Home", el);
    run.expect(Number(el.getAttribute("aria-valuenow")) === min, "slider/home-end", "Home didn't move the slider to its minimum.", el);
    await run.press("End", el);
    run.expect(Number(el.getAttribute("aria-valuenow")) === max, "slider/home-end", "End didn't move the slider to its maximum.", el);
  }
}
