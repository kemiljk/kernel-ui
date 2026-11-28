import { KernelElement, kernelClass } from "../../base";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import "../Button/Button";
import "../Tabs/Tabs";
import "./ArtifactPanel.css";

let panelCounter = 0;

const SVG = (path: string) =>
  `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16"${path.startsWith("M4 4") ? "" : ' data-flip-rtl=""'}>` +
  `<path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"${path.startsWith("M4 4") ? "" : ' stroke-linejoin="round"'} /></svg>`;
const CLOSE_PATH = "M4 4L12 12M12 4L4 12";
const PREV_PATH = "M10 4L6 8L10 12";
const NEXT_PATH = "M6 4L10 8L6 12";

function iconButton(path: string, slot?: string): HTMLElement {
  const button = document.createElement("kernel-button");
  button.setAttribute("variant", "ghost");
  button.setAttribute("size", "sm");
  if (slot) button.setAttribute("data-artifact-slot", slot);
  button.innerHTML = SVG(path);
  return button;
}

/**
 * `<kernel-artifact-panel>` — the side panel an AI app opens beside the
 * chat to show what it made: a page preview, a document, the code behind
 * it. Mirrors `@kernelui-lib/react`'s `<ArtifactPanel>`.
 *
 * Two native elements, chosen by `presentation`. Docked, it's an
 * `<aside>` named by its title heading (a complementary landmark) that
 * sits in the page flow — put it in a `<kernel-resizable>` pane. As an
 * overlay it's a `<dialog>` opened with `showModal()`, like
 * `<kernel-dialog>`, so the focus trap, Escape, `::backdrop`, inert page
 * and focus restoration are the browser's. `auto` (the default) is
 * overlay below `overlay-below` px of viewport — a media query, because
 * the switch changes the element and its focus model, which a container
 * query can't. Crossing it moves the panel's content into the other
 * element, so an iframe preview reloads once.
 *
 * Attributes: `title` (required), `heading-level` (2–4, docked only;
 * default 2), `open` (boolean — add it to show the panel), `presentation`
 * (auto/docked/overlay), `overlay-below` (default 768), `status`
 * (ready/streaming/error), `version` + `version-count` (the switcher
 * appears above one version), `view` (the selected view's value),
 * `show-close-button` (`"false"` to omit).
 *
 * Children: `<kernel-artifact-view value="preview" label="Preview">`
 * elements become tabs (Kernel's `<kernel-tabs>`); a child with
 * `slot="actions"` goes in the header before the close button; anything
 * else is the body. Read once at connect.
 *
 * Built-in strings (`label-*` attributes or the `labels` property, same
 * keys and defaults as React's `ArtifactPanelLabels`): `close`,
 * `previous-version`, `next-version`, `version` (`"v{current} of
 * {total}"`), `versions`, `views`, `streaming`, `error`.
 *
 * Events (bubbling): `close` once the panel has closed by any path;
 * `versionchange` (`detail.version`, cancelable — the element updates its
 * own `version` unless prevented); `viewchange` (`detail.value`).
 */
export class KernelArtifactPanel extends KernelElement {
  private readonly titleId = `kernel-artifact-panel-title-${++panelCounter}`;
  private readonly statusId = `kernel-artifact-panel-status-${panelCounter}`;
  private frame: HTMLElement | null = null;
  /** Detached while there's one version or none, like React's conditional. */
  private versionsGroup: HTMLElement | null = null;
  private tabs: HTMLElement | null = null;
  private media: MediaQueryList | null = null;
  private closing = false;
  private exitAbort: AbortController | null = null;
  private skipCloseEvent = false;
  private mounting = false;
  private readonly onMediaChange = () => this.mount();

  static get observedAttributes() {
    return [
      "title",
      "heading-level",
      "open",
      "presentation",
      "overlay-below",
      "status",
      "version",
      "version-count",
      "view",
      "label-close",
      "label-previous-version",
      "label-next-version",
      "label-version",
      "label-versions",
      "label-views",
      "label-streaming",
      "label-error",
    ];
  }

  connectedCallback() {
    this.watchMedia();
    if (this.native) return;

    const actions: Node[] = [];
    const views: HTMLElement[] = [];
    const body: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node instanceof HTMLElement && node.getAttribute("slot") === "actions") actions.push(node);
      else if (node instanceof HTMLElement && node.localName === "kernel-artifact-view") views.push(node);
      else body.push(node);
      node.parentNode?.removeChild(node);
    }

    const header = document.createElement("header");
    header.className = kernelClass("ArtifactPanel", "header");
    header.setAttribute("data-slot", "artifact-panel-header");

    const bar = document.createElement("div");
    bar.className = kernelClass("ArtifactPanel", "bar");

    const heading = document.createElement("div");
    heading.className = kernelClass("ArtifactPanel", "heading");

    const title = document.createElement("h2");
    title.id = this.titleId;
    title.className = kernelClass("ArtifactPanel", "title");
    title.setAttribute("data-slot", "artifact-panel-title");

    const status = document.createElement("span");
    status.id = this.statusId;
    status.setAttribute("role", "status");
    status.className = kernelClass("ArtifactPanel", "status");
    const dot = document.createElement("span");
    dot.className = kernelClass("ArtifactPanel", "statusDot");
    dot.setAttribute("aria-hidden", "true");
    dot.dataset.kernelMotion = "essential";
    const statusText = document.createElement("span");
    statusText.className = kernelClass("ArtifactPanel", "statusText");
    status.append(dot, statusText);
    heading.append(title, status);

    const versions = document.createElement("div");
    versions.setAttribute("role", "group");
    versions.className = kernelClass("ArtifactPanel", "versions");
    versions.setAttribute("data-slot", "artifact-panel-versions");
    const prev = iconButton(PREV_PATH, "prev");
    const versionLabel = document.createElement("span");
    versionLabel.className = kernelClass("ArtifactPanel", "versionLabel");
    versionLabel.setAttribute("aria-live", "polite");
    const next = iconButton(NEXT_PATH, "next");
    prev.addEventListener("click", () => this.stepVersion(-1));
    next.addEventListener("click", () => this.stepVersion(1));
    versions.append(prev, versionLabel, next);

    const actionBox = document.createElement("div");
    actionBox.className = kernelClass("ArtifactPanel", "actions");
    actionBox.setAttribute("data-slot", "artifact-panel-actions");
    for (const node of actions) {
      if (node instanceof HTMLElement) node.removeAttribute("slot");
      actionBox.append(node);
    }
    if (this.getAttribute("show-close-button") !== "false") {
      const close = iconButton(CLOSE_PATH, "close");
      close.addEventListener("click", () => this.requestClose());
      actionBox.append(close);
    }

    this.versionsGroup = versions;
    bar.append(heading);
    if (actionBox.childNodes.length) bar.append(actionBox);
    header.append(bar);

    const bodyBox = document.createElement("div");
    bodyBox.className = kernelClass("ArtifactPanel", "body");
    bodyBox.setAttribute("data-slot", "artifact-panel-body");

    let frame: HTMLElement;
    if (views.length) {
      const tabs = document.createElement("kernel-tabs");
      const first = views[0]!.getAttribute("value") ?? "";
      tabs.setAttribute("default-value", this.getAttribute("view") ?? first);
      const list = document.createElement("kernel-tabs-list");
      list.setAttribute("data-artifact-slot", "tabs");
      for (const view of views) {
        const value = view.getAttribute("value") ?? "";
        const tab = document.createElement("kernel-tab");
        tab.setAttribute("value", value);
        if (view.hasAttribute("disabled")) tab.setAttribute("disabled", "");
        tab.textContent = view.getAttribute("label") ?? value;
        list.append(tab);
        const panel = document.createElement("kernel-tab-panel");
        panel.setAttribute("value", value);
        panel.setAttribute("data-artifact-slot", "panel");
        while (view.firstChild) panel.append(view.firstChild);
        bodyBox.append(panel);
      }
      header.append(list);
      tabs.append(header, bodyBox);
      tabs.addEventListener("valuechange", (event) => {
        if (event.target !== tabs) return;
        const value = (event as CustomEvent<{ value: string }>).detail.value;
        this.dispatchEvent(new CustomEvent("viewchange", { detail: { value }, bubbles: true }));
      });
      this.tabs = tabs;
      frame = tabs;
    } else {
      frame = document.createElement("div");
      frame.className = kernelClass("ArtifactPanel", "frame");
      bodyBox.append(...body);
      frame.append(header, bodyBox);
    }
    this.frame = frame;
    this.mount();
  }

  disconnectedCallback() {
    this.media?.removeEventListener("change", this.onMediaChange);
    this.media = null;
    this.exitAbort?.abort();
  }

  private watchMedia() {
    this.media?.removeEventListener("change", this.onMediaChange);
    this.media = null;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const below = Number(this.getAttribute("overlay-below") ?? "768") || 768;
    this.media = window.matchMedia(`(max-width: ${below - 0.02}px)`);
    this.media.addEventListener?.("change", this.onMediaChange);
  }

  private get resolved(): "docked" | "overlay" {
    const presentation = this.getAttribute("presentation");
    if (presentation === "overlay") return "overlay";
    if (presentation === "docked") return "docked";
    return this.media?.matches ? "overlay" : "docked";
  }

  /** Puts the frame in the element the current presentation calls for. */
  private mount() {
    const frame = this.frame;
    if (!frame) return;
    const want = this.resolved === "overlay" ? "dialog" : "aside";
    let root = this.native;
    if (!root || root.localName !== want) {
      const next = document.createElement(want);
      next.className = kernelClass("ArtifactPanel");
      next.setAttribute("data-slot", "artifact-panel");
      next.setAttribute("aria-labelledby", this.titleId);
      if (want === "dialog") {
        next.addEventListener("click", (event) => {
          if (event.target === next) this.requestClose();
        });
        next.addEventListener("cancel", (event) => {
          event.preventDefault();
          this.requestClose();
        });
        next.addEventListener("close", () => {
          if (this.skipCloseEvent) {
            this.skipCloseEvent = false;
            return;
          }
          this.removeAttribute("open");
          this.dispatchEvent(new Event("close", { bubbles: true }));
        });
      }
      next.append(frame);
      if (root) root.replaceWith(next);
      else this.append(next);
      this.native = next;
      root = next;
      this.closing = false;
      // Kernel's Tabs build their native parts on connect, so their class
      // hooks can only be added once the frame is in the document.
      this.decorateTabs();
    }
    root.setAttribute("data-presentation", this.resolved);
    this.syncHeading();
    this.mounting = true;
    try {
      this.syncAllAttrs();
    } finally {
      this.mounting = false;
    }
  }

  private decorateTabs() {
    const tabs = this.tabs;
    if (!tabs) return;
    queueMicrotask(() => {
      tabs.querySelector(`:scope > .${kernelClass("Tabs", "root")}`)?.classList.add(kernelClass("ArtifactPanel", "frame"));
      tabs
        .querySelector(`[data-artifact-slot="tabs"] > .${kernelClass("Tabs", "list")}`)
        ?.classList.add(kernelClass("ArtifactPanel", "tabs"));
      for (const panel of tabs.querySelectorAll(`[data-artifact-slot="panel"] > .${kernelClass("Tabs", "panel")}`)) {
        panel.classList.add(kernelClass("ArtifactPanel", "panel"));
      }
    });
  }

  /** `h2` in an overlay (its own document context), else `heading-level`. */
  private syncHeading() {
    const title = this.frame?.querySelector<HTMLElement>(`[data-slot="artifact-panel-title"]`);
    if (!title) return;
    const level = Number(this.getAttribute("heading-level") ?? "2");
    const tag = this.resolved === "overlay" ? "h2" : `h${level >= 2 && level <= 4 ? level : 2}`;
    if (title.localName === tag) return;
    const next = document.createElement(tag);
    for (const { name, value } of Array.from(title.attributes)) next.setAttribute(name, value);
    while (title.firstChild) next.append(title.firstChild);
    title.replaceWith(next);
  }

  protected applyLabels() {
    const frame = this.frame;
    if (!frame) return;
    frame.querySelector('[data-artifact-slot="close"]')?.setAttribute("aria-label", this.builtInLabel("close", "Close"));
    this.versionsGroup
      ?.querySelector('[data-artifact-slot="prev"]')
      ?.setAttribute("aria-label", this.builtInLabel("previousVersion", "Previous version"));
    this.versionsGroup
      ?.querySelector('[data-artifact-slot="next"]')
      ?.setAttribute("aria-label", this.builtInLabel("nextVersion", "Next version"));
    this.versionsGroup?.setAttribute("aria-label", this.builtInLabel("versions", "Versions"));
    frame.querySelector('[data-artifact-slot="tabs"]')?.setAttribute("aria-label", this.builtInLabel("views", "Views"));
    this.syncStatus();
    this.syncVersions();
  }

  private syncStatus() {
    const root = this.native;
    const status = this.frame?.querySelector<HTMLElement>(`#${this.statusId}`);
    if (!root || !status) return;
    const value = this.getAttribute("status");
    const resolved = value === "streaming" || value === "error" ? value : "ready";
    root.setAttribute("data-status", resolved);
    status.setAttribute("data-status", resolved);
    if (resolved === "streaming") root.setAttribute("aria-busy", "true");
    else root.removeAttribute("aria-busy");
    const text = status.lastElementChild;
    if (text) {
      text.textContent =
        resolved === "streaming"
          ? this.builtInLabel("streaming", "Generating…")
          : resolved === "error"
            ? this.builtInLabel("error", "Generation failed")
            : "";
    }
  }

  private versionState() {
    const total = Math.max(0, Number(this.getAttribute("version-count") ?? "0") || 0);
    const raw = Number(this.getAttribute("version") ?? String(total)) || total;
    const current = Math.min(Math.max(raw, 1), Math.max(total, 1));
    return { total, current };
  }

  private syncVersions() {
    const group = this.versionsGroup;
    const heading = this.frame?.querySelector(`.${kernelClass("ArtifactPanel", "heading")}`);
    if (!group || !heading) return;
    const { total, current } = this.versionState();
    if (total > 1 && !group.isConnected) heading.after(group);
    if (total <= 1) group.remove();
    const label = group.querySelector(`.${kernelClass("ArtifactPanel", "versionLabel")}`);
    if (label) {
      label.textContent = this.builtInLabel("version", "v{current} of {total}", { current, total });
    }
    const prev = group.querySelector('[data-artifact-slot="prev"]');
    const next = group.querySelector('[data-artifact-slot="next"]');
    prev?.toggleAttribute("disabled", current <= 1);
    next?.toggleAttribute("disabled", current >= total);
  }

  private stepVersion(delta: number) {
    const { total, current } = this.versionState();
    const version = current + delta;
    if (version < 1 || version > total) return;
    const event = new CustomEvent("versionchange", { detail: { version }, bubbles: true, cancelable: true });
    if (this.dispatchEvent(event)) this.setAttribute("version", String(version));
  }

  private requestClose() {
    if (!this.hasAttribute("open") || this.closing) return;
    this.removeAttribute("open");
  }

  private syncOpen() {
    const root = this.native;
    if (!root) return;
    const open = this.hasAttribute("open");
    if (root instanceof HTMLDialogElement) {
      if (open && !root.open) {
        this.exitAbort?.abort();
        this.closing = false;
        root.removeAttribute("data-closing");
        root.setAttribute("data-opening", "true");
        root.showModal();
        root.setAttribute("data-state", "open");
        requestAnimationFrame(() => root.removeAttribute("data-opening"));
      } else if (!open && root.open) {
        void this.finishClose(root);
      }
      return;
    }
    const wasOpen = !root.hidden;
    root.hidden = !open;
    if (wasOpen && !open) this.dispatchEvent(new Event("close", { bubbles: true }));
  }

  private async finishClose(dialog: HTMLDialogElement) {
    if (this.closing) return;
    this.closing = true;
    dialog.setAttribute("data-state", "closing");
    dialog.setAttribute("data-closing", "true");
    if (!prefersReducedMotion()) {
      const controller = new AbortController();
      this.exitAbort?.abort();
      this.exitAbort = controller;
      await waitForExitTransition(dialog, { signal: controller.signal });
      if (controller.signal.aborted) {
        this.closing = false;
        return;
      }
    }
    this.skipCloseEvent = true;
    dialog.close();
    dialog.removeAttribute("data-state");
    dialog.removeAttribute("data-closing");
    this.closing = false;
    this.dispatchEvent(new Event("close", { bubbles: true }));
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native || !this.frame) return;
    switch (name) {
      case "title": {
        const title = this.frame.querySelector(`[data-slot="artifact-panel-title"]`);
        if (title) title.textContent = value ?? "";
        break;
      }
      case "heading-level":
      case "presentation":
        if (!this.mounting) this.mount();
        break;
      case "overlay-below":
        if (this.mounting) break;
        this.watchMedia();
        this.mount();
        break;
      case "open":
        this.syncOpen();
        break;
      case "status":
        this.syncStatus();
        break;
      case "version":
      case "version-count":
        this.syncVersions();
        break;
      case "view":
        if (value !== null) this.tabs?.setAttribute("value", value);
        break;
    }
  }
}

/** `<kernel-artifact-view value label>` — one view of an
 * `<kernel-artifact-panel>`. A marker: its children become the view's tab
 * panel when the panel connects. */
export class KernelArtifactView extends HTMLElement {}

customElements.define("kernel-artifact-panel", KernelArtifactPanel);
customElements.define("kernel-artifact-view", KernelArtifactView);
