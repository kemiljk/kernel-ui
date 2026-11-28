import { KernelElement, kernelClass } from "../../base";
import "./Kbd.css";

const APPLE_ALIASES: Record<string, string> = { mod: "⌘", alt: "⌥", shift: "⇧", ctrl: "⌃" };
const OTHER_ALIASES: Record<string, string> = { mod: "Ctrl", alt: "Alt", shift: "Shift", ctrl: "Ctrl" };

const SPOKEN: Record<string, string> = {
  "⌘": "Command",
  "⌥": "Option",
  "⇧": "Shift",
  "⌃": "Control",
  "↵": "Enter",
  "⏎": "Return",
  "⌫": "Backspace",
  "⌦": "Delete",
  "⎋": "Escape",
  "⇥": "Tab",
  "␣": "Space",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "←": "Left arrow",
  "→": "Right arrow",
};

function detectApple(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function keyLabel(label: string): Node[] {
  const spoken = SPOKEN[label];
  if (!spoken) return [document.createTextNode(label)];
  const glyph = document.createElement("span");
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = label;
  const name = document.createElement("span");
  name.className = "kernel-sr-only";
  name.textContent = spoken;
  return [glyph, name];
}

/**
 * `<kernel-kbd>` — a keyboard key or shortcut on the real `<kbd>` element.
 * A combination follows the HTML spec's own pattern: an outer `<kbd>`
 * holding one nested `<kbd>` per key, with the separator as real text
 * between them, so it reads as one unit ("Command plus K"). Mirrors
 * `@kernelui-lib/react`'s `<Kbd>`.
 *
 * Modifier symbols (⌘ ⌥ ⇧ ⌃, arrows, Enter) get a visually hidden
 * spoken name, because screen readers announce those glyphs
 * inconsistently. Each key is sized like `<kernel-badge>`'s optical pill.
 *
 * Attributes: `keys` (space-separated, e.g. `keys="mod shift P"`; the
 * lowercase aliases `mod`, `alt`, `shift`, `ctrl` resolve per platform,
 * `mod` being ⌘ on Apple platforms and Ctrl elsewhere), `separator`
 * (default `+`), `platform` (`auto` | `apple` | `other`, default `auto`).
 * Without `keys`, the element's own text is the single key.
 */
export class KernelKbd extends KernelElement {
  private authored: Node[] = [];

  static get observedAttributes() {
    return ["keys", "separator", "platform"];
  }

  connectedCallback() {
    if (this.native) return;
    this.authored = Array.from(this.childNodes);
    for (const node of this.authored) node.parentNode?.removeChild(node);
    const kbd = document.createElement("kbd");
    kbd.className = kernelClass("Kbd");
    kbd.setAttribute("data-slot", "kbd");
    this.native = kbd;
    this.append(kbd);
    this.render();
  }

  protected syncAttr() {
    this.render();
  }

  private render() {
    const kbd = this.native;
    if (!kbd) return;
    const platformAttr = this.getAttribute("platform");
    const platform =
      platformAttr === "apple" || platformAttr === "other"
        ? platformAttr
        : detectApple()
          ? "apple"
          : "other";
    const aliases = platform === "apple" ? APPLE_ALIASES : OTHER_ALIASES;
    const keys = (this.getAttribute("keys") ?? "").split(/\s+/).filter(Boolean);
    kbd.dataset.platform = platform;
    kbd.replaceChildren();

    if (keys.length === 0) {
      delete kbd.dataset.combo;
      const text = this.authored.length === 1 && this.authored[0]!.nodeType === Node.TEXT_NODE
        ? (this.authored[0]!.textContent ?? "").trim()
        : null;
      if (text && SPOKEN[text]) kbd.append(...keyLabel(text));
      else kbd.append(...this.authored);
      return;
    }

    kbd.dataset.combo = "true";
    const separator = this.getAttribute("separator") ?? "+";
    keys.forEach((key, index) => {
      if (index > 0) {
        const sep = document.createElement("span");
        sep.className = kernelClass("Kbd", "separator");
        sep.setAttribute("data-slot", "kbd-separator");
        sep.textContent = separator;
        kbd.append(sep);
      }
      const keyEl = document.createElement("kbd");
      keyEl.className = kernelClass("Kbd", "key");
      keyEl.setAttribute("data-slot", "kbd-key");
      keyEl.append(...keyLabel(aliases[key] ?? key));
      kbd.append(keyEl);
    });
  }
}

customElements.define("kernel-kbd", KernelKbd);
