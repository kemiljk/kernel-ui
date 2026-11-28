/**
 * Hand-built widgets, correct and broken, for testing the checks themselves
 * independently of Kernel. The "good" ones implement the APG keyboard
 * behaviour with a few lines of script.
 */

export function mount(html: string): HTMLElement {
  document.body.innerHTML = "";
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

function rove(items: HTMLElement[], key: string, current: number, wrap = true) {
  const last = items.length - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (key === "ArrowRight" || key === "ArrowDown") return current === last ? (wrap ? 0 : last) : current + 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return current === 0 ? (wrap ? last : 0) : current - 1;
  return null;
}

export function goodTabs() {
  const host = mount(`
    <div role="tablist" aria-label="Sections">
      <button role="tab" id="t1" aria-selected="true" aria-controls="p1" tabindex="0">One</button>
      <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Two</button>
      <button role="tab" id="t3" aria-selected="false" aria-controls="p3" tabindex="-1">Three</button>
    </div>
    <div role="tabpanel" id="p1" aria-labelledby="t1">1</div>
    <div role="tabpanel" id="p2" aria-labelledby="t2" hidden>2</div>
    <div role="tabpanel" id="p3" aria-labelledby="t3" hidden>3</div>`);
  const tabs = Array.from(host.querySelectorAll<HTMLElement>("[role=tab]"));
  const select = (tab: HTMLElement) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")!)!.hidden = !on;
    }
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));
  host.querySelector("[role=tablist]")!.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    const next = rove(tabs, e.key, tabs.indexOf(document.activeElement as HTMLElement));
    if (next === null) return;
    e.preventDefault();
    tabs[next]!.focus();
    select(tabs[next]!);
  });
  return host;
}

export const badTabs = () =>
  mount(`
    <div role="tablist">
      <button role="tab" aria-selected="true" aria-controls="nope">One</button>
      <button role="tab" aria-selected="true" aria-controls="q2">Two</button>
    </div>
    <div role="tabpanel" id="q2">2</div>`);

export function goodSwitch() {
  const host = mount(`<label>Wi-Fi <button type="button" role="switch" aria-checked="false"></button></label>`);
  const el = host.querySelector("button")!;
  el.addEventListener("click", () => el.setAttribute("aria-checked", String(el.getAttribute("aria-checked") !== "true")));
  return host;
}

export const badSwitch = () => mount(`<div role="switch"></div>`);

export function goodToggle() {
  const host = mount(`<button type="button" aria-pressed="false" aria-label="Bold"><svg aria-hidden="true" width="16" height="16"></svg></button>`);
  const el = host.querySelector("button")!;
  el.addEventListener("click", () => el.setAttribute("aria-pressed", String(el.getAttribute("aria-pressed") !== "true")));
  return host;
}

export const badToggle = () => mount(`<button type="button" aria-pressed="yes"><svg width="16" height="16"></svg></button>`);

export function goodMenu() {
  const host = mount(`
    <button id="mb" aria-haspopup="menu" aria-expanded="true" aria-controls="m">Actions</button>
    <div role="menu" id="m" aria-labelledby="mb">
      <button role="menuitem" tabindex="-1">Edit</button>
      <button role="menuitem" tabindex="-1">Duplicate</button>
      <button role="menuitem" tabindex="-1">Delete</button>
    </div>`);
  const menu = host.querySelector<HTMLElement>("[role=menu]")!;
  const items = Array.from(menu.querySelectorAll<HTMLElement>("[role=menuitem]"));
  const button = host.querySelector<HTMLElement>("#mb")!;
  menu.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    if (e.key === "Escape") {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") return;
    const next = rove(items, e.key, items.indexOf(document.activeElement as HTMLElement));
    if (next !== null) items[next]!.focus();
  });
  return host;
}

export const badMenu = () =>
  mount(`
    <div role="menu">
      <a role="menuitem" href="#a">A</a>
      <a role="menuitem" href="#b">B</a>
      <div role="menuitemcheckbox" tabindex="-1">Bold</div>
    </div>`);

export function goodCombobox() {
  const host = mount(`
    <label for="c">Fruit</label>
    <input id="c" role="combobox" aria-expanded="false" aria-controls="lb" aria-autocomplete="list">
    <div role="listbox" id="lb" hidden>
      <div role="option" id="o1" aria-selected="false">Apple</div>
      <div role="option" id="o2" aria-selected="false">Banana</div>
    </div>`);
  const input = host.querySelector<HTMLInputElement>("input")!;
  const list = host.querySelector<HTMLElement>("[role=listbox]")!;
  const options = Array.from(list.querySelectorAll<HTMLElement>("[role=option]"));
  let index = -1;
  const sync = () => {
    input.setAttribute("aria-expanded", String(!list.hidden));
    if (index >= 0 && !list.hidden) input.setAttribute("aria-activedescendant", options[index]!.id);
    else input.removeAttribute("aria-activedescendant");
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      if (list.hidden) {
        list.hidden = false;
        index = 0;
      } else index = Math.min(index + 1, options.length - 1);
    } else if (e.key === "ArrowUp") index = Math.max(index - 1, 0);
    else if (e.key === "Escape") {
      list.hidden = true;
      index = -1;
    } else return;
    e.preventDefault();
    sync();
  });
  return host;
}

export const badCombobox = () => mount(`<input role="combobox" placeholder="Search">`);

export function goodGrid() {
  const rows = [
    [null, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, null, null],
  ];
  const host = mount(`
    <span id="h">March</span>
    <table role="grid" aria-labelledby="h"><tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${row
              .map((day) => (day === null ? `<td role="gridcell"></td>` : `<td role="gridcell" aria-selected="${day === 5}"><button type="button" tabindex="${day === 5 ? 0 : -1}">${day}</button></td>`))
              .join("")}</tr>`,
        )
        .join("")}
    </tbody></table>`);
  const tbody = host.querySelector("tbody")!;
  tbody.addEventListener("keydown", (e) => {
    const button = document.activeElement as HTMLButtonElement;
    const cell = button.closest("td")!;
    const row = cell.closest("tr")!;
    const col = cell.cellIndex;
    const buttonsIn = (tr: Element | null | undefined) => (tr ? Array.from(tr.querySelectorAll("button")) : []);
    const at = (tr: Element | null | undefined, c: number) => (tr as HTMLTableRowElement | null)?.cells[c]?.querySelector("button") ?? null;
    let target: HTMLButtonElement | null = null;
    if (e.key === "ArrowRight") target = at(row, col + 1);
    if (e.key === "ArrowLeft") target = at(row, col - 1);
    if (e.key === "ArrowDown") target = at(row.nextElementSibling, col);
    if (e.key === "ArrowUp") target = at(row.previousElementSibling, col);
    if (e.key === "Home") target = buttonsIn(row)[0] ?? null;
    if (e.key === "End") target = buttonsIn(row).at(-1) ?? null;
    if (!target) return;
    e.preventDefault();
    tbody.querySelectorAll("button").forEach((b) => (b.tabIndex = -1));
    target.tabIndex = 0;
    target.focus();
  });
  return host;
}
