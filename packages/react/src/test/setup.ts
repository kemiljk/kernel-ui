import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

// jsdom ships no `PointerEvent`, so Testing Library's `fireEvent.pointerDown`
// silently degrades to a bare `Event` and drops `clientX`/`clientY` — a
// gesture test would then read every coordinate as `undefined`. Subclassing
// `MouseEvent` is enough: it already carries the coordinates, and the pointer
// fields Kernel's gestures read are the two added here.
if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  globalThis.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
}

Object.defineProperty(HTMLDialogElement.prototype, "open", {
  get(this: HTMLDialogElement) {
    return this.hasAttribute("open");
  },
  set(this: HTMLDialogElement, value: boolean) {
    if (value) this.setAttribute("open", "");
    else this.removeAttribute("open");
  },
});
