/**
 * Animated reordering for a list whose items move between two visible
 * positions — TodoList's plan, when an agent re-prioritises it.
 *
 * Two paths, chosen per change:
 *
 * 1. **Element-scoped view transitions** (`element.startViewTransition()`,
 *    Chrome 147+), used by {@link ListMotion.run} when the caller can hand over
 *    the DOM change as a callback. The browser snapshots the list before and
 *    after and morphs each item between them, including the cross-fade for
 *    items that arrive or leave. Scoped to the list on purpose: a document-level
 *    `document.startViewTransition()` freezes the *whole page* for the length of
 *    the transition and makes every other in-flight transition on it skip, which
 *    is far too much blast radius for a list shuffling itself. So there is no
 *    document-level fallback.
 * 2. **FLIP with the Web Animations API** everywhere else, and for changes that
 *    arrive without a callback (React re-rendering with a new child order, or a
 *    consumer moving `<kernel-todo-item>`s by hand). Positions are cached after
 *    every change; when the order or membership changes, each surviving item is
 *    animated from its old offset back to zero and each new one fades in.
 *
 * Neither runs under `prefers-reduced-motion`, or while the list isn't
 * rendered (a collapsed `<details>`): the DOM simply changes.
 *
 * Positions are `offsetLeft`/`offsetTop` against the list (which is
 * `position: relative` for exactly this), not `getBoundingClientRect()`. Offsets
 * ignore transforms and scrolling, so a cache taken mid-animation or before the
 * page scrolled is still correct.
 *
 * Kept in lockstep with `packages/elements/src/utils/listMotion.ts`.
 */

import { prefersReducedMotion } from "./exitTransition";

interface ScopedViewTransition {
  finished: Promise<void>;
}

type ViewTransitionHost = HTMLElement & {
  startViewTransition?: (update: () => void) => ScopedViewTransition;
};

/** Whether this element can run a view transition scoped to itself. */
export function supportsScopedViewTransition(element: HTMLElement): boolean {
  return typeof (element as ViewTransitionHost).startViewTransition === "function";
}

/** `view-transition-name`s must be unique within the scope and stable across
 * the before/after snapshots, so each element keeps the one it was given. */
let nameCounter = 0;
const transitionNames = new WeakMap<Element, string>();
function transitionName(element: Element): string {
  let name = transitionNames.get(element);
  if (!name) {
    nameCounter += 1;
    name = `kernel-list-item-${nameCounter}`;
    transitionNames.set(element, name);
  }
  return name;
}

/** The class every item carries during a scoped transition, so a stylesheet can
 * time the groups with `::view-transition-group(*.kernel-list-item)`. */
export const LIST_ITEM_TRANSITION_CLASS = "kernel-list-item";

function readMs(element: Element, property: string, fallback: number): number {
  const raw = getComputedStyle(element).getPropertyValue(property).trim();
  if (!raw) return fallback;
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.endsWith("ms") ? value : value * 1000;
}

function readValue(element: Element, property: string, fallback: string): string {
  return getComputedStyle(element).getPropertyValue(property).trim() || fallback;
}

function readPx(element: Element, property: string, fallback: number): number {
  const value = parseFloat(getComputedStyle(element).getPropertyValue(property));
  return Number.isFinite(value) ? value : fallback;
}

/** A list's `<li>` items, looking through a `display: contents` custom-element
 * host (`<kernel-todo-item>`) to the `<li>` it owns, since only a box that
 * actually lays out can be measured or moved. */
export function listItemsOf(list: HTMLElement): HTMLElement[] {
  const items: HTMLElement[] = [];
  for (const child of Array.from(list.children)) {
    if (child instanceof HTMLLIElement) items.push(child);
    else {
      const inner = child.querySelector<HTMLLIElement>(":scope > li");
      if (inner) items.push(inner);
    }
  }
  return items;
}

interface Point {
  x: number;
  y: number;
}

/** The `translate` an in-flight FLIP has an item at right now. */
function paintedTranslate(element: HTMLElement): Point {
  const value = getComputedStyle(element).translate;
  if (!value || value === "none") return { x: 0, y: 0 };
  const [x = "0", y = "0"] = value.split(/\s+/);
  return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
}

export class ListMotion {
  #list: HTMLElement;
  #readItems: (list: HTMLElement) => HTMLElement[];
  #positions = new Map<HTMLElement, Point>();
  #order: HTMLElement[] = [];
  #primed = false;
  #suppressed = 0;
  #running = new Map<HTMLElement, Animation>();

  constructor(list: HTMLElement, readItems: (list: HTMLElement) => HTMLElement[]) {
    this.#list = list;
    this.#readItems = readItems;
  }

  /** Records where every item sits now. Call after any change that wasn't
   * animated, so the next one starts from the truth. */
  snapshot() {
    if (this.#suppressed > 0) return;
    const items = this.#readItems(this.#list);
    this.#positions = new Map(items.map((item) => [item, { x: item.offsetLeft, y: item.offsetTop }]));
    this.#order = items;
    this.#primed = true;
  }

  /**
   * Call after the DOM has changed. Animates when the item order or membership
   * differs from the last snapshot; otherwise just refreshes it (a status
   * change or a re-render that moved nothing costs one read per item).
   */
  play() {
    if (this.#suppressed > 0) return;
    const list = this.#list;
    if (!this.#primed || prefersReducedMotion() || !isRendered(list)) {
      this.snapshot();
      return;
    }

    const items = this.#readItems(list);
    const previous = new Set(this.#order);
    const current = new Set(items);
    const survivors = items.filter((item) => previous.has(item));
    const previousSurvivors = this.#order.filter((item) => current.has(item));
    const reordered = survivors.some((item, index) => item !== previousSurvivors[index]);
    const membershipChanged = survivors.length !== items.length || survivors.length !== this.#order.length;
    if (!reordered && !membershipChanged) {
      this.snapshot();
      return;
    }

    // Where each survivor is *painted* now: its cached layout position plus
    // any translate a FLIP still in flight has it at. Read before cancelling,
    // so interrupting a move continues from where the eye last saw it.
    const first = new Map<HTMLElement, Point>();
    for (const item of survivors) {
      const cached = this.#positions.get(item) ?? { x: item.offsetLeft, y: item.offsetTop };
      const painted = this.#running.has(item) ? paintedTranslate(item) : { x: 0, y: 0 };
      first.set(item, { x: cached.x + painted.x, y: cached.y + painted.y });
    }
    for (const animation of this.#running.values()) animation.cancel();
    this.#running.clear();

    const moveDuration = readMs(list, "--kernel-duration-slow", 320);
    // Travel between two visible positions accelerates then decelerates
    // (tokens.css's own guidance for on-screen movement); arrivals decelerate.
    const moveEasing = readValue(list, "--kernel-ease-in-out", "ease-in-out");
    const enterDuration = readMs(list, "--kernel-duration-enter", 200);
    const enterEasing = readValue(list, "--kernel-ease-out", "ease-out");
    const enterOffset = readPx(list, "--kernel-translate-enter", 6);

    for (const item of items) {
      const last = { x: item.offsetLeft, y: item.offsetTop };
      const from = first.get(item);
      let animation: Animation | null = null;
      if (from) {
        const dx = from.x - last.x;
        const dy = from.y - last.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        // `translate`, not `transform`, so nothing the stylesheet puts on the
        // item's own `transform` is overwritten for the duration.
        animation = item.animate(
          [{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }],
          { duration: moveDuration, easing: moveEasing },
        );
      } else {
        animation = item.animate(
          [
            { opacity: 0, translate: `0 ${enterOffset}px` },
            { opacity: 1, translate: "0 0" },
          ],
          { duration: enterDuration, easing: enterEasing, fill: "backwards" },
        );
      }
      this.#running.set(item, animation);
      const settled = animation;
      settled.onfinish = settled.oncancel = () => {
        if (this.#running.get(item) === settled) this.#running.delete(item);
      };
    }

    this.snapshot();
  }

  /**
   * Runs `mutate` — which must change the list's DOM synchronously (in React,
   * wrap the state update in `flushSync`) — and animates the result: an
   * element-scoped view transition where supported, a measured FLIP otherwise,
   * nothing under reduced motion. Resolves when the animation has finished.
   */
  async run(mutate: () => void): Promise<void> {
    const list = this.#list;

    if (prefersReducedMotion() || !isRendered(list)) {
      this.#withSuppressed(mutate);
      this.snapshot();
      return;
    }

    if (!supportsScopedViewTransition(list)) {
      // Measured FLIP: a fresh snapshot right before the change, so nothing a
      // stale cache missed (a resize, a font load) can leak into the motion.
      this.snapshot();
      this.#withSuppressed(mutate);
      this.play();
      await Promise.all(Array.from(this.#running.values(), (a) => a.finished.catch(() => {})));
      return;
    }

    // The FLIP path is suppressed for the whole transition: the view
    // transition animates this change, and a FLIP on top would double it.
    this.#suppressed += 1;
    const tag = () => {
      for (const item of this.#readItems(list)) {
        item.style.setProperty("view-transition-name", transitionName(item));
        item.style.setProperty("view-transition-class", LIST_ITEM_TRANSITION_CLASS);
      }
    };
    let mutated = false;
    try {
      for (const animation of this.#running.values()) animation.finish();
      tag();
      const transition = (list as ViewTransitionHost).startViewTransition!(() => {
        mutated = true;
        mutate();
        // Items that arrived with the change need names before the browser
        // captures the new state, or they'd be painted into the list's own
        // snapshot instead of fading in on their own.
        tag();
      });
      await transition.finished;
    } catch {
      // A transition can be skipped or abort; the DOM change still has to land.
    } finally {
      if (!mutated) mutate();
      for (const item of this.#readItems(list)) {
        item.style.removeProperty("view-transition-name");
        item.style.removeProperty("view-transition-class");
      }
      this.#suppressed -= 1;
      this.snapshot();
    }
  }

  /** Cancels anything in flight. */
  destroy() {
    for (const animation of this.#running.values()) animation.cancel();
    this.#running.clear();
  }

  #withSuppressed(mutate: () => void) {
    this.#suppressed += 1;
    try {
      mutate();
    } finally {
      this.#suppressed -= 1;
    }
  }
}

function isRendered(element: HTMLElement): boolean {
  // No Web Animations (jsdom, very old engines): nothing can move, so treat it
  // like an unrendered list and just keep the cache current.
  if (typeof element.animate !== "function") return false;
  if (typeof element.checkVisibility === "function") return element.checkVisibility();
  return element.getClientRects().length > 0;
}
