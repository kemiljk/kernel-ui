import { computeAccessibleDescription, computeAccessibleName } from "dom-accessibility-api";
import { afterEach, describe, expect, it } from "vitest";
import "../../elements/src/index";

// A Custom Element host is a generic wrapper: `aria-label` left on
// `<kernel-switch>` names nothing, because assistive tech lands on the real
// `<button role="switch">` inside it. Every element that wraps a native
// control hands `aria-label`, `aria-labelledby` and `aria-describedby` to
// that control (KernelElement.ariaTarget()). React needs no equivalent:
// its props land on the native element directly.

/** Tag (with any required attributes) → selector for the control that should
 * carry the forwarded attributes. */
const cases: Array<[markup: string, control: string]> = [
  [`<kernel-button>x</kernel-button>`, "button"],
  [`<kernel-toggle>B</kernel-toggle>`, "button[aria-pressed]"],
  [`<kernel-switch></kernel-switch>`, "button[role=switch]"],
  [`<kernel-checkbox></kernel-checkbox>`, "input[type=checkbox]"],
  [`<kernel-text-field label="Email"></kernel-text-field>`, "input"],
  [`<kernel-textarea label="Notes"></kernel-textarea>`, "textarea"],
  [`<kernel-select label="Size"><option>S</option></kernel-select>`, "select"],
  [`<kernel-number-field label="Qty"></kernel-number-field>`, "input"],
  [`<kernel-slider label="Volume"></kernel-slider>`, "input[type=range]"],
  [`<kernel-tag-input label="Tags"></kernel-tag-input>`, "input"],
  [`<kernel-color-picker label="Colour"></kernel-color-picker>`, "input[type=color]"],
  [`<kernel-combobox label="Fruit"></kernel-combobox>`, "input"],
  [`<kernel-file-upload label="Files"></kernel-file-upload>`, "input[type=file]"],
  [`<kernel-composer></kernel-composer>`, "textarea"],
  [`<kernel-input-otp label="Code"></kernel-input-otp>`, "fieldset"],
  [`<kernel-radio-group label="Plan"></kernel-radio-group>`, "fieldset"],
  [`<kernel-progress value="10"></kernel-progress>`, "progress"],
  [`<kernel-usage-meter label="Storage" value="1"></kernel-usage-meter>`, "meter"],
  [`<kernel-nav></kernel-nav>`, "nav"],
  [`<kernel-sidebar></kernel-sidebar>`, "aside"],
  [`<kernel-tabs-list></kernel-tabs-list>`, "[role=tablist]"],
  [`<kernel-scroll-area></kernel-scroll-area>`, ".kernel-ScrollArea-root"],
  [`<kernel-table></kernel-table>`, "table"],
];

function mount(markup: string): HTMLElement {
  document.body.innerHTML = markup;
  return document.body.firstElementChild as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ARIA forwarding from element hosts", () => {
  it.each(cases)("%s forwards aria-label, -labelledby and -describedby", (markup, control) => {
    const host = mount(markup.replace(/^<([\w-]+)/, `<$1 aria-label="Named" aria-labelledby="ext" aria-describedby="hint"`));
    const target = host.querySelector(control)!;
    expect(target, control).not.toBeNull();
    expect(target.getAttribute("aria-label")).toBe("Named");
    expect(target.getAttribute("aria-labelledby")).toBe("ext");
    expect(target.getAttribute("aria-describedby")?.split(" ")).toContain("hint");
  });

  it.each(cases)("%s follows later changes and removals", (markup, control) => {
    const host = mount(markup);
    const target = host.querySelector(control)!;
    host.setAttribute("aria-labelledby", "a");
    expect(target.getAttribute("aria-labelledby")).toBe("a");
    host.removeAttribute("aria-labelledby");
    expect(target.hasAttribute("aria-labelledby")).toBe(false);
    host.setAttribute("aria-describedby", "d");
    expect(target.getAttribute("aria-describedby")?.split(" ")).toContain("d");
    host.removeAttribute("aria-describedby");
    expect(target.getAttribute("aria-describedby") ?? "").not.toContain("d");
  });

  it("names a bare switch from the host's aria-label", () => {
    const host = mount(`<kernel-switch aria-label="Bill yearly"></kernel-switch>`);
    expect(computeAccessibleName(host.querySelector("[role=switch]")!)).toBe("Bill yearly");
  });

  it("names a switch from an external label via aria-labelledby", () => {
    document.body.innerHTML = `<span id="dm">Dark mode</span><kernel-switch aria-labelledby="dm"></kernel-switch>`;
    expect(computeAccessibleName(document.querySelector("[role=switch]")!)).toBe("Dark mode");
  });

  it("keeps a field's own hint and error ids ahead of the author's", () => {
    document.body.innerHTML = `<p id="extra">Shown on invoices</p>
      <kernel-text-field label="Email" description="Work address" invalid error-message="Required" aria-describedby="extra"></kernel-text-field>`;
    const input = document.querySelector("kernel-text-field input")!;
    // The error replaces the description while it shows (the description
    // element isn't rendered then), so the field contributes one id.
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toEqual([`${input.id}-error`, "extra"]);
    expect(computeAccessibleDescription(input)).toContain("Shown on invoices");

    const host = document.querySelector("kernel-text-field")!;
    host.removeAttribute("invalid");
    expect(input.getAttribute("aria-describedby")!.split(" ")).toEqual([`${input.id}-description`, "extra"]);
  });

  it("falls back to the composer's placeholder, then 'Message', when aria-label goes", () => {
    const host = mount(`<kernel-composer placeholder="Ask anything" aria-label="Prompt"></kernel-composer>`);
    const textarea = host.querySelector("textarea")!;
    expect(textarea.getAttribute("aria-label")).toBe("Prompt");
    host.removeAttribute("aria-label");
    expect(textarea.getAttribute("aria-label")).toBe("Ask anything");
    host.removeAttribute("placeholder");
    expect(textarea.getAttribute("aria-label")).toBe("Message");
  });

  it("lets a progress host's aria-label win over its label attribute", () => {
    const host = mount(`<kernel-progress label="Uploading" aria-label="Uploading report.pdf"></kernel-progress>`);
    const progress = host.querySelector("progress")!;
    expect(progress.getAttribute("aria-label")).toBe("Uploading report.pdf");
    host.removeAttribute("aria-label");
    expect(progress.getAttribute("aria-label")).toBe("Uploading");
  });

  it("forwards on a radio item and a suggestion chip", () => {
    document.body.innerHTML = `<kernel-radio-group label="Plan"><kernel-radio-group-item value="a" aria-describedby="p">A</kernel-radio-group-item></kernel-radio-group>
      <kernel-suggestion><kernel-suggestion-item aria-label="Try: summarise">Summarise</kernel-suggestion-item></kernel-suggestion>`;
    expect(document.querySelector("input[type=radio]")!.getAttribute("aria-describedby")).toBe("p");
    expect(document.querySelector("kernel-suggestion-item button")!.getAttribute("aria-label")).toBe("Try: summarise");
  });
});
