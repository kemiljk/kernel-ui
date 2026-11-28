import { afterEach, describe, expect, it } from "vitest";
import { accessibleName, assertPattern, checkPage, checkPattern, formatResult, PatternAssertionError, type CheckResult } from "../src/index.js";
import * as f from "./fixtures.js";

const rules = (result: CheckResult, severity: "error" | "warning" = "error") =>
  [...new Set(result.issues.filter((issue) => issue.severity === severity).map((issue) => issue.rule))].sort();
const skipped = (result: CheckResult) => result.skipped.map((s) => s.rule);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("accessibleName", () => {
  it("follows aria-labelledby, aria-label, labels, alt and content in order", () => {
    const host = f.mount(`
      <span id="a">From</span><span id="b">labelledby</span>
      <button id="x" aria-labelledby="a b" aria-label="ignored">text</button>
      <button id="y" aria-label="Label">text</button>
      <label for="i">Email</label><input id="i">
      <label>Wrapped <input id="w"></label>
      <button id="img"><img alt="Save"></button>
      <button id="hidden"><span aria-hidden="true">★</span><span class="sr">Favourite</span></button>
      <fieldset id="fs"><legend>Plan</legend></fieldset>
      <input id="ph" placeholder="Search">`);
    const name = (id: string) => accessibleName(host.querySelector(`#${id}`)!);
    expect(name("x")).toBe("From labelledby");
    expect(name("y")).toBe("Label");
    expect(name("i")).toBe("Email");
    expect(name("w")).toBe("Wrapped");
    expect(name("img")).toBe("Save");
    expect(name("hidden")).toBe("Favourite");
    expect(name("fs")).toBe("Plan");
    expect(name("ph")).toBe("Search");
  });

  it("names an element inside a hidden container from its own content", () => {
    const host = f.mount(`<div hidden><button id="b">Inside</button></div>`);
    expect(accessibleName(host.querySelector("#b")!)).toBe("Inside");
  });
});

describe("tabs", () => {
  it("passes a correct, keyboard-operable tablist", async () => {
    const result = await checkPattern(f.goodTabs(), "tabs");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["tabs/one-selected", "tabs/roving-tabindex", "tabs/arrow-next", "tabs/home-end", "tabs/wraps"]));
    expect(result.environment).toBe("jsdom");
  });

  it("restores the original selection after the keyboard checks", async () => {
    const host = f.goodTabs();
    await checkPattern(host, "tabs");
    expect(host.querySelector("#t1")!.getAttribute("aria-selected")).toBe("true");
  });

  it("reports selection, reference, roving and keyboard failures", async () => {
    const result = await checkPattern(f.badTabs(), "tabs");
    expect(rules(result)).toEqual(
      expect.arrayContaining(["tabs/arrow-next", "tabs/controls-panel", "tabs/one-selected", "tabs/roving-tabindex", "tabs/idrefs"]),
    );
    expect(rules(result, "warning")).toContain("tabs/tablist-name");
    expect(result.passed).toBe(false);
  });

  it("skips interaction checks with interactions: false", async () => {
    const result = await checkPattern(f.badTabs(), "tabs", { interactions: false });
    expect(rules(result)).not.toContain("tabs/arrow-next");
    expect(skipped(result)).toContain("tabs/keyboard");
  });

  it("ignores rules and whole patterns", async () => {
    const result = await checkPattern(f.badTabs(), "tabs", { ignore: ["tabs/one-selected", "tabs/roving-tabindex"] });
    expect(rules(result)).not.toContain("tabs/one-selected");
    const all = await checkPattern(f.badTabs(), "tabs", { ignore: ["tabs"] });
    expect(all.issues).toEqual([]);
  });

  it("reports a missing pattern", async () => {
    const result = await checkPattern(f.mount(`<p>nothing</p>`), "tabs");
    expect(rules(result)).toEqual(["tabs/present"]);
  });
});

describe("switch, checkbox, toggle-button", () => {
  it("passes a named button switch that toggles, and notes native keyboard", async () => {
    const result = await checkPattern(f.goodSwitch(), "switch");
    expect(result.issues).toEqual([]);
    expect(result.passes).toContain("switch/toggles");
    expect(result.skipped.find((s) => s.rule === "switch/keyboard")?.kind).toBe("native");
  });

  it("flags an unnamed, unfocusable div switch", async () => {
    const result = await checkPattern(f.badSwitch(), "switch");
    expect(rules(result)).toEqual(expect.arrayContaining(["switch/aria-checked", "switch/focusable", "switch/name", "switch/toggles"]));
    expect(rules(result, "warning")).toContain("switch/native");
  });

  it("checks native checkboxes", async () => {
    expect((await checkPattern(f.mount(`<label><input type="checkbox"> Accept</label>`), "checkbox")).issues).toEqual([]);
    expect(rules(await checkPattern(f.mount(`<input type="checkbox">`), "checkbox"))).toEqual(["checkbox/name"]);
  });

  it("checks toggle buttons", async () => {
    expect((await checkPattern(f.goodToggle(), "toggle-button")).issues).toEqual([]);
    const bad = await checkPattern(f.badToggle(), "toggle-button");
    expect(rules(bad)).toEqual(expect.arrayContaining(["toggle-button/aria-pressed", "toggle-button/name"]));
  });
});

describe("radio-group", () => {
  it("passes a fieldset of same-name radios", async () => {
    const host = f.mount(`<fieldset><legend>Plan</legend><label><input type="radio" name="p" value="a" checked> A</label><label><input type="radio" name="p" value="b"> B</label></fieldset>`);
    const result = await checkPattern(host, "radio-group");
    expect(result.issues).toEqual([]);
    expect(host.querySelector<HTMLInputElement>("input[value=a]")!.checked).toBe(true);
  });

  it("flags radios without a shared name or a group label", async () => {
    const host = f.mount(`<fieldset><label><input type="radio" name="a"> A</label><label><input type="radio" name="b"> B</label></fieldset>`);
    expect(rules(await checkPattern(host, "radio-group"))).toEqual(expect.arrayContaining(["radio-group/group-name", "radio-group/shared-name"]));
  });
});

describe("menu", () => {
  it("passes an open menu with roving focus and Escape", async () => {
    const result = await checkPattern(f.goodMenu(), "menu");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["menu/arrow-down", "menu/wraps", "menu/home-end", "menu/escape-closes", "menu/escape-returns-focus"]));
  });

  it("flags tabbable items, missing checked state and missing keyboard support", async () => {
    const result = await checkPattern(f.badMenu(), "menu");
    expect(rules(result)).toEqual(expect.arrayContaining(["menu/item-checked", "menu/items-roving", "menu/arrow-down"]));
    expect(rules(result, "warning")).toContain("menu/name");
  });
});

describe("combobox and listbox", () => {
  it("passes an APG combobox", async () => {
    const result = await checkPattern(f.goodCombobox(), "combobox");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["combobox/arrow-down-opens", "combobox/activedescendant-moves", "combobox/escape-closes", "combobox/focus-stays"]));
  });

  it("flags a combobox without a label, state or popup", async () => {
    const result = await checkPattern(f.badCombobox(), "combobox");
    expect(rules(result)).toEqual(expect.arrayContaining(["combobox/aria-expanded", "combobox/controls-popup"]));
  });

  it("checks a standalone listbox", async () => {
    const host = f.mount(`<div role="listbox" aria-label="Colour"><div role="option" aria-selected="true">Red</div><div role="option" aria-selected="true">Blue</div></div>`);
    expect(rules(await checkPattern(host, "listbox"))).toEqual(expect.arrayContaining(["listbox/single-selection", "listbox/one-tab-stop"]));
  });
});

describe("grid", () => {
  it("passes a calendar grid with arrow, Home and End navigation", async () => {
    const result = await checkPattern(f.goodGrid(), "grid");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["grid/one-tab-stop", "grid/arrow-right", "grid/arrow-down", "grid/home", "grid/end", "grid/roving-follows-focus"]));
  });

  it("flags a grid with no Tab stop and misplaced aria-selected", async () => {
    const host = f.mount(`<table role="grid" aria-label="Days"><tr><td role="gridcell"><button tabindex="-1" aria-selected="true">1</button></td></tr></table>`);
    expect(rules(await checkPattern(host, "grid"))).toEqual(expect.arrayContaining(["grid/aria-selected-placement", "grid/one-tab-stop"]));
  });
});

describe("dialog, tooltip, disclosure, accordion", () => {
  it("checks an open dialog and skips what jsdom can't do", async () => {
    const host = f.mount(`<dialog open aria-labelledby="t"><h2 id="t">Settings</h2><button>Close</button></dialog>`);
    const result = await checkPattern(host, "dialog");
    expect(rules(result)).toEqual([]);
    expect(skipped(result)).toEqual(expect.arrayContaining(["dialog/focus-inside", "dialog/escape"]));
    expect(result.skipped.find((s) => s.rule === "dialog/focus-inside")?.kind).toBe("environment");
  });

  it("flags an unnamed role=dialog", async () => {
    const result = await checkPattern(f.mount(`<div role="dialog" aria-modal="true"><p>Hi</p></div>`), "dialog");
    expect(rules(result)).toEqual(expect.arrayContaining(["dialog/name", "dialog/focus-inside", "dialog/escape"]));
    expect(rules(result, "warning")).toEqual(expect.arrayContaining(["dialog/native", "dialog/close-button"]));
  });

  it("checks tooltip visibility on focus and Escape where it's observable", async () => {
    const host = f.mount(`<button aria-describedby="tip">Copy</button><div role="tooltip" id="tip" hidden>Copy to clipboard</div>`);
    const button = host.querySelector("button")!;
    const tip = host.querySelector<HTMLElement>("[role=tooltip]")!;
    button.addEventListener("focus", () => (tip.hidden = false));
    button.addEventListener("keydown", (e) => {
      if (e.key === "Escape") tip.hidden = true;
    });
    const result = await checkPattern(host, "tooltip");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(expect.arrayContaining(["tooltip/shows-on-focus", "tooltip/escape-dismisses"]));
  });

  it("flags a tooltip nobody references, holding a button", async () => {
    const result = await checkPattern(f.mount(`<div role="tooltip" id="t"><button>Undo</button></div>`), "tooltip");
    expect(rules(result)).toEqual(expect.arrayContaining(["tooltip/no-interactive-content", "tooltip/trigger"]));
  });

  it("flags a tooltip that Escape can't dismiss", async () => {
    const host = f.mount(`<button aria-describedby="tip">Copy</button><div role="tooltip" id="tip" hidden>Copy</div>`);
    host.querySelector("button")!.addEventListener("focus", () => (host.querySelector<HTMLElement>("#tip")!.hidden = false));
    expect(rules(await checkPattern(host, "tooltip"))).toEqual(["tooltip/escape-dismisses"]);
  });

  // A hover card: hidden toggled by hand, since jsdom has no Popover API.
  const hoverCard = ({ escape = true, keepOpenInside = true, returnFocus = true } = {}) => {
    const host = f.mount(
      `<a href="/u/ada" aria-describedby="card">@ada</a><div id="card" popover="manual" hidden><p>Ada Lovelace</p><a href="/u/ada/posts">Posts</a></div>`,
    );
    const trigger = host.querySelector<HTMLElement>("a")!;
    const card = host.querySelector<HTMLElement>("#card")!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Kernel-style data-open: without the Popover API it's what says "open".
    const setOpen = (open: boolean) => {
      card.hidden = !open;
      card.toggleAttribute("data-open", open);
    };
    const hideSoon = (e: FocusEvent) => {
      if (keepOpenInside && e.relatedTarget && (card.contains(e.relatedTarget as Node) || e.relatedTarget === trigger)) return;
      timer = setTimeout(() => setOpen(false), 50);
    };
    trigger.addEventListener("focus", () => {
      clearTimeout(timer);
      setOpen(true);
    });
    trigger.addEventListener("blur", hideSoon);
    if (keepOpenInside) {
      card.addEventListener("focusin", () => clearTimeout(timer));
      card.addEventListener("focusout", hideSoon);
    }
    if (escape) {
      host.ownerDocument.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || card.hidden) return;
        if (returnFocus && card.contains(document.activeElement)) {
          trigger.focus();
          clearTimeout(timer);
        }
        setOpen(false);
      });
    }
    return host;
  };

  it("passes a hover card that opens on focus, keeps open while focus is inside, and dismisses on Escape", async () => {
    const result = await checkPattern(hoverCard(), "hover-card");
    expect(result.issues).toEqual([]);
    expect(result.passes).toEqual(
      expect.arrayContaining([
        "hover-card/trigger",
        "hover-card/shows-on-focus",
        "hover-card/escape-dismisses",
        "hover-card/escape-keeps-focus",
        "hover-card/focus-inside-keeps-open",
        "hover-card/escape-returns-focus",
        "hover-card/reading-order",
      ]),
    );
  });

  it("flags a hover card Escape can't dismiss", async () => {
    expect(rules(await checkPattern(hoverCard({ escape: false }), "hover-card"))).toContain("hover-card/escape-dismisses");
  });

  it("flags a hover card that closes when focus moves into it", async () => {
    expect(rules(await checkPattern(hoverCard({ keepOpenInside: false }), "hover-card"))).toEqual(["hover-card/focus-inside-keeps-open"]);
  });

  it("flags Escape from inside a hover card dropping focus", async () => {
    expect(rules(await checkPattern(hoverCard({ returnFocus: false }), "hover-card"))).toEqual(["hover-card/escape-returns-focus"]);
  });

  it("flags a hover card nothing points at", async () => {
    const result = await checkPattern(f.mount(`<div id="c" popover="manual" data-slot="hover-card-content">Card</div>`), "hover-card");
    expect(rules(result)).toEqual(["hover-card/trigger"]);
  });

  it("checks aria-expanded disclosures against what they control", async () => {
    const host = f.mount(`<button aria-expanded="false" aria-controls="c">More</button><div id="c" hidden>Details</div>`);
    const button = host.querySelector("button")!;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      host.querySelector<HTMLElement>("#c")!.hidden = !open;
    });
    expect((await checkPattern(host, "disclosure")).issues).toEqual([]);
    const broken = f.mount(`<button aria-expanded="true" aria-controls="c">More</button><div id="c" hidden>Details</div>`);
    expect(rules(await checkPattern(broken, "disclosure"))).toEqual(expect.arrayContaining(["disclosure/expanded-matches", "disclosure/toggles"]));
  });

  it("checks <details> accordions", async () => {
    const host = f.mount(`<details name="faq" open><summary>One</summary>1</details><details name="faq"><summary>Two</summary>2</details>`);
    const result = await checkPattern(host, "accordion");
    expect(result.issues).toEqual([]);
    expect(skipped(result)).toContain("accordion/exclusive");
    const bad = f.mount(`<details><summary><a href="#x">Link</a></summary>x</details><details>no summary</details>`);
    expect(rules(await checkPattern(bad, "accordion"))).toEqual(expect.arrayContaining(["accordion/summary", "accordion/summary-content"]));
  });
});

describe("fields, select, slider, toolbar, button", () => {
  it("rejects placeholder-only names", async () => {
    expect(rules(await checkPattern(f.mount(`<input placeholder="Email">`), "field"))).toEqual(["field/name"]);
    expect((await checkPattern(f.mount(`<label>Email <input></label>`), "field")).issues).toEqual([]);
  });

  it("checks native selects and sliders", async () => {
    expect((await checkPattern(f.mount(`<label>Country <select><option>UK</option></select></label>`), "select")).issues).toEqual([]);
    expect(rules(await checkPattern(f.mount(`<select><option></option></select>`), "select"))).toEqual(["select/name", "select/option-text"]);
    expect((await checkPattern(f.mount(`<label>Volume <input type="range" value="30"></label>`), "slider")).issues).toEqual([]);
    expect(rules(await checkPattern(f.mount(`<label>V <input type="range" min="10" max="5"></label>`), "slider"))).toContain("slider/range");
  });

  it("checks toolbars are a single Tab stop", async () => {
    const host = f.mount(`<div role="toolbar" aria-label="Format"><button>B</button><button>I</button></div>`);
    expect(rules(await checkPattern(host, "toolbar"))).toEqual(["toolbar/arrow", "toolbar/one-tab-stop"]);
  });

  it("flags icon-only buttons without a name", async () => {
    const result = await checkPattern(f.mount(`<button><svg width="16" height="16"></svg></button>`), "button");
    expect(rules(result)).toEqual(["button/name"]);
    expect(rules(result, "warning")).toEqual(["button/decorative-icon"]);
  });
});

describe("checkPage and assertions", () => {
  it("flags composition problems across a page", async () => {
    f.mount(`
      <label for="dup">One</label><input id="dup">
      <input id="dup" aria-describedby="missing">
      <button><a href="#">Nested</a></button>`);
    const result = await checkPage(document.body);
    expect(rules(result)).toEqual(expect.arrayContaining(["common/unique-ids", "common/idrefs", "common/no-nested-interactive", "common/interactive-name"]));
    expect(result.found).toEqual({});
  });

  it("assertPattern throws a readable error listing issues", async () => {
    const error = await assertPattern(f.badSwitch(), "switch").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PatternAssertionError);
    expect((error as Error).message).toMatch(/\[switch\/name\] The switch has no accessible name/);
    expect((error as PatternAssertionError).result.passed).toBe(false);
  });

  it("strict mode fails on warnings", async () => {
    const host = f.mount(`<div role="tablist"><button role="tab" aria-selected="true" aria-controls="p" id="t">A</button></div><div role="tabpanel" id="p" aria-labelledby="t">x</div>`);
    expect((await checkPattern(host, "tabs")).passed).toBe(true);
    expect((await checkPattern(host, "tabs", { strict: true })).passed).toBe(false);
  });

  it("formats results", async () => {
    const result = await checkPattern(f.badSwitch(), "switch");
    expect(formatResult(result, { verbose: true })).toMatch(/error\(s\).*\n.*switch\//);
  });

  it("rejects non-elements and unknown patterns", async () => {
    await expect(checkPattern(null as unknown as Element, "tabs")).rejects.toThrow(TypeError);
    await expect(checkPattern(document.body, "nope" as "tabs")).rejects.toThrow(/unknown pattern/);
  });
});
