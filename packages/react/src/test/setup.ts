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

Object.defineProperty(HTMLDialogElement.prototype, "open", {
  get(this: HTMLDialogElement) {
    return this.hasAttribute("open");
  },
  set(this: HTMLDialogElement, value: boolean) {
    if (value) this.setAttribute("open", "");
    else this.removeAttribute("open");
  },
});
