import { KernelElement, kernelClass } from "../../base";
import "./InputOTP.css";

/**
 * `<kernel-input-otp>` — a row of real `<input>` elements sharing one
 * logical value: the concatenated code string. Unlike RadioGroup's
 * arrow-key roving, focus here advances automatically as each digit is
 * typed, mirroring how native OTP autofill and every OTP UI users
 * already know behaves. Mirrors `@kernelui/react`'s `<InputOTP>`.
 *
 * Attributes: `length` (default 6), `value`, `label`, `disabled`.
 * Dispatches a real, bubbling `change` event on every edit, and a
 * `complete` CustomEvent (`event.detail.value`) once when the code
 * first reaches `length` characters — not on every subsequent event
 * where it's still complete, same as the React version's `onComplete`.
 */
export class KernelInputOTP extends KernelElement {
  private cells: HTMLInputElement[] = [];
  private wasComplete = false;
  /** Set while this element is writing its OWN `value` attribute back
   * (after a keystroke) so `syncAttr` doesn't treat that as an EXTERNAL
   * change and destructively rebuild the cells mid-type, which would
   * drop focus and the user's cursor position. */
  private isInternalValueUpdate = false;

  static get observedAttributes() {
    return ["length", "value", "label", "disabled"];
  }

  private get length(): number {
    return Number(this.getAttribute("length")) || 6;
  }

  connectedCallback() {
    if (this.native) return;
    const fieldset = document.createElement("fieldset");
    fieldset.className = kernelClass("InputOTP");

    const cellsWrap = document.createElement("div");
    cellsWrap.className = kernelClass("InputOTP", "cells");
    fieldset.append(cellsWrap);

    this.native = fieldset;
    this.append(fieldset);
    this.rebuildCells();
    this.syncAllAttrs();
  }

  private rebuildCells() {
    const fieldset = this.native as HTMLFieldSetElement | null;
    const cellsWrap = fieldset?.querySelector(`.${kernelClass("InputOTP", "cells")}`);
    if (!fieldset || !cellsWrap) return;

    cellsWrap.replaceChildren();
    this.cells = [];
    const length = this.length;
    const currentValue = this.getAttribute("value") ?? "";

    for (let index = 0; index < length; index++) {
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";
      input.maxLength = 1;
      input.autocomplete = "one-time-code";
      input.className = kernelClass("InputOTP", "cell");
      input.setAttribute("aria-label", `Digit ${index + 1} of ${length}`);
      const digit = currentValue[index] ?? "";
      input.value = digit;
      if (digit) input.setAttribute("data-filled", "");

      input.addEventListener("input", () => this.handleInput(index));
      input.addEventListener("keydown", (event) => this.handleKeyDown(index, event));
      input.addEventListener("paste", (event) => this.handlePaste(index, event));

      cellsWrap.append(input);
      this.cells.push(input);
    }
  }

  private populateCells(code: string) {
    this.cells.forEach((cell, index) => {
      const digit = code[index] ?? "";
      cell.value = digit;
      if (digit) cell.setAttribute("data-filled", "");
      else cell.removeAttribute("data-filled");
    });
  }

  private setValueAttribute(next: string) {
    this.isInternalValueUpdate = true;
    this.setAttribute("value", next);
    this.isInternalValueUpdate = false;
  }

  private afterChange() {
    const code = this.cells.map((cell) => cell.value).join("");
    this.setValueAttribute(code);
    this.dispatchEvent(new Event("change", { bubbles: true }));
    if (code.length === this.length && !this.wasComplete) {
      this.wasComplete = true;
      this.dispatchEvent(new CustomEvent("complete", { detail: { value: code }, bubbles: true }));
    } else if (code.length < this.length) {
      this.wasComplete = false;
    }
  }

  private handleInput(index: number) {
    const cell = this.cells[index];
    if (!cell) return;
    const digit = cell.value.replace(/[^0-9]/g, "").slice(-1);
    cell.value = digit;
    if (digit) cell.setAttribute("data-filled", "");
    else cell.removeAttribute("data-filled");
    this.afterChange();
    if (digit && index < this.length - 1) this.cells[index + 1]?.focus();
  }

  private handleKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === "Backspace") {
      const cell = this.cells[index];
      if (cell?.value) {
        cell.value = "";
        cell.removeAttribute("data-filled");
        this.afterChange();
        return;
      }
      if (index > 0) {
        event.preventDefault();
        const previous = this.cells[index - 1];
        if (previous) {
          previous.value = "";
          previous.removeAttribute("data-filled");
          this.afterChange();
          previous.focus();
        }
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      this.cells[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < this.length - 1) {
      event.preventDefault();
      this.cells[index + 1]?.focus();
    }
  }

  private handlePaste(index: number, event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData("text").replace(/[^0-9]/g, "") ?? "";
    if (!pasted) return;
    event.preventDefault();

    let lastFilled = index;
    for (let i = 0; i < pasted.length && index + i < this.length; i++) {
      const cell = this.cells[index + i];
      if (!cell) break;
      cell.value = pasted[i] ?? "";
      cell.setAttribute("data-filled", "");
      lastFilled = index + i;
    }
    this.afterChange();
    this.cells[Math.min(lastFilled + 1, this.length - 1)]?.focus();
  }

  protected syncAttr(name: string, value: string | null) {
    const fieldset = this.native as HTMLFieldSetElement | null;
    if (!fieldset) return;

    switch (name) {
      case "length":
        this.rebuildCells();
        break;
      case "value":
        if (!this.isInternalValueUpdate) this.populateCells(value ?? "");
        break;
      case "label": {
        let legend = fieldset.querySelector("legend");
        if (value === null) {
          legend?.remove();
        } else {
          if (!legend) {
            legend = document.createElement("legend");
            legend.className = kernelClass("InputOTP", "legend");
            fieldset.insertBefore(legend, fieldset.firstChild);
          }
          legend.textContent = value;
        }
        break;
      }
      case "disabled":
        fieldset.disabled = value !== null;
        break;
    }
  }
}

customElements.define("kernel-input-otp", KernelInputOTP);
