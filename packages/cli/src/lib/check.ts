/**
 * A fast, heuristic review of code written against Kernel: the mistakes
 * agents (and people) make most often, each with the fix spelled out so the
 * author can correct it without another lookup. Exposed as the MCP
 * `check_code` tool and `kernel check`.
 *
 * Deliberately regex-and-scanner based rather than a full parser: it has to
 * accept a JSX fragment, a whole file, an HTML snippet or a CSS block, and
 * a false negative is cheaper here than refusing to run.
 */
import { api, type ComponentApi } from "./agent.js";
import { components } from "./registry.js";

export interface Finding {
  rule: string;
  severity: "error" | "warning";
  line: number;
  message: string;
}

// Attributes any JSX element may take, beyond a component's own props.
const UNIVERSAL = new Set([
  "key", "ref", "id", "style", "className", "children", "title", "role", "tabIndex", "hidden", "lang", "dir",
  "slot", "type", "name", "value", "defaultValue", "placeholder", "required", "disabled", "readOnly", "autoFocus",
  "autoComplete", "href", "target", "rel", "download", "form", "min", "max", "step", "minLength", "maxLength",
  "pattern", "multiple", "accept", "alt", "src", "width", "height", "open", "inputMode", "spellCheck", "draggable",
  "suppressHydrationWarning", "translate", "contentEditable",
]);

/** Props other libraries use, with Kernel's name for the same idea. */
const FOREIGN_PROPS: Record<string, string> = {
  asChild: "`render={<a href=… />}` (Kernel uses a render prop, not asChild)",
  leftIcon: "`iconStart`",
  startIcon: "`iconStart`",
  leftSection: "`iconStart`",
  startContent: "`iconStart`",
  rightIcon: "`iconEnd`",
  endIcon: "`iconEnd`",
  rightSection: "`iconEnd`",
  endContent: "`iconEnd`",
  isDisabled: "`disabled`",
  isLoading: "`loading`",
  isInvalid: "`invalid`",
  isRequired: "`required`",
  colorScheme: "`variant`",
  intent: "`variant`",
  helperText: "`description`",
  helpText: "`description`",
  error: "`invalid` plus `errorMessage`",
  onValueChanged: "`onValueChange`",
};

const FIELD_COMPONENTS = ["TextField", "Textarea", "Select", "Combobox", "TagInput", "NumberField", "ColorPicker", "Slider", "FileUpload"];

function lineOf(code: string, index: number) {
  return code.slice(0, index).split("\n").length;
}

/** Scans a JSX opening tag from `<Name`, respecting braces and quotes. */
function readOpeningTag(code: string, start: number) {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < code.length; i++) {
    const ch = code[i]!;
    if (quote) {
      if (ch === quote && code[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return { text: code.slice(start, i + 1), selfClosing: code[i - 1] === "/" };
  }
  return null;
}

/** Attribute names at the top level of an opening tag. */
function attributeNames(tag: string) {
  const names: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  const body = tag.replace(/^<[\w.]+/, "");
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") {
      if (depth === 0 && body.slice(i, i + 4) === "{...") names.push("...spread");
      depth++;
      continue;
    }
    if (ch === "}") {
      depth--;
      continue;
    }
    if (depth > 0) continue;
    if (/[\w\-:]/.test(ch)) current += ch;
    else {
      if (current) names.push(current);
      current = "";
    }
  }
  if (current) names.push(current);
  return names.filter((n) => n !== "/" && n !== "");
}

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length]![b.length]!;
}

/** A near-miss: close enough to be a typo, scaled so "xl" doesn't match "sm". */
function isTypo(a: string, b: string) {
  return distance(a.toLowerCase(), b.toLowerCase()) <= Math.min(2, Math.floor(Math.min(a.length, b.length) / 3));
}

const reactOwners = new Map<string, ComponentApi["react"][string]>();
for (const componentApi of Object.values(api)) {
  for (const [name, info] of Object.entries(componentApi.react)) reactOwners.set(name, info);
}

export function checkCode(code: string): Finding[] {
  const findings: Finding[] = [];
  const add = (rule: string, severity: Finding["severity"], index: number, message: string) =>
    findings.push({ rule, severity, line: lineOf(code, index), message });

  // Kernel components: unknown or foreign props, labels, icon-only names.
  for (const match of code.matchAll(/<([A-Z][\w]*)(?=[\s/>])/g)) {
    const name = match[1]!;
    const info = reactOwners.get(name);
    if (!info) continue;
    const tag = readOpeningTag(code, match.index!);
    if (!tag) continue;
    const attrs = attributeNames(tag.text);
    const own = new Set(info.props.map((p) => p.name));
    for (const attr of attrs) {
      if (attr === "...spread" || own.has(attr) || UNIVERSAL.has(attr)) continue;
      if (/^(aria|data)-/.test(attr) || /^on[A-Z]/.test(attr)) continue;
      if (FOREIGN_PROPS[attr]) {
        add("foreign-prop", "error", match.index!, `<${name}> has no \`${attr}\` prop. Kernel's equivalent: ${FOREIGN_PROPS[attr]}.`);
        continue;
      }
      // Components that extend native attributes accept the element's own
      // attributes, which this list can't enumerate; only flag near-misses.
      const close = [...own].find((p) => isTypo(p, attr));
      if (close) add("unknown-prop", "warning", match.index!, `<${name}> has no \`${attr}\` prop. Did you mean \`${close}\`?`);
      else if (info.extends.length === 0)
        add("unknown-prop", "warning", match.index!, `<${name}> has no \`${attr}\` prop. Its props: ${[...own].map((p) => `\`${p}\``).join(", ")}.`);
    }

    // String values for literal-union props: variant="primry" → suggest.
    for (const valueMatch of tag.text.matchAll(/\s([\w-]+)="([^"]*)"/g)) {
      const prop = info.props.find((p) => p.name === valueMatch[1]);
      if (!prop || !/^"[^"]*"(\s*\|\s*"[^"]*")*$/.test(prop.type)) continue;
      const allowed = [...prop.type.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
      const value = valueMatch[2]!;
      if (allowed.includes(value)) continue;
      const close = allowed.find((a) => isTypo(a, value));
      add(
        "invalid-value",
        "error",
        match.index!,
        `<${name} ${prop.name}="${value}"> isn't valid${close ? `; did you mean "${close}"?` : "."} Allowed: ${allowed.map((a) => `"${a}"`).join(", ")}.`,
      );
    }

    if (FIELD_COMPONENTS.includes(name) && !attrs.includes("label") && !attrs.includes("...spread")) {
      add(
        "field-label",
        "error",
        match.index!,
        `<${name}> needs a \`label\`: it's the field's accessible name and always renders as a real <label>. Use \`hideLabel\` to hide it visually, never omit it.`,
      );
    }

    if (name === "Button" && (attrs.includes("iconStart") || attrs.includes("iconEnd")) && tag.selfClosing) {
      if (!attrs.includes("aria-label") && !attrs.includes("aria-labelledby") && !attrs.includes("...spread")) {
        add("icon-only-label", "error", match.index!, "An icon-only <Button> needs `aria-label` so screen readers can name it.");
      }
    }
  }

  // Clickable elements that aren't controls.
  for (const match of code.matchAll(/<(div|span|li|td|img)\b[^>]*\bon[Cc]lick\b/g)) {
    add(
      "clickable-non-control",
      "error",
      match.index!,
      `A <${match[1]}> with a click handler gets no keyboard or focus support. Use Kernel's <Button> (or <Button render={<a … />}> for navigation).`,
    );
  }

  // Raw colours instead of tokens.
  for (const match of code.matchAll(/(?<![\w-])(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/g)) {
    const before = code.slice(Math.max(0, match.index! - 40), match.index!);
    if (/var\(--[\w-]+,\s*$/.test(before)) continue; // fallback inside var()
    add(
      "raw-colour",
      "warning",
      match.index!,
      `Raw colour \`${match[1]}\`: read a token instead (--kernel-color-text, -surface, -accent, -border…) so it follows the theme and dark mode.`,
    );
  }

  // Hand-picked pill radius.
  for (const match of code.matchAll(/border-radius\s*:\s*(9{3,}px|50%)|borderRadius\s*:\s*["']?(9{3,}px|50%)/g)) {
    add(
      "radius",
      "warning",
      match.index!,
      "Hand-picked pill radius: use var(--kernel-radius-control) (it becomes a pill when the theme asks for one), or a container/sheet radius with its paired padding.",
    );
  }

  // Imports from libraries Kernel replaces.
  for (const match of code.matchAll(/from\s+["'](@\/components\/ui\/([\w-]+)|@radix-ui\/react-([\w-]+))["']/g)) {
    const shadcn = match[2];
    const radix = match[3];
    const entry = components.find((c) =>
      shadcn ? c.shadcnAliases?.includes(shadcn) : c.radixPackages?.includes(`@radix-ui/react-${radix}`),
    );
    if (entry) {
      add(
        "replaceable-import",
        "warning",
        match.index!,
        `\`${match[1]}\` has a Kernel equivalent: ${entry.reactExports[0]} from "@kernelui-lib/react" (${entry.docsUrl}).`,
      );
    }
  }

  return findings.sort((a, b) => a.line - b.line);
}

export function formatFindings(findings: Finding[]) {
  if (findings.length === 0) return "No issues found.";
  return findings.map((f) => `- line ${f.line} · ${f.severity} · ${f.rule}: ${f.message}`).join("\n");
}
