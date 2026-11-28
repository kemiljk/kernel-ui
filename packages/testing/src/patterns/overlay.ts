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

    if (isShown(tip, run.env) === null && !run.env.popover) {
      run.skip("tooltip/shows-on-focus", "environment", `Can't tell whether a [popover] tooltip is open without the Popover API (${run.env.name}).`, tip);
    }
    await run.focus(trigger);
    const shown = await run.waitFor(() => isShown(tip, run.env) === true, 300);
    const known = isShown(tip, run.env) !== null;
    if (known) run.expect(shown, "tooltip/shows-on-focus", "Focusing the trigger didn't show the tooltip; it must appear on keyboard focus, not just hover.", trigger);
    if (!shown) {
      if (!known) run.skip("tooltip/escape-dismisses", "environment", "Tooltip visibility isn't observable here, so Escape wasn't checked.", tip);
      (trigger as HTMLElement).blur();
      continue;
    }
    await run.press("Escape", trigger);
    const dismissed = await run.waitFor(() => isShown(tip, run.env) === false);
    run.expect(dismissed, "tooltip/escape-dismisses", "Escape didn't hide the tooltip. WCAG 1.4.13 requires content shown on hover or focus to be dismissible without moving focus.", tip);
    run.expect(run.focused === trigger, "tooltip/escape-keeps-focus", `Escape moved focus away from the trigger, to ${describe(run.focused)}.`, trigger);
    await run.focus(trigger.ownerDocument.body);
    (trigger as HTMLElement).blur();
    await run.waitFor(() => isShown(tip, run.env) === false);
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
