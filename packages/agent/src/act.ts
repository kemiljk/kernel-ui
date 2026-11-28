/**
 * Performing a step the way a person would: real pointer and click events
 * (so React's handlers and the browser's default actions both run), the
 * native value setter plus `input`/`change` for text (so React-controlled
 * inputs see the change), `requestSubmit()` for forms (so validation and
 * submit handlers run), and the component's own trigger for anything that
 * opens or closes.
 */
import {
  accessibleName,
  checkedState,
  expandedState,
  isDetailsSummary,
  isEditableHost,
  isPopoverOpen,
  isReadOnly,
  popoverTargetOf,
  roleOf,
} from "./dom.js";
import type { AgentStep } from "./types.js";

export class StepError extends Error {}

export interface ActOutcome {
  note?: string;
}

function view(el: Element): Window & typeof globalThis {
  return (el.ownerDocument.defaultView ?? window) as Window & typeof globalThis;
}

export function nextFrame(win: Window): Promise<void> {
  return new Promise((resolve) => {
    if (typeof win.requestAnimationFrame === "function") win.requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

function pointer(el: Element, type: string) {
  const win = view(el);
  const Ctor = (win.PointerEvent ?? win.MouseEvent) as typeof MouseEvent;
  el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, composed: true, button: 0, ...(type.startsWith("pointer") ? { pointerType: "mouse", isPrimary: true } : {}) } as MouseEventInit));
}

/** A full mouse press: pointer and mouse down/up, focus, then `click()` so
 * the browser's default action (toggle a checkbox, open a `<details>`,
 * show a `popovertarget`, submit a form, follow a link) runs too. */
export function press(el: Element) {
  const html = el as HTMLElement;
  pointer(el, "pointerdown");
  pointer(el, "mousedown");
  if (typeof html.focus === "function") html.focus({ preventScroll: true });
  pointer(el, "pointerup");
  pointer(el, "mouseup");
  if (typeof html.click === "function") html.click();
  else el.dispatchEvent(new (view(el).MouseEvent)("click", { bubbles: true, cancelable: true, composed: true }));
}

function nativeValueSetter(el: Element): ((value: string) => void) | null {
  const win = view(el);
  const proto =
    el.tagName === "INPUT"
      ? win.HTMLInputElement.prototype
      : el.tagName === "TEXTAREA"
        ? win.HTMLTextAreaElement.prototype
        : el.tagName === "SELECT"
          ? win.HTMLSelectElement.prototype
          : null;
  const setter = proto ? Object.getOwnPropertyDescriptor(proto, "value")?.set : undefined;
  return setter ? (value: string) => setter.call(el, value) : null;
}

function fireInput(el: Element, data: string | null, inputType: string) {
  const win = view(el);
  const event =
    typeof win.InputEvent === "function"
      ? new win.InputEvent("input", { bubbles: true, cancelable: false, composed: true, data, inputType })
      : new win.Event("input", { bubbles: true, composed: true });
  el.dispatchEvent(event);
}

function fireChange(el: Element) {
  el.dispatchEvent(new (view(el).Event)("change", { bubbles: true }));
}

/** Sets a text control's value through the prototype's setter, which
 * bypasses React's value tracker so React sees a real change, then fires
 * `input` and `change`. */
export function setText(el: Element, text: string, append = false) {
  if (isReadOnly(el)) throw new StepError("The field is read-only.");
  const html = el as HTMLElement;
  html.focus?.({ preventScroll: true });
  if (isEditableHost(el)) {
    el.textContent = append ? `${el.textContent ?? ""}${text}` : text;
    fireInput(el, text, text ? "insertText" : "deleteContentBackward");
    return;
  }
  const setter = nativeValueSetter(el);
  if (!setter || el.tagName === "SELECT") throw new StepError(`Can't type into a ${roleOf(el) ?? el.tagName.toLowerCase()}.`);
  const input = el as HTMLInputElement;
  const type = el.tagName === "INPUT" ? input.type : "textarea";
  if (["checkbox", "radio", "button", "submit", "reset", "image", "file", "range", "color"].includes(type)) {
    throw new StepError(`Can't type into an input of type "${type}".`);
  }
  const next = append ? `${input.value}${text}` : text;
  setter(next);
  fireInput(el, text || null, text ? "insertText" : "deleteContentBackward");
  fireChange(el);
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function popupOf(el: Element): Element | null {
  const ids = (el.getAttribute("aria-controls") ?? el.getAttribute("aria-owns") ?? "").trim().split(/\s+/).filter(Boolean);
  for (const id of ids) {
    const found = el.ownerDocument.getElementById(id);
    if (found) return found;
  }
  return popoverTargetOf(el);
}

function findOption(container: Element, wanted: string): Element | null {
  const options = Array.from(container.querySelectorAll('[role="option"]'));
  return (
    options.find((option) => sameText(option.getAttribute("data-value") ?? "", wanted)) ??
    options.find((option) => sameText(accessibleName(option, "option"), wanted)) ??
    null
  );
}

/** Chooses an option: a native `<select>` through its value setter and
 * `input`/`change`; an ARIA listbox or combobox by opening it if needed and
 * pressing the matching option, as a person would. */
export async function selectOption(el: Element, args: AgentStep["args"]): Promise<ActOutcome> {
  const wanted = args?.values ?? (args?.value !== undefined ? [args.value] : []);
  if (!wanted.length) throw new StepError('`select` needs `args.value` (or `args.values` for a multi-select).');

  if (el.tagName === "SELECT") {
    const select = el as HTMLSelectElement;
    const options = Array.from(select.options);
    const matches = wanted.map((value) => {
      const option = options.find((o) => o.value === value) ?? options.find((o) => sameText(o.label || o.textContent || "", value));
      if (!option) throw new StepError(`No option "${value}". Options: ${options.map((o) => JSON.stringify(o.label || o.textContent)).join(", ")}.`);
      if (option.disabled) throw new StepError(`Option "${value}" is disabled.`);
      return option;
    });
    select.focus({ preventScroll: true });
    if (select.multiple) {
      for (const option of options) option.selected = matches.includes(option);
    } else {
      if (matches.length > 1) throw new StepError("This select takes one value.");
      nativeValueSetter(select)!(matches[0]!.value);
    }
    fireInput(select, null, "insertReplacementText");
    fireChange(select);
    return {};
  }

  const role = roleOf(el);
  if (role === "option") {
    press(el);
    return {};
  }
  let popup: Element | null = role === "listbox" ? el : popupOf(el);
  if (role === "combobox" && expandedState(el) !== true) {
    press(el);
    await nextFrame(view(el));
    popup = popupOf(el) ?? popup;
  }
  if (!popup) throw new StepError("Couldn't find this control's list of options (no aria-controls).");
  for (const value of wanted) {
    let option = findOption(popup, value);
    if (!option && role === "combobox" && (el.tagName === "INPUT" || isEditableHost(el))) {
      // A filtering combobox: type the label so the option is rendered.
      setText(el, value);
      await nextFrame(view(el));
      popup = popupOf(el) ?? popup;
      option = findOption(popup, value);
    }
    if (!option) throw new StepError(`No option "${value}".`);
    if (option.getAttribute("aria-disabled") === "true") throw new StepError(`Option "${value}" is disabled.`);
    press(option);
    await nextFrame(view(el));
  }
  return {};
}

/** Sets a checkbox, radio or switch to `want` by pressing it, unless it's
 * already there. */
export function setChecked(el: Element, want: boolean): ActOutcome {
  const role = roleOf(el) ?? "";
  const current = checkedState(el, role);
  if (current === undefined) throw new StepError(`A ${role || el.tagName.toLowerCase()} can't be checked; use "press".`);
  if (current === want) return { note: want ? "already checked" : "already unchecked" };
  if (!want && role === "radio") throw new StepError("A radio button can't be unchecked; check another option in its group.");
  press(el);
  return {};
}

function closeButtonIn(container: Element): Element | null {
  const explicit = container.querySelector('[data-slot$="-close"], [data-slot="close"]');
  if (explicit) return explicit;
  const buttons = Array.from(container.querySelectorAll("button, [role='button']"));
  return buttons.find((button) => /^(close|dismiss|cancel)$/i.test(accessibleName(button))) ?? null;
}

function invokerOf(target: Element): Element | null {
  const id = target.id;
  if (!id) return null;
  const doc = target.ownerDocument;
  const escaped = id.replace(/["\\]/g, "\\$&");
  return doc.querySelector(`[popovertarget="${escaped}"], [commandfor="${escaped}"], [aria-controls~="${escaped}"]`);
}

/** Opens or closes a disclosure, dialog, popover or expandable trigger
 * through the control a person would use. */
export async function setOpen(el: Element, want: boolean): Promise<ActOutcome> {
  const tag = el.tagName;
  // <details>/<summary>: press the summary.
  const details = tag === "DETAILS" ? (el as HTMLDetailsElement) : tag === "SUMMARY" && isDetailsSummary(el) ? (el.parentElement as HTMLDetailsElement) : null;
  if (details) {
    if (details.open === want) return { note: want ? "already open" : "already closed" };
    const summary = details.querySelector(":scope > summary");
    if (summary) press(summary);
    else details.open = want;
    return {};
  }

  // An open dialog: its close button, else Escape's `cancel` event.
  const role = roleOf(el);
  if (tag === "DIALOG" || role === "dialog" || role === "alertdialog") {
    const open = tag === "DIALOG" ? (el as HTMLDialogElement).open : true;
    if (want) {
      if (open) return { note: "already open" };
      throw new StepError("Open a dialog by pressing the button that opens it.");
    }
    const close = closeButtonIn(el);
    if (close) {
      press(close);
      return {};
    }
    if (tag === "DIALOG") {
      const dialog = el as HTMLDialogElement;
      const cancel = new (view(el).Event)("cancel", { cancelable: true });
      if (dialog.dispatchEvent(cancel)) dialog.close();
      return { note: "closed as if Escape was pressed" };
    }
    el.dispatchEvent(new (view(el).KeyboardEvent)("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    return { note: "pressed Escape" };
  }

  // An open popover: its invoker, else hidePopover().
  if (el.hasAttribute("popover")) {
    const open = isPopoverOpen(el);
    if (open === want) return { note: want ? "already open" : "already closed" };
    const invoker = invokerOf(el);
    if (invoker) {
      press(invoker);
      return {};
    }
    const popover = el as HTMLElement & { showPopover?: () => void; hidePopover?: () => void };
    if (want) popover.showPopover?.();
    else popover.hidePopover?.();
    return {};
  }

  // A trigger with aria-expanded / popovertarget: press it if needed.
  const expanded = expandedState(el);
  if (expanded !== undefined || el.getAttribute("aria-haspopup")) {
    if (expanded === want) return { note: want ? "already open" : "already closed" };
    press(el);
    return {};
  }
  throw new StepError(`This ${role ?? tag.toLowerCase()} doesn't open or close; use "press".`);
}

export function submit(el: Element): ActOutcome {
  const form = el.tagName === "FORM" ? (el as HTMLFormElement) : ((el as HTMLInputElement).form ?? el.closest("form"));
  if (!form) throw new StepError("This node isn't in a form.");
  const submitter =
    (el.tagName === "BUTTON" || el.tagName === "INPUT") && (el as HTMLButtonElement).type === "submit" ? (el as HTMLButtonElement) : undefined;
  if (typeof form.requestSubmit === "function") form.requestSubmit(submitter);
  else form.dispatchEvent(new (view(el).Event)("submit", { bubbles: true, cancelable: true }));
  return {};
}

export function scroll(el: Element, to: "top" | "bottom" | "into-view" | undefined): ActOutcome {
  const html = el as HTMLElement;
  // Instant, not smooth: an agent reads the result straight away, and
  // smooth scrolling would also ignore a reduced-motion preference.
  if (to === "top" || to === "bottom") {
    if (typeof html.scrollTo === "function") html.scrollTo({ top: to === "top" ? 0 : html.scrollHeight, behavior: "instant" as ScrollBehavior });
    else html.scrollTop = to === "top" ? 0 : html.scrollHeight;
    return {};
  }
  html.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "instant" as ScrollBehavior });
  return {};
}
