// @ts-check
/**
 * ESLint rules for Kernel UI.
 *
 * The mistakes these catch are the ones people and coding agents make most
 * often when writing Kernel code: props carried over from other libraries,
 * invalid values, fields without a label, icon-only buttons without a name.
 * Every message names the fix, so an agent running lint can correct itself
 * without another lookup.
 *
 * Components are recognised by their import from "@kernelui-lib/react"
 * (aliases included), never by name alone, so a local <Button> from another
 * library is left alone. Exact props come from the API extracted from
 * Kernel's source at build time (data.js, generated from api.json).
 */
import { FIELD_COMPONENTS, FOREIGN_PROPS, PROPS, REPLACEMENTS } from "./data.js";

const UNIVERSAL = new Set([
  "key", "ref", "id", "style", "className", "children", "title", "role", "tabIndex", "hidden", "lang", "dir",
  "slot", "type", "name", "value", "defaultValue", "placeholder", "required", "disabled", "readOnly", "autoFocus",
  "autoComplete", "href", "target", "rel", "download", "form", "min", "max", "step", "minLength", "maxLength",
  "pattern", "multiple", "accept", "alt", "src", "width", "height", "open", "inputMode", "spellCheck",
  "draggable", "suppressHydrationWarning", "translate", "contentEditable",
]);

const docsUrl = (rule) => `https://www.kernelui.com/agents/#lint-${rule}`;

/** Local JSX name → Kernel export name, from this file's imports. */
function kernelImports(context) {
  const map = new Map();
  for (const node of context.sourceCode.ast.body) {
    if (node.type !== "ImportDeclaration" || node.source.value !== "@kernelui-lib/react") continue;
    for (const spec of node.specifiers) {
      if (spec.type === "ImportSpecifier") {
        const imported = spec.imported.type === "Identifier" ? spec.imported.name : String(spec.imported.value);
        map.set(spec.local.name, imported);
      }
    }
  }
  return map;
}

function jsxName(node) {
  return node.name.type === "JSXIdentifier" ? node.name.name : null;
}

function attrs(opening) {
  const out = new Map();
  let spread = false;
  for (const attr of opening.attributes) {
    if (attr.type === "JSXSpreadAttribute") spread = true;
    else if (attr.name.type === "JSXIdentifier") out.set(attr.name.name, attr);
    else out.set(`${attr.name.namespace.name}:${attr.name.name.name}`, attr);
  }
  return { map: out, spread };
}

function stringValue(attr) {
  if (!attr.value) return null;
  if (attr.value.type === "Literal" && typeof attr.value.value === "string") return attr.value.value;
  if (
    attr.value.type === "JSXExpressionContainer" &&
    attr.value.expression.type === "Literal" &&
    typeof attr.value.expression.value === "string"
  )
    return attr.value.expression.value;
  return null;
}

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** A near miss: close enough to be a typo; "xl" doesn't match "sm". */
function isTypo(a, b) {
  return distance(a.toLowerCase(), b.toLowerCase()) <= Math.min(2, Math.floor(Math.min(a.length, b.length) / 3));
}

/** Calls `visit(exportName, openingElement)` for each Kernel component used. */
function forKernelElements(context, visit) {
  let imports;
  return {
    JSXOpeningElement(node) {
      imports ??= kernelImports(context);
      const local = jsxName(node);
      const exported = local && imports.get(local);
      if (exported) visit(exported, node);
    },
  };
}

const hasChildren = (opening) => {
  const element = opening.parent;
  return !opening.selfClosing && element.children.some((c) => !(c.type === "JSXText" && c.value.trim() === ""));
};

/** @type {Record<string, import("eslint").Rule.RuleModule>} */
const rules = {
  "no-foreign-props": {
    meta: {
      type: "problem",
      docs: { description: "Disallow props from other component libraries (asChild, leftIcon, isDisabled…) on Kernel components", url: docsUrl("no-foreign-props") },
      messages: { foreign: "<{{component}}> has no `{{prop}}` prop. Kernel's equivalent: {{fix}}." },
      schema: [],
    },
    create(context) {
      return forKernelElements(context, (component, node) => {
        for (const [name, attr] of attrs(node).map) {
          const fix = FOREIGN_PROPS[name];
          if (fix && !(PROPS[component]?.props ?? []).some((p) => p.name === name)) {
            context.report({ node: attr, messageId: "foreign", data: { component, prop: name, fix } });
          }
        }
      });
    },
  },

  "valid-prop-values": {
    meta: {
      type: "problem",
      docs: { description: "Require string values of literal-union props (variant, size…) to be one Kernel accepts", url: docsUrl("valid-prop-values") },
      messages: {
        invalid: '<{{component}} {{prop}}="{{value}}"> isn\'t valid.{{suggestion}} Allowed: {{allowed}}.',
      },
      schema: [],
    },
    create(context) {
      return forKernelElements(context, (component, node) => {
        const props = PROPS[component]?.props ?? [];
        for (const [name, attr] of attrs(node).map) {
          const prop = props.find((p) => p.name === name);
          if (!prop || !/^"[^"]*"(\s*\|\s*"[^"]*")*$/.test(prop.type)) continue;
          const value = stringValue(attr);
          if (value === null) continue;
          const allowed = [...prop.type.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
          if (allowed.includes(value)) continue;
          const close = allowed.find((a) => isTypo(a, value));
          context.report({
            node: attr,
            messageId: "invalid",
            data: {
              component,
              prop: name,
              value,
              suggestion: close ? ` Did you mean "${close}"?` : "",
              allowed: allowed.map((a) => `"${a}"`).join(", "),
            },
          });
        }
      });
    },
  },

  "no-unknown-props": {
    meta: {
      type: "suggestion",
      docs: { description: "Flag props a Kernel component doesn't have, with the closest real prop", url: docsUrl("no-unknown-props") },
      messages: {
        typo: "<{{component}}> has no `{{prop}}` prop. Did you mean `{{close}}`?",
        unknown: "<{{component}}> has no `{{prop}}` prop. Its props: {{props}}.",
      },
      schema: [],
    },
    create(context) {
      return forKernelElements(context, (component, node) => {
        const info = PROPS[component];
        if (!info) return;
        const own = info.props.map((p) => p.name);
        for (const [name, attr] of attrs(node).map) {
          if (own.includes(name) || UNIVERSAL.has(name) || FOREIGN_PROPS[name]) continue;
          if (/^(aria|data)-/.test(name) || /^on[A-Z]/.test(name)) continue;
          const close = own.find((p) => isTypo(p, name));
          if (close) context.report({ node: attr, messageId: "typo", data: { component, prop: name, close } });
          // Components that extend native attributes accept the element's own
          // attributes, which can't be enumerated here; only flag near misses.
          else if (info.extends.length === 0)
            context.report({ node: attr, messageId: "unknown", data: { component, prop: name, props: own.map((p) => `\`${p}\``).join(", ") } });
        }
      });
    },
  },

  "field-requires-label": {
    meta: {
      type: "problem",
      docs: { description: "Require `label` on Kernel form fields (use hideLabel to hide it visually)", url: docsUrl("field-requires-label") },
      messages: {
        missing: "<{{component}}> needs a `label`: it's the field's accessible name and always renders as a real <label>. Use `hideLabel` to hide it visually; never omit it.",
      },
      schema: [],
    },
    create(context) {
      return forKernelElements(context, (component, node) => {
        if (!FIELD_COMPONENTS.includes(component)) return;
        const { map, spread } = attrs(node);
        if (!map.has("label") && !spread) context.report({ node, messageId: "missing", data: { component } });
      });
    },
  },

  "icon-button-requires-label": {
    meta: {
      type: "problem",
      docs: { description: "Require an accessible name on icon-only Kernel Buttons", url: docsUrl("icon-button-requires-label") },
      messages: { missing: "An icon-only <Button> needs `aria-label` (or `aria-labelledby`) so screen readers can name it." },
      schema: [],
    },
    create(context) {
      return forKernelElements(context, (component, node) => {
        if (component !== "Button") return;
        const { map, spread } = attrs(node);
        if (spread || map.has("aria-label") || map.has("aria-labelledby")) return;
        if ((map.has("iconStart") || map.has("iconEnd")) && !hasChildren(node)) {
          context.report({ node, messageId: "missing" });
        }
      });
    },
  },

  "no-clickable-non-interactive": {
    meta: {
      type: "problem",
      docs: { description: "Disallow click handlers on non-interactive elements; use Kernel's Button", url: docsUrl("no-clickable-non-interactive") },
      messages: {
        clickable: "A <{{tag}}> with a click handler gets no keyboard or focus support. Use Kernel's <Button> (or <Button render={<a … />}> for navigation).",
      },
      schema: [],
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          const tag = jsxName(node);
          if (!tag || !["div", "span", "li", "td", "img", "p", "section", "article"].includes(tag)) return;
          const { map } = attrs(node);
          if (map.has("onClick") && !map.has("role")) context.report({ node, messageId: "clickable", data: { tag } });
        },
      };
    },
  },

  "no-raw-colors": {
    meta: {
      type: "suggestion",
      docs: { description: "Prefer Kernel colour tokens over raw colours in inline styles", url: docsUrl("no-raw-colors") },
      messages: {
        raw: "Raw colour `{{value}}`: read a token instead (var(--kernel-color-text), -surface, -accent, -border…) so it follows the theme and dark mode.",
      },
      schema: [],
    },
    create(context) {
      const RAW = /(^|[^\w-])(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/;
      return {
        JSXAttribute(node) {
          if (node.name.name !== "style" || node.value?.type !== "JSXExpressionContainer") return;
          const expr = node.value.expression;
          if (expr.type !== "ObjectExpression") return;
          for (const prop of expr.properties) {
            if (prop.type !== "Property" || prop.value.type !== "Literal" || typeof prop.value.value !== "string") continue;
            const value = prop.value.value;
            if (RAW.test(value) && !/var\(--[\w-]+,/.test(value)) {
              context.report({ node: prop.value, messageId: "raw", data: { value } });
            }
          }
        },
      };
    },
  },

  "prefer-kernel-components": {
    meta: {
      type: "suggestion",
      docs: { description: "Suggest Kernel components in place of shadcn/ui or Radix imports", url: docsUrl("prefer-kernel-components") },
      messages: { replace: '"{{source}}" has a Kernel equivalent: {{component}} from "@kernelui-lib/react" ({{url}}).' },
      schema: [],
    },
    create(context) {
      return {
        ImportDeclaration(node) {
          const source = String(node.source.value);
          const shadcn = source.match(/^@\/components\/ui\/([\w-]+)$/)?.[1];
          const radix = source.startsWith("@radix-ui/react-") ? source : null;
          const match = REPLACEMENTS.find((r) => (shadcn ? r.shadcn.includes(shadcn) : radix ? r.radix.includes(radix) : false));
          if (match) context.report({ node, messageId: "replace", data: { source, component: match.component, url: match.url } });
        },
      };
    },
  },
};

const plugin = {
  meta: { name: "@kernelui-lib/eslint-plugin", version: "__VERSION__" },
  rules,
  configs: {},
};

/** Flat config: `export default [kernel.configs.recommended]`. */
plugin.configs.recommended = {
  name: "kernel/recommended",
  plugins: { kernel: plugin },
  rules: {
    "kernel/no-foreign-props": "error",
    "kernel/valid-prop-values": "error",
    "kernel/field-requires-label": "error",
    "kernel/icon-button-requires-label": "error",
    "kernel/no-clickable-non-interactive": "error",
    "kernel/no-unknown-props": "warn",
    "kernel/no-raw-colors": "warn",
    "kernel/prefer-kernel-components": "warn",
  },
};

export default plugin;
