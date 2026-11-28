import { accessibleName, describe, focusableWithin, idRefs, isDisabled, isFocusable, isShown, roleOf, within } from "../dom.js";
import type { Run } from "../run.js";
import { checkRefs, noInstances, requireName } from "./common.js";

/* ------------------------------------------------------------------ */
/* dialog — native <dialog> first                                      */
/* ------------------------------------------------------------------ */

export async function dialog(run: Run, root: Element) {
  const dialogs = within(root, "dialog, [role=dialog], [role=alertdialog]");
  if (!dialogs.length) return noInstances(run, "dialog", "dialog", root);
  for (const el of dialogs) {
    requireName(run, "dialog/name", el, "The dialog");
    checkRefs(run, "dialog", el);
    const native = el.tagName === "DIALOG";
    run.expect(native, "dialog/native", `Use a <dialog> with showModal() instead of role="${el.getAttribute("role")}" on a <${el.tagName.toLowerCase()}>: focus containment, inertness, the top layer and Escape come free.`, el, "warning");
    if (native && el.getAttribute("role") && el.getAttribute("role") !== "dialog" && el.getAttribute("role") !== "alertdialog") {
      run.fail("dialog/role", `role="${el.getAttribute("role")}" overrides the <dialog>'s semantics.`, el);
    }
    if (!isShown(el, run.env)) {
      run.skip("dialog/open-checks", "not-applicable", "The dialog is closed; open it before checking focus and dismissal.", el);
      continue;
    }

    const closers = focusableWithin(el).filter((control) => {
      const name = accessibleName(control);
      return roleOf(control) === "button" && (/\b(close|dismiss|cancel|done)\b/i.test(name) || control.getAttribute("data-slot")?.includes("close"));
    });
    run.expect(closers.length > 0, "dialog/close-button", "The open dialog has no visible close button (a named Close/Cancel/Done button); Escape alone isn't discoverable.", el, "warning");
    for (const closer of closers) requireName(run, "dialog/close-button", closer, "The close button");

    let modal: boolean | null = null;
    if (native) {
      try {
        modal = el.matches(":modal");
      } catch {
        modal = null;
      }
    } else modal = el.getAttribute("aria-modal") === "true";

    if (native && !run.env.modalDialog) {
      run.skip("dialog/focus-inside", "environment", `${run.env.name} doesn't implement modal <dialog> focus management; check this in a browser.`, el);
    } else if (modal) {
      run.expect(Boolean(run.focused && el.contains(run.focused)), "dialog/focus-inside", `The modal dialog is open but focus is outside it, on ${describe(run.focused)}.`, el);
    } else if (native && modal === false) {
      run.warn("dialog/modal", "The <dialog> is open without showModal(): the page behind stays interactive and Escape won't close it. Use showModal() unless it's meant to be non-modal.", el);
    }

    if (native) {
      if (el.getAttribute("closedby") === "none") run.warn("dialog/escape", `closedby="none" stops Escape closing the dialog.`, el);
      run.skip("dialog/escape", "native", "Escape closes a modal <dialog> natively (a cancel event, then close); synthetic key events can't trigger that.", el);
    } else if (run.canInteract("dialog/escape")) {
      await run.press("Escape", run.focused && el.contains(run.focused) ? run.focused : el);
      run.expect(Boolean(await run.waitFor(() => !isShown(el, run.env))), "dialog/escape", "Escape didn't close the dialog.", el);
    }
  }
}

/* ------------------------------------------------------------------ */
/* tooltip                                                              */
/* ------------------------------------------------------------------ */

export async function tooltip(run: Run, root: Element) {
  const tips = within(root, "[role=tooltip]");
  if (!tips.length) return noInstances(run, "tooltip", `role="tooltip"`, root);
  for (const tip of tips) {
    run.expect((tip.textContent ?? "").trim().length > 0, "tooltip/content", "The tooltip has no text.", tip);
    const focusable = focusableWithin(tip);
    run.expect(focusable.length === 0, "tooltip/no-interactive-content", `A tooltip can't hold interactive content (${describe(focusable[0])}); it vanishes before anyone can reach it. Use a Popover.`, focusable[0] ?? tip);
    const id = tip.getAttribute("id");
    const triggers = id
      ? Array.from(tip.ownerDocument.querySelectorAll<HTMLElement>("[aria-describedby], [aria-labelledby]")).filter((el) =>
          [...idRefs(el, "aria-describedby").ids, ...idRefs(el, "aria-labelledby").ids].includes(id),
        )
      : [];
    if (!run.expect(triggers.length > 0, "tooltip/trigger", "Nothing points at the tooltip with aria-describedby (or aria-labelledby), so it's never announced.", tip)) continue;
    const trigger = triggers[0]!;
    run.expect(isFocusable(trigger), "tooltip/trigger-focusable", "The tooltip's trigger isn't focusable, so keyboard users can never see the tooltip.", trigger);
    if (!run.canInteract("tooltip/keyboard") || isDisabled(trigger)) continue;
    await withoutNativeInterest(run, "tooltip", trigger, () => tooltipKeyboard(run, tip, trigger));
  }
}

async function tooltipKeyboard(run: Run, tip: Element, trigger: HTMLElement) {
  if (isShown(tip, run.env) === null && !run.env.popover) {
    run.skip("tooltip/shows-on-focus", "environment", `Can't tell whether a [popover] tooltip is open without the Popover API (${run.env.name}).`, tip);
  }
  await run.focus(trigger);
  const shown = await run.waitFor(() => isShown(tip, run.env) === true, 300);
  const known = isShown(tip, run.env) !== null;
  if (known) run.expect(shown, "tooltip/shows-on-focus", "Focusing the trigger didn't show the tooltip; it must appear on keyboard focus, not just hover.", trigger);
  if (!shown) {
    if (!known) run.skip("tooltip/escape-dismisses", "environment", "Tooltip visibility isn't observable here, so Escape wasn't checked.", tip);
    trigger.blur();
    return;
  }
  await run.press("Escape", trigger);
  const dismissed = await run.waitFor(() => isShown(tip, run.env) === false);
  run.expect(dismissed, "tooltip/escape-dismisses", "Escape didn't hide the tooltip. WCAG 1.4.13 requires content shown on hover or focus to be dismissible without moving focus.", tip);
  run.expect(run.focused === trigger, "tooltip/escape-keeps-focus", `Escape moved focus away from the trigger, to ${describe(run.focused)}.`, trigger);
  await run.focus(trigger.ownerDocument.body);
  trigger.blur();
  await run.waitFor(() => isShown(tip, run.env) === false);
}

/**
 * Chromium implements `interestfor`: a focused or hovered invoker shows its
 * target itself, and a real Escape makes it lose interest, but a dispatched
 * key can't. Left in place, the browser re-shows a popover the page's own
 * Escape handler just hid. So the keyboard checks run with the attribute set
 * aside (and put back after): they check the page's own handlers, and the
 * native half is reported as skipped, for a real-key test to cover.
 */
async function withoutNativeInterest(run: Run, prefix: string, trigger: HTMLElement, check: () => Promise<void>) {
  const value = trigger.getAttribute("interestfor");
  if (value === null || run.env.name !== "browser" || !("interestForElement" in trigger)) return check();
  trigger.removeAttribute("interestfor");
  run.skip(`${prefix}/native-interest`, "native", "This browser implements interestfor, whose Escape handling dispatched keys can't reach; the keyboard checks ran with it set aside. Press a real Escape (Playwright's keyboard) to cover it.", trigger);
  try {
    await check();
  } finally {
    trigger.setAttribute("interestfor", value);
  }
}

/* ------------------------------------------------------------------ */
/* disclosure — <details>, aria-expanded buttons, popovertarget        */
/* ------------------------------------------------------------------ */

interface Disclosure {
  kind: "details" | "button" | "popover";
  trigger: HTMLElement;
  target: Element | null;
}

function findDisclosures(root: Element): Disclosure[] {
  const found: Disclosure[] = [];
  const doc = root.ownerDocument;
  for (const details of within(root, "details") as HTMLDetailsElement[]) {
    if (details.querySelector("[role=menu]")) continue; // a disclosure-presentation menu: the menu pattern owns it
    const summary = details.querySelector<HTMLElement>(":scope > summary");
    found.push({ kind: "details", trigger: summary ?? (details as unknown as HTMLElement), target: details });
  }
  const popoverTargets = new Set<Element>();
  const invokers = within(root, "[popovertarget]");
  if (root.hasAttribute("popover") && root.id) {
    for (const el of Array.from(doc.querySelectorAll(`[popovertarget]`))) if (el.getAttribute("popovertarget") === root.id) invokers.push(el);
  }
  for (const el of invokers as HTMLElement[]) {
    const target = idRefs(el, "popovertarget").found[0] ?? null;
    if (target && /^(menu|listbox|tooltip)$/.test(target.getAttribute("role") ?? "")) continue;
    if (target && popoverTargets.has(target)) continue;
    if (target) popoverTargets.add(target);
    found.push({ kind: "popover", trigger: el, target });
  }
  for (const el of within(root, "[aria-expanded]") as HTMLElement[]) {
    if (el.hasAttribute("popovertarget") || el.tagName === "SUMMARY") continue;
    const role = roleOf(el);
    if (role !== "button" && role !== "link") continue;
    const popup = el.getAttribute("aria-haspopup");
    if (popup && popup !== "false" && popup !== "dialog") continue;
    found.push({ kind: "button", trigger: el, target: idRefs(el, "aria-controls").found[0] ?? null });
  }
  return found;
}

export async function disclosure(run: Run, root: Element) {
  const items = findDisclosures(root);
  if (!items.length) return noInstances(run, "disclosure", "disclosure (<details>, aria-expanded button or popovertarget button)", root);
  for (const item of items) await checkDisclosure(run, "disclosure", item);
}

async function checkDisclosure(run: Run, prefix: string, { kind, trigger, target }: Disclosure) {
  if (kind === "details") {
    const details = target as HTMLDetailsElement;
    if (!run.expect(trigger.tagName === "SUMMARY", `${prefix}/summary`, "The <details> has no <summary>, so the browser labels it \"Details\".", details)) return;
    requireName(run, `${prefix}/name`, trigger, "The <summary>");
    const nested = focusableWithin(trigger);
    run.expect(nested.length === 0, `${prefix}/summary-content`, `The <summary> contains interactive content (${describe(nested[0])}), which can't be reached reliably.`, nested[0] ?? trigger);
    run.skip(`${prefix}/keyboard`, "native", "Enter and Space toggle a <summary> natively.", trigger);
    if (!run.canInteract(`${prefix}/toggles`)) return;
    const before = details.open;
    await run.click(trigger);
    // An animated disclosure may flip `open` after its transition, not on click.
    const toggled = await run.waitFor(() => details.open !== before, 600);
    if (!toggled && run.env.name !== "browser") {
      run.skip(`${prefix}/toggles`, "environment", `${run.env.name} doesn't run <summary> activation behaviour.`, trigger);
      return;
    }
    if (run.expect(toggled, `${prefix}/toggles`, "Clicking the <summary> didn't toggle the <details> (is a click handler calling preventDefault?).", trigger)) {
      await run.click(trigger);
      await run.waitFor(() => details.open === before, 600);
    }
    return;
  }

  requireName(run, `${prefix}/name`, trigger, "The disclosure button");
  checkRefs(run, prefix, trigger);
  run.expect(roleOf(trigger) === "button", `${prefix}/role`, `A disclosure trigger should be a button (found ${roleOf(trigger)}).`, trigger, "warning");

  if (kind === "button") {
    const expanded = () => trigger.getAttribute("aria-expanded");
    run.expect(expanded() === "true" || expanded() === "false", `${prefix}/aria-expanded`, `aria-expanded must be "true" or "false" (found "${expanded()}").`, trigger);
    if (!target) {
      run.warn(`${prefix}/controls`, "The button has aria-expanded but no aria-controls pointing at the content it shows.", trigger);
      return;
    }
    const matches = async (when: string) => {
      const shown = isShown(target, run.env);
      if (shown === null) return run.skip(`${prefix}/expanded-matches`, "environment", `Can't observe the content's visibility in ${run.env.name}.`, target);
      if (when) await run.waitFor(() => String(isShown(target, run.env)) === expanded(), 600);
      const now = isShown(target, run.env);
      run.expect(String(now) === expanded(), `${prefix}/expanded-matches`, `${when}aria-expanded="${expanded()}" but ${describe(target)} is ${now ? "shown" : "hidden"}.`, trigger);
    };
    await matches("");
    if (!run.canInteract(`${prefix}/toggles`) || isDisabled(trigger)) return;
    const before = expanded();
    await run.click(trigger);
    await run.waitFor(() => expanded() !== before, 300);
    if (run.expect(expanded() !== before, `${prefix}/toggles`, "Clicking didn't change aria-expanded.", trigger)) {
      await matches("After clicking, ");
      await run.click(trigger);
      await run.waitFor(() => expanded() === before, 600);
    }
    return;
  }

  // popovertarget invoker
  if (!target) {
    run.fail(`${prefix}/controls`, `popovertarget="${trigger.getAttribute("popovertarget")}" doesn't match any element.`, trigger);
    return;
  }
  if (!target.hasAttribute("popover")) run.fail(`${prefix}/popover`, `${describe(target)} is a popovertarget but has no popover attribute.`, target);
  const matches = async (when: string) => {
    if (!trigger.hasAttribute("aria-expanded")) return run.pass(`${prefix}/expanded-matches`); // exposed natively for popovertarget
    const shown = isShown(target, run.env);
    if (shown === null) return run.skip(`${prefix}/expanded-matches`, "environment", `Can't tell whether a [popover] is open without the Popover API (${run.env.name}).`, target);
    // Mirroring the popover's state usually happens in its async `toggle` event.
    if (when) await run.waitFor(() => trigger.getAttribute("aria-expanded") === String(isShown(target, run.env)), 300);
    const now = isShown(target, run.env);
    run.expect(String(now) === trigger.getAttribute("aria-expanded"), `${prefix}/expanded-matches`, `${when}aria-expanded="${trigger.getAttribute("aria-expanded")}" but the popover is ${now ? "open" : "closed"}.`, trigger);
  };
  await matches("");
  if (!run.canInteract(`${prefix}/toggles`) || isDisabled(trigger)) return;
  if (!run.env.popover) {
    run.skip(`${prefix}/toggles`, "environment", `${run.env.name} has no Popover API, so popovertarget does nothing.`, trigger);
    return;
  }
  const wasOpen = isShown(target, run.env);
  await run.click(trigger);
  const changed = await run.waitFor(() => isShown(target, run.env) !== wasOpen, 300);
  if (run.expect(changed, `${prefix}/toggles`, "Clicking the popovertarget button didn't toggle the popover.", trigger)) {
    await matches("After clicking, ");
    if (!wasOpen) {
      try {
        (target as HTMLElement).hidePopover();
      } catch {
        /* closed already */
      }
      await run.waitFor(() => isShown(target, run.env) === false);
      await matches("After closing, ");
    }
  }
  run.skip(`${prefix}/escape`, "native", "popover=\"auto\" light-dismisses on Escape natively.", target);
}

/* ------------------------------------------------------------------ */
/* accordion — a group of disclosures                                  */
/* ------------------------------------------------------------------ */

export async function accordion(run: Run, root: Element) {
  const details = within(root, "details").filter((el) => !el.querySelector("[role=menu]")) as HTMLDetailsElement[];
  const buttons = within(root, "[aria-expanded][aria-controls]").filter((el) => roleOf(el) === "button" && !el.hasAttribute("aria-haspopup")) as HTMLElement[];
  if (!details.length && !buttons.length) return noInstances(run, "accordion", "accordion (<details> or aria-expanded header buttons)", root);
  for (const el of details) {
    await checkDisclosure(run, "accordion", { kind: "details", trigger: el.querySelector<HTMLElement>(":scope > summary") ?? (el as unknown as HTMLElement), target: el });
  }
  for (const button of buttons) {
    const heading = button.closest("h1, h2, h3, h4, h5, h6, [role=heading]");
    run.expect(Boolean(heading), "accordion/header-heading", "APG accordion header buttons sit inside a heading, so the sections show up in heading navigation.", button, "warning");
    await checkDisclosure(run, "accordion", { kind: "button", trigger: button, target: idRefs(button, "aria-controls").found[0] ?? null });
  }

  // Exclusive accordions: <details name> is native; check it where the browser implements it.
  const names = new Set(details.map((el) => el.getAttribute("name")).filter(Boolean));
  if (names.size && details.length >= 2) {
    const supported = run.env.name === "browser" && "name" in (root.ownerDocument.defaultView?.HTMLDetailsElement.prototype ?? {});
    if (!supported || !run.interactions) {
      run.skip("accordion/exclusive", supported ? "not-applicable" : "environment", `<details name> exclusivity is native; ${run.env.name} doesn't implement it.`, details[0]);
      return;
    }
    const group = details.filter((el) => el.getAttribute("name") === [...names][0]);
    const original = group.map((el) => el.open);
    const [a, b] = group as [HTMLDetailsElement, HTMLDetailsElement];
    a.open = true;
    await run.settle();
    b.open = true;
    await run.settle();
    run.expect(!a.open && b.open, "accordion/exclusive", `<details name="${a.getAttribute("name")}"> should close the open item when another opens.`, a);
    group.forEach((el, i) => (el.open = original[i]!));
    await run.settle();
  }
}

/* ------------------------------------------------------------------ */
/* hover-card — interactive content shown on hover or focus            */
/* ------------------------------------------------------------------ */

/**
 * A non-modal popup that opens on hover or focus and, unlike a tooltip, may
 * hold links (Kernel's HoverCard; Radix/shadcn's HoverCard). There's no APG
 * pattern of its own: the rules are WCAG 1.4.13's (dismissible, hoverable,
 * persistent) plus the keyboard half of APG's disclosure, so a keyboard user
 * can open it, reach what's inside and leave.
 */
function findHoverCards(root: Element): { card: HTMLElement; trigger: HTMLElement | null }[] {
  const doc = root.ownerDocument;
  const cards = within(root, "[popover]").filter((el) => !/^(tooltip|menu|listbox|dialog|alertdialog)$/.test(el.getAttribute("role") ?? "")) as HTMLElement[];
  const found: { card: HTMLElement; trigger: HTMLElement | null }[] = [];
  for (const card of cards) {
    if (!card.id) continue;
    const trigger =
      Array.from(doc.querySelectorAll<HTMLElement>("[aria-describedby], [aria-details], [interestfor]")).find(
        (el) =>
          !el.hasAttribute("popovertarget") &&
          [...idRefs(el, "aria-describedby").ids, ...idRefs(el, "aria-details").ids, ...idRefs(el, "interestfor").ids].includes(card.id),
      ) ?? null;
    // A popover nothing describes is some other surface (a Popover's panel is a popovertarget).
    if (trigger || card.getAttribute("data-slot") === "hover-card-content") found.push({ card, trigger });
  }
  return found;
}

export async function hoverCard(run: Run, root: Element) {
  const items = findHoverCards(root);
  if (!items.length) return noInstances(run, "hover-card", "hover card (a [popover] its trigger points at with aria-describedby, aria-details or interestfor)", root);
  for (const { card, trigger } of items) {
    checkRefs(run, "hover-card", card);
    if (!run.expect(Boolean(trigger), "hover-card/trigger", "Nothing points at the card with aria-describedby, aria-details or interestfor, so it's never announced.", card)) continue;
    const t = trigger!;
    checkRefs(run, "hover-card", t);
    requireName(run, "hover-card/trigger-name", t, "The hover card's trigger");
    if (!run.expect(isFocusable(t), "hover-card/trigger-focusable", "The trigger isn't focusable, so keyboard users can never open the card.", t)) continue;
    const inside = focusableWithin(card).filter((el) => !isDisabled(el));
    if (inside.length) {
      // Tab from the trigger has to reach the card's links, and a top-layer
      // popover is still Tabbed to in DOM order.
      const follows = Boolean(t.compareDocumentPosition(card) & 4 /* DOCUMENT_POSITION_FOLLOWING */);
      run.expect(follows, "hover-card/reading-order", "The card holds interactive content but comes before its trigger in the DOM, so Tab from the trigger skips it.", card, "warning");
    }
    if (!run.canInteract("hover-card/keyboard") || isDisabled(t)) continue;
    await withoutNativeInterest(run, "hover-card", t, () => hoverCardKeyboard(run, card, t, inside));
  }
}

async function hoverCardKeyboard(run: Run, card: HTMLElement, t: HTMLElement, inside: HTMLElement[]) {
  await run.focus(t);
  const shown = await run.waitFor(() => isShown(card, run.env) === true, 400);
  if (isShown(card, run.env) === null) {
    run.skip("hover-card/shows-on-focus", "environment", `Can't tell whether a [popover] card is open without the Popover API (${run.env.name}).`, card);
    t.blur();
    return;
  }
  if (!run.expect(shown, "hover-card/shows-on-focus", "Focusing the trigger didn't show the card; it must open on keyboard focus, not just hover.", t)) {
    t.blur();
    return;
  }

  await run.press("Escape", t);
  const dismissed = await run.waitFor(() => isShown(card, run.env) === false);
  run.expect(dismissed, "hover-card/escape-dismisses", "Escape didn't hide the card. WCAG 1.4.13 requires content shown on hover or focus to be dismissible without moving focus.", card);
  run.expect(run.focused === t, "hover-card/escape-keeps-focus", `Escape moved focus away from the trigger, to ${describe(run.focused)}.`, t);

  if (inside.length) {
    // Reopen, then move focus into the card the way Tab would.
    await run.focus(t.ownerDocument.body);
    t.blur();
    await run.waitFor(() => isShown(card, run.env) === false);
    await run.focus(t);
    await run.waitFor(() => isShown(card, run.env) === true, 400);
    await run.focus(inside[0]!);
    // Outlast the close delay a blur from the trigger may have started.
    await run.waitFor(() => isShown(card, run.env) === false, 400);
    const stillOpen = isShown(card, run.env) === true && run.focused === inside[0];
    run.expect(stillOpen, "hover-card/focus-inside-keeps-open", `Moving focus from the trigger into the card (${describe(inside[0])}) closed it, so keyboard users can't reach its content.`, card);
    if (stillOpen) {
      await run.press("Escape", inside[0]);
      const closed = await run.waitFor(() => isShown(card, run.env) === false);
      run.expect(closed, "hover-card/escape-dismisses", "Escape from inside the card didn't hide it.", card);
      run.expect(run.focused === t, "hover-card/escape-returns-focus", `Escape from inside the card left focus on ${describe(run.focused)}; return it to the trigger rather than dropping it to <body>.`, t);
    }
  }
  await run.focus(t.ownerDocument.body);
  t.blur();
  await run.waitFor(() => isShown(card, run.env) === false);
}
