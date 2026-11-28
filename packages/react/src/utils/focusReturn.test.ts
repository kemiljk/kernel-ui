import { afterEach, describe, expect, it } from "vitest";
import { captureReturnTarget, focusableWithin, restoreFocusIfLost, trackPressedControl } from "./focusReturn";

afterEach(() => {
  document.body.replaceChildren();
  (document.activeElement as HTMLElement | null)?.blur?.();
});

/** WebKit's click: a pointerdown on the button that never focuses it. */
function pressWithoutFocus(element: Element) {
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
}

describe("focusReturn", () => {
  it("captures the focused element when there is one", () => {
    trackPressedControl();
    const button = document.body.appendChild(document.createElement("button"));
    button.focus();
    expect(captureReturnTarget()).toBe(button);
  });

  it("falls back to the control a pointer pressed when focus is on <body> (WebKit)", () => {
    trackPressedControl();
    const button = document.body.appendChild(document.createElement("button"));
    const label = button.appendChild(document.createElement("span"));
    pressWithoutFocus(label);
    expect(document.activeElement).toBe(document.body);
    expect(captureReturnTarget()).toBe(button);
  });

  it("finds a pressed control inside an open shadow root", () => {
    trackPressedControl();
    const host = document.body.appendChild(document.createElement("div"));
    const button = host.attachShadow({ mode: "open" }).appendChild(document.createElement("button"));
    pressWithoutFocus(button);
    expect(captureReturnTarget()).toBe(button);
  });

  it("returns nothing for a press on plain content", () => {
    trackPressedControl();
    const text = document.body.appendChild(document.createElement("p"));
    pressWithoutFocus(text);
    expect(captureReturnTarget()).toBeNull();
  });

  it("restores focus only when it was lost", () => {
    const opener = document.body.appendChild(document.createElement("button"));
    const surface = document.body.appendChild(document.createElement("div"));
    const inside = surface.appendChild(document.createElement("button"));
    const elsewhere = document.body.appendChild(document.createElement("input"));

    // Lost to <body>: restored.
    restoreFocusIfLost(opener, surface);
    expect(document.activeElement).toBe(opener);

    // Still inside the closing surface: restored.
    inside.focus();
    restoreFocusIfLost(opener, surface);
    expect(document.activeElement).toBe(opener);

    // Moved somewhere on purpose: left alone.
    elsewhere.focus();
    restoreFocusIfLost(opener, surface);
    expect(document.activeElement).toBe(elsewhere);
  });

  it("ignores a disconnected target", () => {
    const opener = document.createElement("button");
    restoreFocusIfLost(opener);
    expect(document.activeElement).toBe(document.body);
  });

  it("focusableWithin looks through a wrapper to its control", () => {
    const wrapper = document.body.appendChild(document.createElement("div"));
    const button = wrapper.appendChild(document.createElement("button"));
    expect(focusableWithin(wrapper)).toBe(button);
    expect(focusableWithin(button)).toBe(button);
    expect(focusableWithin(null)).toBeNull();
  });
});
