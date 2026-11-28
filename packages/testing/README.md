# @kernelui-lib/testing

Check a rendered UI against the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) patterns [Kernel UI](https://www.kernelui.com) is built on: roles and native elements, accessible names, state that agrees with itself, and keyboard behaviour. Use it in your own tests to verify screens composed from Kernel components, or widgets you built yourself. Every failure names the rule, the element and the fix, so a coding agent can act on it.

```bash
npm install -D @kernelui-lib/testing
```

It's plain DOM with no test-runner globals: vitest or jest with jsdom or happy-dom, and real browsers through Playwright.

## Vitest / Jest

```tsx
import { act, render } from "@testing-library/react";
import { assertComponent, assertPage, checkPattern } from "@kernelui-lib/testing";

const options = { act }; // lets React flush between simulated key presses

test("plan picker", async () => {
  const { container } = render(<Settings />);
  await assertComponent(container, "RadioGroup", options);
});

test("every Kernel component on the screen", async () => {
  render(<Settings />);
  await assertPage(document.body, options);
});

test("our own tablist", async () => {
  const { getByRole } = render(<MyTabs />);
  const result = await checkPattern(getByRole("tablist"), "tabs", options);
  expect(result.issues).toEqual([]);
});
```

Custom elements from `@kernelui-lib/elements` are checked the same way. They render the same DOM as the React components.

The package ships ESM and a CommonJS build of the main entry, so Jest's default CommonJS mode loads it with no `transformIgnorePatterns` entry.

## Playwright

```ts
import { assertComponentInPage, checkPageInPage } from "@kernelui-lib/testing/playwright";

await page.goto("/settings");
await assertComponentInPage(page, "#plan", "RadioGroup");
const result = await checkPageInPage(page, "main");
```

Or add the browser bundle yourself. It defines `window.KernelTesting`:

```ts
await page.addScriptTag({ path: require.resolve("@kernelui-lib/testing/browser") });
await page.evaluate(() => window.KernelTesting.checkPattern(document.querySelector("[role=tablist]"), "tabs"));
```

## API

| Function | Checks |
| --- | --- |
| `checkPattern(root, pattern, options?)` | One APG pattern on `root` or anything inside it |
| `checkComponent(root, name, options?)` | A Kernel component's pattern(s) plus Kernel's invariants. `name` is the React export (`"DropdownMenu"`), docs slug or element tag |
| `checkPage(root = document.body, options?)` | Every Kernel component found under `root`, plus page-wide rules: unique ids, resolving id references, named controls, no nested interactive elements |
| `assertPattern` / `assertComponent` / `assertPage` | The same, throwing a `PatternAssertionError` that lists every issue |
| `formatResult(result)` | A readable summary |
| `accessibleName(el)` | The accname subset the checks use |

Each returns `Promise<{ passed, issues, skipped, passes, environment }>` (`checkComponent`/`checkPage` add `found`). An issue is `{ rule, severity, message, target?, component? }`. Errors fail. Warnings, for APG recommendations that aren't requirements, fail only with `strict: true`.

Options: `act` (wraps each interaction), `interactions: false` (structure only), `ignore: ["tabs/tablist-name", "tooltip"]`, `strict`, `settle` (custom wait after each interaction).

### Patterns

| Pattern | Checks |
| --- | --- |
| `accordion` | `<details>`/`<summary>` (or heading-wrapped `aria-expanded` buttons), summary names, no interactive content in a summary, toggling, `<details name>` exclusivity (browser) |
| `button` | Every button and link is named; icons inside are `aria-hidden` |
| `checkbox` | Native `<input type=checkbox>` preferred, name, click toggles |
| `combobox` | `aria-expanded`, `aria-controls` → listbox, popup visibility matches `aria-expanded`; ArrowDown opens and moves `aria-activedescendant` while focus stays in the input; ArrowUp; Escape closes |
| `dialog` | `<dialog>` preferred, name, close button, focus inside when modal (browser), Escape (native) |
| `disclosure` | `<details>`, `aria-expanded` + `aria-controls` buttons and `popovertarget` buttons: name, state matches the content, toggling |
| `field` | Form controls have a real label, not just a placeholder; `aria-invalid` has a message |
| `grid` | Name, `aria-selected` on cells, a single Tab stop that follows focus; arrows, Home and End move by cell, row and week |
| `hover-card` | A `[popover]` its trigger points at (`aria-describedby`, `aria-details` or `interestfor`): opens on focus, Escape dismisses without moving focus (WCAG 1.4.13), focus moving into it keeps it open, Escape from inside returns focus to the trigger |
| `listbox` | Options named, single selection, one Tab stop, arrow keys |
| `menu` | Named (`aria-labelledby` its button, or `aria-label`), `menuitem` children, items out of the Tab order, `aria-haspopup`/`aria-expanded` on the button; opening focuses an item; arrows wrap; Home/End; Escape closes and returns focus |
| `radio-group` | Group name (`<fieldset>`/`<legend>`), shared `name` so the browser makes it a group, selection |
| `select` | Native `<select>` with a label and option text |
| `slider` | `<input type=range>` preferred, name, value in range |
| `switch` | `role="switch"` on a `<button>`, `aria-checked`, name, click toggles |
| `tabs` | One selected tab, `aria-controls` → tabpanel, panels hidden with their tab, a single Tab stop; arrows move (and wrap), Home/End |
| `toggle-button` | `<button aria-pressed>`, name, click toggles |
| `toolbar` | One Tab stop, arrow keys between controls |
| `tooltip` | Referenced by `aria-describedby`, no interactive content, shows on focus, Escape dismisses (WCAG 1.4.13) |

## What jsdom can't check

jsdom and happy-dom have no layout, no Popover API and no modal `<dialog>` behaviour. Checks that need them are reported in `skipped` with `kind: "environment"`, never as passes or failures. Run the same checks in Playwright to cover them.

Synthetic key events also can't trigger what the browser does itself: Space on a `<button>`, arrow keys in a native radio group, Escape on a `<dialog>` or `popover="auto"`. Kernel uses the native element for these, so the check confirms the native element is there and lists the behaviour as `kind: "native"`.

- A closed dialog or menu skips its open-state checks. Open it first.
- jsdom has no `scrollIntoView`. Stub it in your test setup if a combobox throws.
- jsdom has no `HTMLDialogElement.prototype.showModal`. Stub it (set the `open` attribute) to render an open Dialog.
- Where a browser implements `interestfor` natively (Chromium), a dispatched Escape can't reach it, so tooltip and hover-card keyboard checks set the attribute aside while they run and report `*/native-interest` as skipped. Press a real Escape with Playwright's keyboard to cover the native half.
- Interactions change state (a selected tab, a flipped switch) and restore it where they can. Check a fresh render.

## License

MIT
