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
  byId,
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
  if (["range", "color"].includes(type)) throw new StepError(`Can't type into an input of type "${type}"; use "setValue".`);
  if (["checkbox", "radio", "button", "submit", "reset", "image", "file"].includes(type)) {
    throw new StepError(`Can't type into an input of type "${type}".`);
  }
  const next = append ? `${input.value}${text}` : text;
  setter(next);
  fireInput(el, text || null, text ? "insertText" : "deleteContentBackward");
  fireChange(el);
}

/** Input types whose value is set whole rather than typed. */
const VALUE_TYPES = new Set(["range", "number", "date", "datetime-local", "month", "time", "week", "color"]);

function checkBounds(value: number, min: string | null, max: string | null) {
  if (min !== null && min !== "" && Number.isFinite(Number(min)) && value < Number(min)) throw new StepError(`${value} is below the minimum (${min}).`);
  if (max !== null && max !== "" && Number.isFinite(Number(max)) && value > Number(max)) throw new StepError(`${value} is above the maximum (${max}).`);
}

/** Sets a control's value in one step: a range, number, date/time or colour
 * input through the native setter plus `input`/`change` (the browser
 * sanitises it first, so a range snaps to its step); an ARIA slider or
 * spinbutton with arrow keys, the way a keyboard user would; text fields
 * and selects as `type` and `select` would. */
export async function setValue(el: Element, args: AgentStep["args"]): Promise<ActOutcome> {
  const raw = args?.value as unknown;
  if (raw === undefined || raw === null || raw === "") throw new StepError("`setValue` needs `args.value`.");
  const wanted = String(raw);
  if (isReadOnly(el)) throw new StepError("The field is read-only.");

  if (el.tagName === "INPUT" && VALUE_TYPES.has((el as HTMLInputElement).type)) {
    const input = el as HTMLInputElement;
    const type = input.type;
    if (type === "range" || type === "number") {
      const number = Number(wanted);
      if (!Number.isFinite(number)) throw new StepError(`"${wanted}" isn't a number.`);
      checkBounds(number, input.getAttribute("min"), input.getAttribute("max"));
    }
    // Ask a detached input of the same type what the browser makes of the
    // value, so an invalid one fails without clearing the real field.
    const probe = el.ownerDocument.createElement("input");
    probe.type = type;
    for (const attr of ["min", "max", "step"]) {
      const value = input.getAttribute(attr);
      if (value !== null) probe.setAttribute(attr, value);
    }
    probe.value = wanted;
    if (probe.value === "") throw new StepError(`"${wanted}" isn't a valid ${type} value.`);
    input.focus({ preventScroll: true });
    nativeValueSetter(el)!(probe.value);
    fireInput(el, null, "insertReplacementText");
    fireChange(el);
    return input.value !== wanted ? { note: `set to ${input.value}` } : {};
  }
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || isEditableHost(el)) {
    setText(el, wanted);
    return {};
  }
  if (el.tagName === "SELECT") return selectOption(el, { value: wanted });

  const role = roleOf(el);
  if (role === "slider" || role === "spinbutton") {
    const target = Number(wanted);
    if (!Number.isFinite(target)) throw new StepError(`"${wanted}" isn't a number.`);
    checkBounds(target, el.getAttribute("aria-valuemin"), el.getAttribute("aria-valuemax"));
    const now = () => Number(el.getAttribute("aria-valuenow"));
    if (!Number.isFinite(now())) throw new StepError(`This ${role} has no aria-valuenow to step from.`);
    (el as HTMLElement).focus?.({ preventScroll: true });
    const [up, down] = role === "slider" ? ["ArrowRight", "ArrowLeft"] : ["ArrowUp", "ArrowDown"];
    for (let i = 0; i < 1000; i++) {
      const before = now();
      if (before === target) return {};
      const rising = target > before;
      pressKey(el, rising ? up! : down!);
      if (now() === before) await nextFrame(view(el));
      const after = now();
      if (after === before) throw new StepError(`The ${role} didn't respond to arrow keys (stuck at ${before}).`);
      // Stepped past the target: the step size doesn't land on it exactly.
      if (rising ? after > target : after < target) return { note: `set to ${after}, the nearest step` };
    }
    throw new StepError(`Gave up stepping the ${role} toward ${target}.`);
  }
  throw new StepError(`A ${role ?? el.tagName.toLowerCase()} has no value to set.`);
}

const KEY_CODES: Record<string, string> = {
  " ": "Space",
  Enter: "Enter",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

const MODIFIERS: Record<string, "shiftKey" | "ctrlKey" | "altKey" | "metaKey"> = {
  shift: "shiftKey",
  control: "ctrlKey",
  ctrl: "ctrlKey",
  alt: "altKey",
  meta: "metaKey",
};

/** Parses `"Enter"`, `"Shift+Tab"` or `"a"` into a key and modifiers. */
export function parseKey(spec: string): { key: string; modifiers: Partial<Record<"shiftKey" | "ctrlKey" | "altKey" | "metaKey", boolean>> } {
  if (typeof spec !== "string" || !spec || spec.length > 40) throw new StepError('`key` needs `args.key`, e.g. "Enter", "Escape" or "Shift+Tab".');
  const parts = spec === "+" ? ["+"] : spec.split("+");
  const key = parts.pop() || "+";
  const modifiers: Partial<Record<"shiftKey" | "ctrlKey" | "altKey" | "metaKey", boolean>> = {};
  for (const part of parts) {
    const flag = MODIFIERS[part.toLowerCase()];
    if (!flag) throw new StepError(`Unknown modifier "${part}" in "${spec}".`);
    modifiers[flag] = true;
  }
  const normalized = key === "Space" ? " " : key === "Esc" ? "Escape" : key;
  if (normalized.length !== 1 && !KEY_CODES[normalized] && !/^F([1-9]|1[0-2])$/.test(normalized)) {
    throw new StepError(`Unknown key "${key}". Use a single character or one of: ${Object.keys(KEY_CODES).filter((k) => k !== " ").join(", ")}, Space.`);
  }
  return { key: normalized, modifiers };
}

/** Dispatches keydown/keyup for one key on the element, so the page's own
 * key handlers run (committing a TagInput tag, moving a roving focus).
 * Script-made key events don't trigger browser default actions such as
 * implicit form submission or typing a character; use `type` and `submit`
 * for those. */
export function pressKey(el: Element, spec: string): ActOutcome {
  const { key, modifiers } = parseKey(spec);
  const win = view(el);
  const code = KEY_CODES[key] ?? (key.length === 1 && /[a-z]/i.test(key) ? `Key${key.toUpperCase()}` : key.length === 1 && /\d/.test(key) ? `Digit${key}` : key);
  const init: KeyboardEventInit = { key, code, bubbles: true, cancelable: true, composed: true, ...modifiers };
  const html = el as HTMLElement;
  if (el.ownerDocument.activeElement !== el) html.focus?.({ preventScroll: true });
  const proceed = el.dispatchEvent(new win.KeyboardEvent("keydown", init));
  el.dispatchEvent(new win.KeyboardEvent("keyup", init));
  return proceed ? {} : { note: "the page handled the key" };
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function popupOf(el: Element): Element | null {
  const ids = (el.getAttribute("aria-controls") ?? el.getAttribute("aria-owns") ?? "").trim().split(/\s+/).filter(Boolean);
  for (const id of ids) {
    const found = byId(el, id);
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

function matches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

/** Closes a select's open picker (a customizable `appearance: base-select`
 * one a person opened), as choosing an option in it would. Setting the
 * value from script leaves it open, and no API closes it, but showing an
 * auto popover light-dismisses it. The probe sits inside the select's own
 * open popover, if any, so that popover stays open. */
function closePicker(select: HTMLSelectElement) {
  if (!matches(select, ":open")) return;
  const doc = select.ownerDocument;
  const probe = doc.createElement("div") as HTMLElement & { showPopover?: () => void; hidePopover?: () => void };
  if (typeof probe.showPopover !== "function") return;
  probe.setAttribute("popover", "auto");
  probe.setAttribute("data-kernel-agent-ignore", "");
  probe.style.cssText = "position:fixed;inset:auto;width:0;height:0;padding:0;border:0;overflow:hidden";
  let host: Element | null = select.parentElement;
  while (host && !(host.hasAttribute("popover") && matches(host, ":popover-open")) && host.tagName !== "DIALOG") host = host.parentElement;
  (host ?? doc.body).append(probe);
  try {
    probe.showPopover!();
    probe.hidePopover!();
  } catch {
    /* no popover support */
  } finally {
    probe.remove();
  }
}

/** Opens or closes an ARIA combobox's popup. A click is the first try, but
 * many comboboxes open on focus and ignore a click on an already-focused
 * input, so the APG key follows if it didn't take: ArrowDown to open,
 * Escape to close. */
async function toggleCombobox(el: Element, want: boolean): Promise<ActOutcome> {
  const win = view(el);
  press(el);
  await nextFrame(win);
  if (expandedState(el) === want) return {};
  pressKey(el, want ? "ArrowDown" : "Escape");
  await nextFrame(win);
  if (expandedState(el) !== want && expandedState(el) !== undefined) {
    throw new StepError(`The combobox didn't ${want ? "open" : "close"} on click or ${want ? "ArrowDown" : "Escape"}.`);
  }
  return {};
}

/** Chooses an option: a native `<select>` through its value setter and
 * `input`/`change`; an ARIA listbox or combobox by opening it if needed and
 * pressing the matching option, as a person would. */
export async function selectOption(el: Element, args: AgentStep["args"]): Promise<ActOutcome> {
  const wanted = (args?.values ?? (args?.value !== undefined ? [args.value] : [])).map(String);
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
    closePicker(select);
    return {};
  }

  const role = roleOf(el);
  if (role === "option") {
    press(el);
    return {};
  }
  let popup: Element | null = role === "listbox" ? el : popupOf(el);
  if (role === "combobox" && expandedState(el) !== true) {
    await toggleCombobox(el, true);
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
  const scope = (target.getRootNode?.() ?? target.ownerDocument) as ParentNode;
  const escaped = id.replace(/["\\]/g, "\\$&");
  return scope.querySelector(`[popovertarget="${escaped}"], [commandfor="${escaped}"], [aria-controls~="${escaped}"]`);
}

/** Resolves once a `<dialog>` has really closed (`open` gone, or its
 * `close` event), or with `false` after `timeout` ms. Closing goes through
 * the page's own code: Kernel's Dialog holds the native `close()` until its
 * exit transition ends, and an app may veto the close entirely, so the
 * press returning is not the dialog closing. Waiting on the dialog itself,
 * rather than on how long the page looks busy, keeps a slow machine from
 * reading the snapshot mid-exit. */
function dialogClosed(dialog: HTMLDialogElement, timeout = 3000): Promise<boolean> {
  if (!dialog.open || !dialog.isConnected) return Promise.resolve(true);
  const win = view(dialog);
  return new Promise((resolve) => {
    let observer: MutationObserver | null = null;
    const done = (closed: boolean) => {
      observer?.disconnect();
      dialog.removeEventListener("close", onClose);
      clearTimeout(timer);
      resolve(closed);
    };
    const onClose = () => done(true);
    dialog.addEventListener("close", onClose);
    if (typeof win.MutationObserver === "function") {
      observer = new win.MutationObserver(() => {
        if (!dialog.open || !dialog.isConnected) done(true);
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
      if (dialog.parentNode) observer.observe(dialog.parentNode, { childList: true });
    }
    const timer = setTimeout(() => done(!dialog.open || !dialog.isConnected), timeout);
  });
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
      if (tag === "DIALOG" && !(await dialogClosed(el as HTMLDialogElement))) {
        throw new StepError("Pressed the dialog's close button, but the dialog stayed open (the page may have cancelled the close).");
      }
      return {};
    }
    if (tag === "DIALOG") {
      const dialog = el as HTMLDialogElement;
      const cancel = new (view(el).Event)("cancel", { cancelable: true });
      if (dialog.dispatchEvent(cancel)) dialog.close();
      if (!(await dialogClosed(dialog))) {
        throw new StepError("Asked the dialog to close as Escape would, but it stayed open (the page may have cancelled the close).");
      }
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

  if (tag === "SELECT") throw new StepError('A select opens its own picker; choose an option with "select" and `args.value`.');

  // A trigger with aria-expanded / popovertarget: press it if needed.
  const expanded = expandedState(el);
  if (expanded !== undefined || el.getAttribute("aria-haspopup")) {
    if (expanded === want) return { note: want ? "already open" : "already closed" };
    if (role === "combobox") return toggleCombobox(el, want);
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
