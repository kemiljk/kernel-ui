import { accessibleName, describe, idRefs, isDisabled, isFocusable, isHidden, isShown, isTabbable, focusableWithin, within } from "../dom.js";
import type { Run } from "../run.js";
import { checkRefs, noInstances, requireName } from "./common.js";

const own = (container: Element, selector: string, owner: string) =>
  Array.from(container.querySelectorAll(selector)).filter((el) => el.parentElement?.closest(owner) === container);

const isRtl = (el: Element) => el.closest("[dir]")?.getAttribute("dir") === "rtl";

/* ------------------------------------------------------------------ */
/* tabs — APG tabs with automatic or manual activation                 */
/* ------------------------------------------------------------------ */

export async function tabs(run: Run, root: Element) {
  const lists = within(root, "[role=tablist]");
  if (!lists.length) return noInstances(run, "tabs", `role="tablist"`, root);
  for (const list of lists) {
    const tabs = own(list, "[role=tab]", "[role=tablist]") as HTMLElement[];
    requireName(run, "tabs/tablist-name", list, "The tablist", "warning");
    checkRefs(run, "tabs", list);
    if (!run.expect(tabs.length > 0, "tabs/has-tabs", `The tablist contains no role="tab" elements.`, list)) continue;

    const panelOf = (tab: Element) => idRefs(tab, "aria-controls").found[0];
    const check = (when: string) => {
      const selected = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
      run.expect(selected.length === 1, "tabs/one-selected", `${when}${selected.length} tabs have aria-selected="true"; exactly one must.`, list);
      const tabbable = tabs.filter(isTabbable);
      run.expect(
        tabbable.length === 1 && tabbable[0] === selected[0],
        "tabs/roving-tabindex",
        `${when}The tablist should be one Tab stop on the selected tab (tabindex="0", the rest "-1"); found ${tabbable.length} tabbable tab(s)${tabbable[0] && tabbable[0] !== selected[0] ? `, including unselected ${describe(tabbable[0])}` : ""}.`,
        list,
      );
      for (const tab of tabs) {
        const panel = panelOf(tab);
        if (!panel) continue;
        const shouldShow = tab.getAttribute("aria-selected") === "true";
        const hidden = isHidden(panel);
        run.expect(
          shouldShow === !hidden,
          "tabs/inactive-panels-hidden",
          `${when}${describe(panel)} is ${hidden ? "hidden" : "visible"} but its tab is ${shouldShow ? "" : "not "}selected.`,
          panel,
        );
      }
      return selected[0];
    };

    for (const tab of tabs) {
      requireName(run, "tabs/tab-name", tab, "The tab");
      checkRefs(run, "tabs", tab);
      const panel = panelOf(tab);
      if (run.expect(Boolean(panel), "tabs/controls-panel", `The tab has no aria-controls pointing at its tabpanel.`, tab)) {
        run.expect(panel!.getAttribute("role") === "tabpanel", "tabs/panel-role", `${describe(panel)} is controlled by a tab but isn't role="tabpanel".`, panel);
        run.expect(idRefs(panel!, "aria-labelledby").found.includes(tab), "tabs/panel-labelledby", `The tabpanel isn't aria-labelledby its tab, so it has no name.`, panel, "warning");
      }
    }
    const initial = check("");
    if (!run.canInteract("tabs/keyboard")) continue;

    const enabled = tabs.filter((tab) => !isDisabled(tab));
    if (enabled.length < 2) {
      run.skip("tabs/keyboard", "not-applicable", "Fewer than two enabled tabs.", list);
      continue;
    }
    const vertical = list.getAttribute("aria-orientation") === "vertical";
    const next = vertical ? "ArrowDown" : isRtl(list) ? "ArrowLeft" : "ArrowRight";
    const prev = vertical ? "ArrowUp" : isRtl(list) ? "ArrowRight" : "ArrowLeft";
    const start = initial && enabled.includes(initial) ? initial : enabled[0]!;
    const at = (index: number) => enabled[(index + enabled.length) % enabled.length]!;
    const startIndex = enabled.indexOf(start);

    await run.focus(start);
    if (!run.expect(run.focused === start, "tabs/focusable", "The selected tab couldn't be focused.", start)) continue;
    await run.press(next);
    const moved = run.expect(run.focused === at(startIndex + 1), "tabs/arrow-next", `${next} should move focus to the next tab (${describe(at(startIndex + 1))}); focus is on ${describe(run.focused)}.`, start);
    if (moved) {
      const activates = at(startIndex + 1).getAttribute("aria-selected") === "true";
      if (activates) check(`After ${next}: `);
      else run.skip("tabs/automatic-activation", "not-applicable", "Tabs use manual activation (focus moves without selecting); Enter/Space select natively on a <button>.", list);
    }
    await run.press(prev);
    run.expect(run.focused === start, "tabs/arrow-prev", `${prev} should move focus back to ${describe(start)}; focus is on ${describe(run.focused)}.`, start);
    await run.press("End");
    run.expect(run.focused === enabled.at(-1), "tabs/home-end", `End should focus the last tab; focus is on ${describe(run.focused)}.`, list);
    await run.press("Home");
    run.expect(run.focused === enabled[0], "tabs/home-end", `Home should focus the first tab; focus is on ${describe(run.focused)}.`, list);
    await run.press(prev);
    run.expect(run.focused === enabled.at(-1), "tabs/wraps", `${prev} on the first tab should wrap to the last; focus is on ${describe(run.focused)}.`, list);

    // Restore the original selection.
    if (initial && initial.getAttribute("aria-selected") !== "true") await run.click(initial);
  }
}

/* ------------------------------------------------------------------ */
/* radio-group                                                          */
/* ------------------------------------------------------------------ */

export async function radioGroup(run: Run, root: Element) {
  let groups = within(root, "[role=radiogroup], fieldset").filter((el) => el.querySelector("input[type=radio], [role=radio]"));
  if (!groups.length && root.querySelector("input[type=radio], [role=radio]")) groups = [root];
  if (!groups.length) return noInstances(run, "radio-group", "radio group", root);
  for (const group of groups) {
    const radios = Array.from(group.querySelectorAll<HTMLElement>("input[type=radio], [role=radio]"));
    requireName(run, "radio-group/group-name", group, group.tagName === "FIELDSET" ? "The fieldset (its <legend>)" : "The radio group");
    checkRefs(run, "radio-group", group);
    if (group !== root || group.matches("[role=radiogroup], fieldset")) run.pass("radio-group/grouped");
    else run.warn("radio-group/grouped", "Radios aren't wrapped in a <fieldset> with a <legend> (or role=radiogroup), so the question they answer is never announced.", group);
    for (const radio of radios) {
      requireName(run, "radio-group/radio-name", radio, "The radio");
      checkRefs(run, "radio-group", radio);
    }
    const native = radios.filter((radio) => radio.tagName === "INPUT") as HTMLInputElement[];
    const custom = radios.filter((radio) => radio.tagName !== "INPUT");
    if (native.length) {
      const names = new Set(native.map((radio) => radio.name));
      run.expect(
        names.size === 1 && !names.has(""),
        "radio-group/shared-name",
        `Native radios need one shared name for the browser to make them a group (arrow keys, a single Tab stop); found ${names.has("") ? "a radio without a name" : `names ${[...names].map((n) => `"${n}"`).join(", ")}`}.`,
        group,
      );
      run.skip("radio-group/keyboard", "native", "Arrow-key roving and the single Tab stop come from the browser for same-name native radios.", group);
      if (run.canInteract("radio-group/selects")) {
        const target = native.find((radio) => !radio.checked && !radio.disabled);
        const original = native.find((radio) => radio.checked);
        if (target) {
          await run.click(target);
          run.expect(target.checked && native.filter((r) => r.checked).length === 1, "radio-group/selects", "Clicking a radio didn't make it the only checked one.", target);
          if (original) await run.click(original);
        }
      }
    }
    if (custom.length) {
      run.warn("radio-group/native", `Prefer <input type="radio">: role="radio" needs hand-written roving focus and Space handling.`, custom[0]);
      const checked = custom.filter((radio) => radio.getAttribute("aria-checked") === "true");
      run.expect(checked.length <= 1, "radio-group/one-checked", `${checked.length} radios are aria-checked="true".`, group);
      const tabbable = custom.filter(isTabbable);
      run.expect(tabbable.length === 1, "radio-group/roving-tabindex", `The group should be one Tab stop (found ${tabbable.length}).`, group);
      if (!run.canInteract("radio-group/keyboard")) continue;
      const enabled = custom.filter((radio) => !isDisabled(radio));
      if (enabled.length < 2) continue;
      const start = (checked[0] && enabled.includes(checked[0]) ? checked[0] : enabled[0])!;
      const i = enabled.indexOf(start);
      await run.focus(start);
      await run.press("ArrowDown");
      const expected = enabled[(i + 1) % enabled.length]!;
      run.expect(run.focused === expected, "radio-group/arrow-next", `ArrowDown should move focus to the next radio; focus is on ${describe(run.focused)}.`, group);
      run.expect(expected.getAttribute("aria-checked") === "true", "radio-group/arrow-checks", "Moving with arrow keys should check the focused radio.", expected);
      await run.press("ArrowUp");
      run.expect(run.focused === start, "radio-group/arrow-prev", `ArrowUp should move focus back; focus is on ${describe(run.focused)}.`, group);
    }
  }
}

/* ------------------------------------------------------------------ */
/* menu — menu button / context menu                                   */
/* ------------------------------------------------------------------ */

const ITEM = "[role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]";

function triggersFor(el: Element): HTMLElement[] {
  const id = el.getAttribute("id");
  const doc = el.ownerDocument;
  const found = new Set<HTMLElement>();
  if (id) {
    for (const attr of ["popovertarget", "aria-controls", "commandfor", "aria-owns"]) {
      for (const candidate of Array.from(doc.querySelectorAll<HTMLElement>(`[${attr}]`))) {
        if ((candidate.getAttribute(attr) ?? "").split(/\s+/).includes(id)) found.add(candidate);
      }
    }
  }
  const details = el.closest("details");
  const summary = details?.querySelector<HTMLElement>(":scope > summary");
  if (summary && !summary.contains(el)) found.add(summary);
  return [...found];
}

export async function menu(run: Run, root: Element) {
  const menus = within(root, "[role=menu], [role=menubar]");
  if (!menus.length) return noInstances(run, "menu", `role="menu"`, root);
  for (const menuEl of menus) {
    const items = own(menuEl, ITEM, "[role=menu], [role=menubar]") as HTMLElement[];
    checkRefs(run, "menu", menuEl);
    if (!run.expect(items.length > 0, "menu/has-items", `The menu has no role="menuitem" children.`, menuEl)) continue;
    for (const item of items) {
      requireName(run, "menu/item-name", item, "The menu item");
      checkRefs(run, "menu", item);
      if (item.getAttribute("role") !== "menuitem") {
        const state = item.getAttribute("aria-checked");
        run.expect(state === "true" || state === "false", "menu/item-checked", `${item.getAttribute("role")} needs aria-checked="true" or "false".`, item);
      }
    }
    const tabStops = items.filter((item) => (item as HTMLElement).tabIndex >= 0 && isFocusable(item));
    run.expect(tabStops.length <= 1, "menu/items-roving", `Menu items should have tabindex="-1" (focus is moved by arrow keys); ${tabStops.length} are in the Tab order.`, menuEl);

    const triggers = triggersFor(menuEl);
    const trigger = triggers[0];
    if (trigger) {
      requireName(run, "menu/trigger-name", trigger, "The menu button");
      const popup = trigger.getAttribute("aria-haspopup");
      if (trigger.tagName !== "SUMMARY") {
        run.expect(popup === "menu" || popup === "true", "menu/trigger-haspopup", `The menu button should have aria-haspopup="menu" (found ${popup ? `"${popup}"` : "none"}).`, trigger, "warning");
      }
    }
    // aria-labelledby/aria-label only: a menu isn't named from its items.
    const labelled = menuEl.hasAttribute("aria-label") || menuEl.hasAttribute("aria-labelledby");
    run.expect(labelled && accessibleName(menuEl).length > 0, "menu/name", `The menu has no aria-labelledby (pointing at its button) or aria-label, so it's announced without a name.`, menuEl, "warning");

    const expandedMatches = (when: string) => {
      if (!trigger || trigger.tagName === "SUMMARY") return;
      const shown = isShown(menuEl, run.env);
      if (shown === null) return run.skip("menu/trigger-expanded", "environment", `Can't tell whether a [popover] is open without the Popover API (${run.env.name}).`, menuEl);
      const expanded = trigger.getAttribute("aria-expanded");
      run.expect(expanded === String(shown), "menu/trigger-expanded", `${when}the menu is ${shown ? "open" : "closed"} but its button has aria-expanded=${expanded === null ? "(none)" : `"${expanded}"`}.`, trigger);
    };
    expandedMatches("");

    if (!run.canInteract("menu/keyboard")) continue;
    const enabled = items.filter((item) => item.getAttribute("aria-disabled") !== "true" && !isDisabled(item));
    let opened = false;
    const shownAtStart = isShown(menuEl, run.env);
    if (shownAtStart === false && trigger) {
      const canOpen = trigger.tagName === "SUMMARY" || !menuEl.hasAttribute("popover") || run.env.popover;
      if (!canOpen) {
        run.skip("menu/opens", "environment", `The menu is a [popover] and ${run.env.name} has no Popover API; arrow keys are checked by focusing items directly.`, menuEl);
      } else {
        await run.focus(trigger);
        await run.click(trigger);
        opened = Boolean(await run.waitFor(() => isShown(menuEl, run.env) === true));
        run.expect(opened, "menu/opens", "Clicking the menu button didn't open the menu.", trigger);
        if (opened) {
          expandedMatches("After opening, ");
          run.expect(
            Boolean(run.focused && menuEl.contains(run.focused)),
            "menu/focus-on-open",
            `Opening the menu should move focus into it (APG: to the first item); focus is on ${describe(run.focused)}.`,
            menuEl,
            "warning",
          );
        }
      }
    } else if (shownAtStart === false) {
      run.skip("menu/keyboard", "not-applicable", "The menu is closed and has no button to open it (a context menu?). Open it before checking.", menuEl);
      continue;
    }

    if (enabled.length >= 1) {
      const first = enabled[0]!;
      const last = enabled.at(-1)!;
      await run.focus(first);
      if (!run.expect(run.focused === first, "menu/item-focusable", "The first menu item couldn't be focused.", first)) {
        if (opened) await closeMenu(run, menuEl, trigger);
        continue;
      }
      if (enabled.length >= 2) {
        await run.press("ArrowDown");
        run.expect(run.focused === enabled[1], "menu/arrow-down", `ArrowDown should move focus to the next item; focus is on ${describe(run.focused)}.`, menuEl);
        await run.press("ArrowUp");
        run.expect(run.focused === first, "menu/arrow-up", `ArrowUp should move focus to the previous item; focus is on ${describe(run.focused)}.`, menuEl);
        await run.press("ArrowUp");
        run.expect(run.focused === last, "menu/wraps", `ArrowUp on the first item should wrap to the last; focus is on ${describe(run.focused)}.`, menuEl);
        await run.press("Home");
        run.expect(run.focused === first, "menu/home-end", `Home should focus the first item; focus is on ${describe(run.focused)}.`, menuEl);
        await run.press("End");
        run.expect(run.focused === last, "menu/home-end", `End should focus the last item; focus is on ${describe(run.focused)}.`, menuEl);
      }
    }

    if ((opened || shownAtStart === true) && trigger) {
      if (!(run.focused && menuEl.contains(run.focused)) && enabled[0]) await run.focus(enabled[0]);
      await run.press("Escape");
      const closed = await run.waitFor(() => isShown(menuEl, run.env) === false);
      if (closed) {
        run.pass("menu/escape-closes");
        run.expect(run.focused === trigger, "menu/escape-returns-focus", `Escape closed the menu but focus went to ${describe(run.focused)}, not back to its button.`, trigger);
      } else if (menuEl.getAttribute("popover") === "auto") {
        run.skip("menu/escape-closes", "native", `popover="auto" light-dismisses on Escape natively; synthetic key events can't trigger that.`, menuEl);
        await closeMenu(run, menuEl, trigger);
      } else {
        run.fail("menu/escape-closes", "Escape didn't close the menu.", menuEl);
        await closeMenu(run, menuEl, trigger);
      }
    } else if (!opened && shownAtStart !== true) {
      run.skip("menu/escape-closes", "environment", "The menu couldn't be opened here, so Escape wasn't checked.", menuEl);
    }
  }
}

async function closeMenu(run: Run, menuEl: Element, trigger?: HTMLElement) {
  const details = menuEl.closest("details");
  if (details && trigger?.tagName === "SUMMARY") {
    if (details.open) await run.click(trigger);
    return;
  }
  if (run.env.popover && menuEl.hasAttribute("popover")) {
    try {
      (menuEl as HTMLElement).hidePopover();
    } catch {
      /* already closed */
    }
    await run.settle();
  }
  trigger?.focus();
}

/* ------------------------------------------------------------------ */
/* toolbar                                                              */
/* ------------------------------------------------------------------ */

export async function toolbar(run: Run, root: Element) {
  const bars = within(root, "[role=toolbar]");
  if (!bars.length) return noInstances(run, "toolbar", `role="toolbar"`, root);
  for (const bar of bars) {
    requireName(run, "toolbar/name", bar, "The toolbar", "warning");
    const controls = focusableWithin(bar).filter((el) => !isDisabled(el));
    const tabbable = controls.filter(isTabbable);
    run.expect(tabbable.length === 1, "toolbar/one-tab-stop", `A toolbar should be one Tab stop with arrow keys between controls; ${tabbable.length} controls are in the Tab order.`, bar);
    if (!run.canInteract("toolbar/keyboard") || controls.length < 2) continue;
    const vertical = bar.getAttribute("aria-orientation") === "vertical";
    const next = vertical ? "ArrowDown" : isRtl(bar) ? "ArrowLeft" : "ArrowRight";
    const start = tabbable[0] ?? controls[0]!;
    const index = controls.indexOf(start);
    await run.focus(start);
    await run.press(next);
    run.expect(run.focused === controls[(index + 1) % controls.length], "toolbar/arrow", `${next} should move focus to the next control; focus is on ${describe(run.focused)}.`, bar);
    await run.press("Home");
    run.expect(run.focused === controls[0], "toolbar/home-end", "Home should focus the first control.", bar, "warning");
    await run.press("End");
    run.expect(run.focused === controls.at(-1), "toolbar/home-end", "End should focus the last control.", bar, "warning");
  }
}

/* ------------------------------------------------------------------ */
/* grid — data grid / date picker calendar                             */
/* ------------------------------------------------------------------ */

export async function grid(run: Run, root: Element) {
  const grids = within(root, "[role=grid], [role=treegrid]");
  if (!grids.length) return noInstances(run, "grid", `role="grid"`, root);
  for (const gridEl of grids) {
    requireName(run, "grid/name", gridEl, "The grid");
    checkRefs(run, "grid", gridEl);
    const misplaced = Array.from(gridEl.querySelectorAll("[aria-selected]")).filter(
      (el) => !/^(gridcell|row|columnheader|rowheader)$/.test(el.getAttribute("role") ?? (el.tagName === "TD" ? "gridcell" : el.tagName === "TR" ? "row" : "")),
    );
    run.expect(misplaced.length === 0, "grid/aria-selected-placement", `aria-selected belongs on the gridcell (or row), not ${describe(misplaced[0])}.`, misplaced[0] ?? gridEl);

    // Matrix of focus targets: a cell, or the control inside it.
    const rows = Array.from(gridEl.querySelectorAll("[role=row], tr")).filter((row) => row.closest("[role=grid], [role=treegrid]") === gridEl);
    const matrix: (HTMLElement | null)[][] = [];
    for (const row of rows) {
      const cells = Array.from(row.children).filter((cell) => /^(gridcell|cell)$/.test(cell.getAttribute("role") ?? (cell.tagName === "TD" ? "gridcell" : "")));
      if (!cells.length) continue;
      matrix.push(
        cells.map((cell) => {
          if (isFocusable(cell)) return cell as HTMLElement;
          const inner = focusableWithin(cell).find((el) => !isDisabled(el));
          return inner ?? null;
        }),
      );
    }
    const targets = matrix.flat().filter((el): el is HTMLElement => el !== null);
    if (!run.expect(targets.length > 0, "grid/has-cells", "The grid has no focusable cells.", gridEl)) continue;
    const tabbable = targets.filter(isTabbable);
    run.expect(
      tabbable.length === 1,
      "grid/one-tab-stop",
      tabbable.length === 0
        ? "Nothing in the grid is in the Tab order, so keyboard users can't reach it. One cell needs tabindex=\"0\"."
        : `A grid is one Tab stop; ${tabbable.length} cells are in the Tab order.`,
      gridEl,
    );
    if (!run.canInteract("grid/keyboard")) continue;

    const position = (el: Element | null) => {
      for (let r = 0; r < matrix.length; r++) {
        const c = matrix[r]!.indexOf(el as HTMLElement);
        if (c !== -1) return { r, c };
      }
      return null;
    };
    const start = tabbable[0] ?? targets[0]!;
    const { r, c } = position(start)!;
    const row = matrix[r]!;
    const rightOf = row.slice(c + 1).find(Boolean) ?? null;
    const leftOf = row.slice(0, c).reverse().find(Boolean) ?? null;
    const below = matrix[r + 1]?.[c] ?? null;
    const above = matrix[r - 1]?.[c] ?? null;
    const rowStart = row.find(Boolean) ?? null;
    const rowEnd = [...row].reverse().find(Boolean) ?? null;
    const moves: [string, HTMLElement | null, string][] = [
      [isRtl(gridEl) ? "ArrowLeft" : "ArrowRight", rightOf, "grid/arrow-right"],
      [isRtl(gridEl) ? "ArrowRight" : "ArrowLeft", leftOf, "grid/arrow-left"],
      ["ArrowDown", below, "grid/arrow-down"],
      ["ArrowUp", above, "grid/arrow-up"],
      ["Home", rowStart, "grid/home"],
      ["End", rowEnd, "grid/end"],
    ];
    for (const [key, expected, rule] of moves) {
      if (!expected) {
        run.skip(rule, "not-applicable", `No cell in that direction from ${describe(start)}.`, start);
        continue;
      }
      await run.focus(start);
      if (run.focused !== start) {
        run.fail("grid/focusable", `${describe(start)} couldn't be focused.`, start);
        break;
      }
      await run.press(key);
      const landed = position(run.focused);
      run.expect(
        run.focused === expected,
        rule,
        `${key} from ${describe(start)} (row ${r + 1}, column ${c + 1}) should focus ${describe(expected)}${key === "Home" || key === "End" ? ` — the ${key === "Home" ? "first" : "last"} cell of the same row` : ""}; focus is on ${describe(run.focused)}${landed ? ` (row ${landed.r + 1}, column ${landed.c + 1})` : ""}.`,
        gridEl,
      );
      if (run.focused === expected && rule === "grid/arrow-right") {
        const nowTabbable = targets.filter(isTabbable);
        run.expect(
          nowTabbable.length === 1 && nowTabbable[0] === expected,
          "grid/roving-follows-focus",
          `After arrowing to ${describe(expected)}, the Tab stop stayed on ${describe(nowTabbable[0])}; APG grids move tabindex="0" with focus so Tab-away-and-back returns to the same cell.`,
          gridEl,
          "warning",
        );
      }
    }
    await run.focus(start);
  }
}

/* ------------------------------------------------------------------ */
/* listbox                                                              */
/* ------------------------------------------------------------------ */

function comboboxFor(listbox: Element) {
  const id = listbox.getAttribute("id");
  if (!id) return null;
  return Array.from(listbox.ownerDocument.querySelectorAll("[role=combobox]")).find((combo) =>
    `${combo.getAttribute("aria-controls") ?? ""} ${combo.getAttribute("aria-owns") ?? ""}`.split(/\s+/).includes(id),
  ) ?? null;
}

export async function listbox(run: Run, root: Element) {
  const boxes = within(root, "[role=listbox]").filter((el) => el.tagName !== "SELECT");
  if (!boxes.length) return noInstances(run, "listbox", `role="listbox"`, root);
  for (const box of boxes) {
    const combo = comboboxFor(box);
    checkRefs(run, "listbox", box);
    const options = own(box, "[role=option]", "[role=listbox]") as HTMLElement[];
    if (!combo) requireName(run, "listbox/name", box, "The listbox");
    for (const option of options) requireName(run, "listbox/option-name", option, "The option");
    const selected = options.filter((option) => option.getAttribute("aria-selected") === "true");
    if (box.getAttribute("aria-multiselectable") !== "true") {
      run.expect(selected.length <= 1, "listbox/single-selection", `${selected.length} options are aria-selected="true" in a single-select listbox.`, box);
    }
    if (combo) continue; // keyboard belongs to the combobox
    if (!options.length) {
      run.warn("listbox/has-options", "The listbox has no options.", box);
      continue;
    }
    const activeDescendant = box.hasAttribute("aria-activedescendant") || isTabbable(box);
    const tabbable = activeDescendant ? [box].filter(isTabbable) : options.filter(isTabbable);
    run.expect(tabbable.length === 1, "listbox/one-tab-stop", `A listbox is one Tab stop; found ${tabbable.length}.`, box);
    if (!run.canInteract("listbox/keyboard") || options.length < 2) continue;
    const current = () => (activeDescendant ? idRefs(box, "aria-activedescendant").found[0] ?? null : run.focused);
    await run.focus(tabbable[0] ?? box);
    const before = current();
    await run.press("ArrowDown");
    const after = current();
    run.expect(after !== null && after !== before && options.includes(after as HTMLElement), "listbox/arrow-down", "ArrowDown didn't move to another option.", box);
    await run.press("Home");
    run.expect(current() === options[0], "listbox/home-end", "Home should move to the first option.", box, "warning");
    await run.press("End");
    run.expect(current() === options.at(-1), "listbox/home-end", "End should move to the last option.", box, "warning");
  }
}

/* ------------------------------------------------------------------ */
/* combobox — APG 1.2 editable combobox with listbox popup             */
/* ------------------------------------------------------------------ */

export async function combobox(run: Run, root: Element) {
  const combos = within(root, "[role=combobox]").filter((el) => el.tagName !== "SELECT");
  if (!combos.length) return noInstances(run, "combobox", `role="combobox"`, root);
  for (const combo of combos as HTMLElement[]) {
    requireName(run, "combobox/name", combo, "The combobox");
    checkRefs(run, "combobox", combo);
    const expanded = () => combo.getAttribute("aria-expanded");
    run.expect(expanded() === "true" || expanded() === "false", "combobox/aria-expanded", `A combobox needs aria-expanded="true" or "false" (found ${expanded() === null ? "none" : `"${expanded()}"`}).`, combo);
    const popup = idRefs(combo, "aria-controls").found[0] ?? idRefs(combo, "aria-owns").found[0];
    if (!run.expect(Boolean(popup), "combobox/controls-popup", "The combobox has no aria-controls pointing at its popup.", combo)) continue;
    const popupRole = popup!.getAttribute("role");
    run.expect(/^(listbox|grid|tree|dialog)$/.test(popupRole ?? ""), "combobox/popup-role", `The popup should be a listbox, grid, tree or dialog (found ${popupRole ? `role="${popupRole}"` : "no role"}).`, popup);
    const autocomplete = combo.getAttribute("aria-autocomplete");
    if (autocomplete !== null) {
      run.expect(/^(none|list|both|inline)$/.test(autocomplete), "combobox/aria-autocomplete", `aria-autocomplete="${autocomplete}" isn't a valid value.`, combo);
    }
    const options = () => Array.from(popup!.querySelectorAll<HTMLElement>("[role=option]")).filter((o) => !isHidden(o, popup!));
    const active = () => idRefs(combo, "aria-activedescendant").found[0] ?? null;
    // Compared by id: a listbox may re-render its options on every key press.
    const activeId = () => active()?.id ?? null;
    const consistent = (when: string) => {
      const shown = isShown(popup!, run.env);
      if (shown === null) return run.skip("combobox/expanded-matches-popup", "environment", `Can't tell whether a [popover] is open without the Popover API (${run.env.name}).`, popup);
      run.expect(String(shown) === expanded(), "combobox/expanded-matches-popup", `${when}aria-expanded="${expanded()}" but the popup is ${shown ? "shown" : "hidden"}.`, combo);
    };
    consistent("");
    if (combo.hasAttribute("aria-activedescendant") && combo.getAttribute("aria-activedescendant")) {
      run.expect(Boolean(active() && popup!.contains(active())), "combobox/activedescendant", "aria-activedescendant must point at an option inside the popup.", combo);
    }
    if (!run.canInteract("combobox/keyboard") || isDisabled(combo)) continue;
    const startValue = (combo as HTMLInputElement).value;
    await run.focus(combo);
    await run.press("ArrowDown", combo);
    run.expect(expanded() === "true", "combobox/arrow-down-opens", `ArrowDown should open the popup (aria-expanded is "${expanded()}").`, combo);
    run.expect(run.focused === combo, "combobox/focus-stays", `DOM focus should stay on the combobox while the popup is open; it moved to ${describe(run.focused)}.`, combo);
    consistent("After ArrowDown, ");
    const list = options();
    if (list.length) {
      if (!active()) await run.press("ArrowDown", combo);
      const first = activeId();
      run.expect(Boolean(first && active() && popup!.contains(active())), "combobox/activedescendant-moves", "ArrowDown should highlight an option via aria-activedescendant.", combo);
      if (list.length >= 2 && first) {
        // Step away from the highlighted option and back, in whichever
        // direction has room (a list may clamp at its ends rather than wrap).
        const ids = options().map((option) => option.id);
        const atEnd = ids.indexOf(first) === ids.length - 1;
        const [away, back] = atEnd ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"];
        await run.press(away, combo);
        const second = activeId();
        run.expect(second !== null && second !== first, "combobox/activedescendant-moves", `${away} should move aria-activedescendant to the ${atEnd ? "previous" : "next"} option.`, combo);
        await run.press(back, combo);
        run.expect(activeId() === first, "combobox/arrow-up", `${back} should move aria-activedescendant back to the option it came from.`, combo);
      }
    } else {
      run.skip("combobox/activedescendant-moves", "not-applicable", "The popup has no options.", popup);
    }
    await run.press("Escape", combo);
    const closed = await run.waitFor(() => expanded() === "false");
    run.expect(Boolean(closed), "combobox/escape-closes", `Escape should close the popup (aria-expanded is "${expanded()}").`, combo);
    run.expect(run.focused === combo, "combobox/focus-stays", `Focus should stay on the combobox after Escape; it's on ${describe(run.focused)}.`, combo);
    run.expect((combo as HTMLInputElement).value === startValue, "combobox/escape-keeps-value", "Escape after arrowing changed the input's value without a selection.", combo, "warning");
  }
}
