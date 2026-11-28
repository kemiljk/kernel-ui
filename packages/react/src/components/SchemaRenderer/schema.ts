/*
 * Kernel UI schema — the JSON a model returns so Kernel can render it.
 *
 * This file is framework-free and is kept byte-identical in
 * `@kernelui-lib/react` and `@kernelui-lib/elements` (a test compares the
 * two copies). Everything an agent or a renderer needs comes from the one
 * `SCHEMA_NODE_SPECS` table below: the TypeScript types are checked against it,
 * and the JSON Schema document (`kernelSchemaJson`), the prompt snippet
 * (`schemaPrompt`) and the validator (`sanitizeSchema`) are all generated
 * from it, so the four can't drift apart.
 *
 * The subset is deliberately presentational and form-shaped. There is no
 * node that takes raw HTML, no event handler prop, no style prop and no
 * class prop: a model can lay things out and ask for input, and every
 * button or form submission comes back to the host as data
 * (`{ action, payload, values }`) instead of executing anything.
 */

/** The schema version this build renders. Bumped only for a breaking
 * change to node shapes; adding a node type or an optional prop is not
 * breaking and keeps the number. */
export const SCHEMA_VERSION = 1;

/** Plain JSON, the only shape a `payload` may take. */
export type SchemaJsonValue =
  | string
  | number
  | boolean
  | null
  | SchemaJsonValue[]
  | { [key: string]: SchemaJsonValue };

export type SchemaGap = "none" | "xs" | "sm" | "md" | "lg";

export interface SchemaStackProps {
  direction?: "vertical" | "horizontal";
  gap?: SchemaGap;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}

export interface SchemaTextProps {
  text?: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  weight?: "regular" | "medium" | "bold";
}

export interface SchemaHeadingProps {
  text?: string;
  level?: 2 | 3 | 4 | 5 | 6;
}

export interface SchemaButtonProps {
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  /** Name of the action the host receives in `onAction`. */
  action?: string;
  /** Any JSON, passed back untouched in `onAction`. */
  payload?: SchemaJsonValue;
  /** Inside a `Form`: submit it (running native validation) instead of
   * firing the button's own action. */
  submit?: boolean;
  disabled?: boolean;
}

export interface SchemaBadgeProps {
  text?: string;
  variant?: "neutral" | "accent" | "success" | "warning" | "danger";
}

export interface SchemaCardProps {
  title?: string;
  description?: string;
}

export interface SchemaFormProps {
  /** Name of the action the host receives when the form is submitted. */
  action?: string;
  payload?: SchemaJsonValue;
}

export interface SchemaTextFieldProps {
  name?: string;
  label?: string;
  type?: "text" | "email" | "number" | "password" | "search" | "tel" | "url";
  placeholder?: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
}

export interface SchemaSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SchemaSelectProps {
  name?: string;
  label?: string;
  options?: SchemaSelectOption[];
  description?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface SchemaCheckboxProps {
  name?: string;
  label?: string;
  defaultChecked?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export interface SchemaSwitchProps {
  name?: string;
  label?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export interface SchemaTableColumn {
  key: string;
  label: string;
}

export type SchemaTableCell = string | number | boolean | null;

export interface SchemaTableProps {
  caption?: string;
  columns?: SchemaTableColumn[];
  rows?: Record<string, SchemaTableCell>[];
}

export interface SchemaCalloutProps {
  title?: string;
  text?: string;
  variant?: "info" | "success" | "warning" | "danger";
}

export interface SchemaSeparatorProps {
  orientation?: "horizontal" | "vertical";
}

export interface SchemaImageProps {
  /** http(s) or relative. Anything else is dropped. */
  src?: string;
  /** Required. `""` marks the image decorative. */
  alt?: string;
  width?: number;
  height?: number;
}

export interface SchemaLinkProps {
  /** http(s), mailto: or relative. Anything else is dropped. */
  href?: string;
  text?: string;
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  external?: boolean;
}

export interface SchemaProgressProps {
  label?: string;
  value?: number;
  max?: number;
}

/** Every node type, mapped to its props. */
export interface SchemaPropsByType {
  Stack: SchemaStackProps;
  Text: SchemaTextProps;
  Heading: SchemaHeadingProps;
  Button: SchemaButtonProps;
  Badge: SchemaBadgeProps;
  Card: SchemaCardProps;
  Form: SchemaFormProps;
  TextField: SchemaTextFieldProps;
  Select: SchemaSelectProps;
  Checkbox: SchemaCheckboxProps;
  Switch: SchemaSwitchProps;
  Table: SchemaTableProps;
  Callout: SchemaCalloutProps;
  Separator: SchemaSeparatorProps;
  Image: SchemaImageProps;
  Link: SchemaLinkProps;
  Progress: SchemaProgressProps;
}

export type SchemaNodeType = keyof SchemaPropsByType;

/** One node. `children` is a list of nodes or plain strings; which of
 * those a type accepts is in its spec (`block`, `inline` or none). */
export type SchemaNode = {
  [K in SchemaNodeType]: {
    type: K;
    /** Optional stable key, so a streaming re-render keeps the same DOM. */
    id?: string;
    props?: SchemaPropsByType[K];
    children?: SchemaChild[];
  };
}[SchemaNodeType];

export type SchemaChild = SchemaNode | string;

/** The versioned envelope. A renderer also accepts a bare node or an array
 * of nodes, treated as `{ version: SCHEMA_VERSION, root }`. */
export interface SchemaDocument {
  version: number;
  root: SchemaChild | SchemaChild[];
}

export type SchemaIssueCode =
  | "invalid-json"
  | "unsupported-version"
  | "invalid-node"
  | "unknown-type"
  | "unknown-prop"
  | "invalid-prop"
  | "missing-prop"
  | "unsafe-url"
  | "invalid-child"
  | "too-deep"
  | "too-many-nodes";

export interface SchemaIssue {
  code: SchemaIssueCode;
  /** JSONPath-ish location, e.g. `root.children[2].props.href`. */
  path: string;
  message: string;
  type?: string;
  prop?: string;
}

/** What an action carries back to the host. Nothing is executed. */
export interface SchemaAction {
  action: string;
  payload?: SchemaJsonValue;
  /** Every named form control's current value. */
  values: SchemaValues;
}

export type SchemaValues = Record<string, string | boolean>;

/* ------------------------------------------------------------------ */
/* Specs                                                               */
/* ------------------------------------------------------------------ */

export type SchemaPropSpec =
  | { kind: "string"; max?: number; describe?: string }
  | { kind: "enum"; values: readonly (string | number)[]; describe?: string }
  | { kind: "boolean"; describe?: string }
  | { kind: "number"; min?: number; max?: number; describe?: string }
  | { kind: "url"; schemes: readonly ("http" | "https" | "mailto")[]; describe?: string }
  | { kind: "json"; describe?: string }
  | { kind: "options"; describe?: string }
  | { kind: "columns"; describe?: string }
  | { kind: "rows"; describe?: string };

export type SchemaChildrenSpec = "block" | "inline" | "none";

export interface SchemaNodeSpec<P> {
  describe: string;
  children: SchemaChildrenSpec;
  props: { [K in keyof Required<P>]: SchemaPropSpec };
  /** Props a node is unusable without. The renderer reports them as
   * `missing-prop` and falls back (a label falls back to `name`). */
  required?: readonly (keyof P)[];
}

const TEXT_MAX = 10_000;
const SHORT_MAX = 500;
const LINK_SCHEMES = ["http", "https", "mailto"] as const;
const IMAGE_SCHEMES = ["http", "https"] as const;

export const SCHEMA_NODE_SPECS: { [K in SchemaNodeType]: SchemaNodeSpec<SchemaPropsByType[K]> } = {
  Stack: {
    describe: "Layout column or row.",
    children: "block",
    props: {
      direction: { kind: "enum", values: ["vertical", "horizontal"] },
      gap: { kind: "enum", values: ["none", "xs", "sm", "md", "lg"] },
      align: { kind: "enum", values: ["start", "center", "end", "stretch"] },
      justify: { kind: "enum", values: ["start", "center", "end", "between"] },
      wrap: { kind: "boolean" },
    },
  },
  Text: {
    describe: "A paragraph. Use `text` or string/Link children.",
    children: "inline",
    props: {
      text: { kind: "string", max: TEXT_MAX },
      tone: { kind: "enum", values: ["default", "muted", "success", "warning", "danger"] },
      size: { kind: "enum", values: ["sm", "md", "lg"] },
      weight: { kind: "enum", values: ["regular", "medium", "bold"] },
    },
  },
  Heading: {
    describe: "A section heading.",
    children: "inline",
    props: {
      text: { kind: "string", max: SHORT_MAX },
      level: { kind: "enum", values: [2, 3, 4, 5, 6], describe: "default 3" },
    },
  },
  Button: {
    describe: "Emits onAction({ action, payload, values }); never navigates.",
    children: "none",
    required: ["label"],
    props: {
      label: { kind: "string", max: SHORT_MAX },
      variant: { kind: "enum", values: ["primary", "secondary", "ghost", "danger"] },
      size: { kind: "enum", values: ["sm", "md", "lg"] },
      action: { kind: "string", max: SHORT_MAX },
      payload: { kind: "json" },
      submit: { kind: "boolean", describe: "submit the enclosing Form" },
      disabled: { kind: "boolean" },
    },
  },
  Badge: {
    describe: "Small status chip.",
    children: "none",
    props: {
      text: { kind: "string", max: SHORT_MAX },
      variant: { kind: "enum", values: ["neutral", "accent", "success", "warning", "danger"] },
    },
  },
  Card: {
    describe: "Bordered group with an optional title.",
    children: "block",
    props: {
      title: { kind: "string", max: SHORT_MAX },
      description: { kind: "string", max: TEXT_MAX },
    },
  },
  Form: {
    describe: "Collects its fields; a submit Button emits onAction with the form's action.",
    children: "block",
    props: {
      action: { kind: "string", max: SHORT_MAX },
      payload: { kind: "json" },
    },
  },
  TextField: {
    describe: "Labelled text input. `name` keys its value.",
    children: "none",
    required: ["name", "label"],
    props: {
      name: { kind: "string", max: SHORT_MAX },
      label: { kind: "string", max: SHORT_MAX },
      type: { kind: "enum", values: ["text", "email", "number", "password", "search", "tel", "url"] },
      placeholder: { kind: "string", max: SHORT_MAX },
      description: { kind: "string", max: SHORT_MAX },
      defaultValue: { kind: "string", max: TEXT_MAX },
      required: { kind: "boolean" },
      disabled: { kind: "boolean" },
      hideLabel: { kind: "boolean" },
    },
  },
  Select: {
    describe: "Native select.",
    children: "none",
    required: ["name", "label", "options"],
    props: {
      name: { kind: "string", max: SHORT_MAX },
      label: { kind: "string", max: SHORT_MAX },
      options: { kind: "options", describe: "[{ value, label, disabled? }]" },
      description: { kind: "string", max: SHORT_MAX },
      defaultValue: { kind: "string", max: SHORT_MAX },
      required: { kind: "boolean" },
      disabled: { kind: "boolean" },
    },
  },
  Checkbox: {
    describe: "Checkbox; its value is a boolean.",
    children: "none",
    required: ["name", "label"],
    props: {
      name: { kind: "string", max: SHORT_MAX },
      label: { kind: "string", max: SHORT_MAX },
      defaultChecked: { kind: "boolean" },
      required: { kind: "boolean" },
      disabled: { kind: "boolean" },
    },
  },
  Switch: {
    describe: "On/off switch; its value is a boolean.",
    children: "none",
    required: ["name", "label"],
    props: {
      name: { kind: "string", max: SHORT_MAX },
      label: { kind: "string", max: SHORT_MAX },
      defaultChecked: { kind: "boolean" },
      disabled: { kind: "boolean" },
    },
  },
  Table: {
    describe: "Data table; cells are plain text.",
    children: "none",
    required: ["columns"],
    props: {
      caption: { kind: "string", max: SHORT_MAX },
      columns: { kind: "columns", describe: "[{ key, label }]" },
      rows: { kind: "rows", describe: "[{ [key]: string | number | boolean | null }]" },
    },
  },
  Callout: {
    describe: "Highlighted message. Use `text` or string/Link children.",
    children: "inline",
    props: {
      title: { kind: "string", max: SHORT_MAX },
      text: { kind: "string", max: TEXT_MAX },
      variant: { kind: "enum", values: ["info", "success", "warning", "danger"] },
    },
  },
  Separator: {
    describe: "Divider.",
    children: "none",
    props: {
      orientation: { kind: "enum", values: ["horizontal", "vertical"] },
    },
  },
  Image: {
    describe: "Image. `alt` is required (\"\" if decorative).",
    children: "none",
    required: ["src", "alt"],
    props: {
      src: { kind: "url", schemes: IMAGE_SCHEMES },
      alt: { kind: "string", max: SHORT_MAX },
      width: { kind: "number", min: 1, max: 4096 },
      height: { kind: "number", min: 1, max: 4096 },
    },
  },
  Link: {
    describe: "Hyperlink. Use `text` or string children.",
    children: "inline",
    required: ["href"],
    props: {
      href: { kind: "url", schemes: LINK_SCHEMES },
      text: { kind: "string", max: SHORT_MAX },
      external: { kind: "boolean", describe: "open in a new tab" },
    },
  },
  Progress: {
    describe: "Progress bar; omit `value` for indeterminate.",
    children: "none",
    props: {
      label: { kind: "string", max: SHORT_MAX },
      value: { kind: "number", min: 0 },
      max: { kind: "number", min: 0 },
    },
  },
};

export const SCHEMA_NODE_TYPES = Object.keys(SCHEMA_NODE_SPECS) as SchemaNodeType[];

/** Inline children: plain strings and these node types only. */
const INLINE_TYPES: ReadonlySet<string> = new Set(["Link"]);

export const SCHEMA_LIMITS = {
  /** Deepest nesting rendered; anything below is dropped. */
  maxDepth: 24,
  /** Most nodes rendered from one value. */
  maxNodes: 2_000,
  /** Most rows a Table renders. */
  maxRows: 500,
  /** Most options a Select renders. */
  maxOptions: 500,
} as const;

/* ------------------------------------------------------------------ */
/* URLs                                                                */
/* ------------------------------------------------------------------ */

/**
 * Returns a URL safe to put in `href`/`src`, or `null`. Relative URLs
 * (`/a`, `./a`, `a/b`, `#x`, `?q`) and protocol-relative `//host` pass;
 * an absolute URL passes only when its scheme is in `schemes`.
 *
 * Browsers strip ASCII tab/newline anywhere and leading C0 controls and
 * spaces before parsing a URL, so `java\nscript:` and ` javascript:` are
 * scripts to them. The check runs on the URL after that same stripping,
 * and the stripped form is what's returned.
 */
export function sanitizeUrl(
  url: unknown,
  schemes: readonly string[] = LINK_SCHEMES,
): string | null {
  if (typeof url !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = url.replace(/[\t\n\r]/g, "").replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");
  if (cleaned === "") return null;
  // Backslashes are path separators to the URL parser for http(s), so
  // `\\evil.com` is protocol-relative. Normalise before looking for a scheme.
  const probe = cleaned.replace(/\\/g, "/");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe);
  if (!scheme) {
    // No scheme: relative, or a colon after the first path segment
    // (`a/b:c`), which the parser treats as a path too.
    return cleaned;
  }
  return schemes.includes(scheme[1]!.toLowerCase()) ? cleaned : null;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface SanitizedSchema {
  /** Safe, validated nodes, ready to render. */
  nodes: SchemaChild[];
  issues: SchemaIssue[];
  /** Default value of every named control, keyed by `name`. */
  defaultValues: SchemaValues;
}

export interface SchemaSanitizeOptions {
  /** Treat the value as an unfinished stream: a node with no `type` yet,
   * or a `type` that is still being typed out, is skipped without an
   * issue, since the next chunk will probably complete it. */
  partial?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeType(value: unknown): value is SchemaNodeType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SCHEMA_NODE_SPECS, value);
}

function jsonDepthOk(value: unknown, depth: number): boolean {
  if (depth > SCHEMA_LIMITS.maxDepth) return false;
  if (Array.isArray(value)) return value.every((item) => jsonDepthOk(item, depth + 1));
  if (isRecord(value)) return Object.values(value).every((item) => jsonDepthOk(item, depth + 1));
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/** Validates one prop value; returns `[ok, cleaned]`. */
function checkProp(spec: SchemaPropSpec, value: unknown): { ok: true; value: unknown } | { ok: false; unsafe?: boolean } {
  switch (spec.kind) {
    case "string":
      if (typeof value === "number" && Number.isFinite(value)) value = String(value);
      if (typeof value !== "string") return { ok: false };
      return { ok: true, value: spec.max !== undefined ? value.slice(0, spec.max) : value };
    case "enum":
      return spec.values.includes(value as string | number) ? { ok: true, value } : { ok: false };
    case "boolean":
      return typeof value === "boolean" ? { ok: true, value } : { ok: false };
    case "number": {
      const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false };
      if (spec.min !== undefined && n < spec.min) return { ok: false };
      if (spec.max !== undefined && n > spec.max) return { ok: false };
      return { ok: true, value: n };
    }
    case "url": {
      if (typeof value !== "string") return { ok: false };
      const safe = sanitizeUrl(value, spec.schemes);
      return safe === null ? { ok: false, unsafe: true } : { ok: true, value: safe };
    }
    case "json":
      return jsonDepthOk(value, 0) ? { ok: true, value } : { ok: false };
    case "options": {
      if (!Array.isArray(value)) return { ok: false };
      const options: SchemaSelectOption[] = [];
      for (const raw of value.slice(0, SCHEMA_LIMITS.maxOptions)) {
        if (typeof raw === "string") {
          options.push({ value: raw, label: raw });
          continue;
        }
        if (!isRecord(raw)) continue;
        const v = typeof raw.value === "number" ? String(raw.value) : raw.value;
        if (typeof v !== "string") continue;
        const label = typeof raw.label === "string" ? raw.label : v;
        options.push(raw.disabled === true ? { value: v, label, disabled: true } : { value: v, label });
      }
      return { ok: true, value: options };
    }
    case "columns": {
      if (!Array.isArray(value)) return { ok: false };
      const columns: SchemaTableColumn[] = [];
      for (const raw of value) {
        if (typeof raw === "string") columns.push({ key: raw, label: raw });
        else if (isRecord(raw) && typeof raw.key === "string") {
          columns.push({ key: raw.key, label: typeof raw.label === "string" ? raw.label : raw.key });
        }
      }
      return { ok: true, value: columns };
    }
    case "rows": {
      if (!Array.isArray(value)) return { ok: false };
      const rows: Record<string, SchemaTableCell>[] = [];
      for (const raw of value.slice(0, SCHEMA_LIMITS.maxRows)) {
        if (!isRecord(raw)) continue;
        const row: Record<string, SchemaTableCell> = {};
        for (const [key, cell] of Object.entries(raw)) {
          if (cell === null || ["string", "number", "boolean"].includes(typeof cell)) {
            row[key] = cell as SchemaTableCell;
          }
        }
        rows.push(row);
      }
      return { ok: true, value: rows };
    }
  }
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value === "string" ? JSON.stringify(value.slice(0, 40)) : typeof value;
}

/**
 * Validates and cleans a schema value — a `SchemaDocument`, a bare node, or
 * an array of nodes. Never throws. Unknown node types and props, invalid
 * prop values, unsafe URLs and children a type doesn't accept are dropped,
 * each with a `SchemaIssue`; whatever is left is safe to render.
 */
export function sanitizeSchema(value: unknown, options: SchemaSanitizeOptions = {}): SanitizedSchema {
  const issues: SchemaIssue[] = [];
  const defaultValues: SchemaValues = {};
  const partial = options.partial === true;
  let count = 0;
  let truncated = false;

  let roots: unknown[];
  // `root[2]` when the root is a list, plain `root` when it's one node.
  let rootIsList = true;
  if (isRecord(value) && "root" in value && !("type" in value)) {
    const version = value.version;
    if (version !== undefined && version !== SCHEMA_VERSION) {
      issues.push({
        code: "unsupported-version",
        path: "version",
        message: `Schema version ${describeValue(version)} isn't ${SCHEMA_VERSION}; rendering what this version understands.`,
      });
    }
    rootIsList = Array.isArray(value.root);
    roots = Array.isArray(value.root) ? value.root : value.root === undefined ? [] : [value.root];
  } else if (Array.isArray(value)) {
    roots = value;
  } else if (value === undefined || value === null) {
    roots = [];
  } else {
    rootIsList = false;
    roots = [value];
  }

  function walkChildren(list: unknown, accepts: SchemaChildrenSpec, path: string, depth: number, parentType: string): SchemaChild[] {
    if (list === undefined) return [];
    if (!Array.isArray(list)) {
      issues.push({ code: "invalid-child", path, message: `${parentType} children must be an array.`, type: parentType });
      return [];
    }
    if (accepts === "none") {
      if (list.length > 0) {
        issues.push({ code: "invalid-child", path, message: `${parentType} takes no children; they were dropped.`, type: parentType });
      }
      return [];
    }
    const out: SchemaChild[] = [];
    list.forEach((child, index) => {
      const childPath = `${path}[${index}]`;
      if (typeof child === "string" || typeof child === "number") {
        out.push(String(child).slice(0, TEXT_MAX));
        return;
      }
      if (accepts === "inline" && isRecord(child) && isNodeType(child.type) && !INLINE_TYPES.has(child.type)) {
        issues.push({
          code: "invalid-child",
          path: childPath,
          message: `${parentType} only takes text and Link children; a ${child.type} was dropped.`,
          type: child.type,
        });
        return;
      }
      const node = walkNode(child, childPath, depth + 1);
      if (node) out.push(node);
    });
    return out;
  }

  function walkNode(raw: unknown, path: string, depth: number): SchemaNode | null {
    if (truncated) return null;
    if (depth > SCHEMA_LIMITS.maxDepth) {
      issues.push({ code: "too-deep", path, message: `Nesting deeper than ${SCHEMA_LIMITS.maxDepth} was dropped.` });
      return null;
    }
    if (!isRecord(raw)) {
      issues.push({ code: "invalid-node", path, message: `Expected a node object, got ${describeValue(raw)}.` });
      return null;
    }
    if (!isNodeType(raw.type)) {
      if (partial && (raw.type === undefined || (typeof raw.type === "string" && SCHEMA_NODE_TYPES.some((t) => t.startsWith(raw.type as string))))) {
        return null;
      }
      issues.push({
        code: raw.type === undefined ? "invalid-node" : "unknown-type",
        path,
        message:
          raw.type === undefined
            ? "Node has no `type`; it was dropped."
            : `Unknown node type ${describeValue(raw.type)}; it was dropped.`,
        type: typeof raw.type === "string" ? raw.type : undefined,
      });
      return null;
    }
    count += 1;
    if (count > SCHEMA_LIMITS.maxNodes) {
      truncated = true;
      issues.push({ code: "too-many-nodes", path, message: `More than ${SCHEMA_LIMITS.maxNodes} nodes; the rest were dropped.` });
      return null;
    }

    const type = raw.type;
    const spec = SCHEMA_NODE_SPECS[type] as SchemaNodeSpec<Record<string, unknown>>;
    const props: Record<string, unknown> = {};
    // Props already reported as invalid, so a required one isn't reported
    // a second time as missing.
    const rejected = new Set<string>();
    const rawProps = raw.props;
    if (rawProps !== undefined && !isRecord(rawProps)) {
      issues.push({ code: "invalid-prop", path: `${path}.props`, message: `${type} props must be an object.`, type });
    }
    if (isRecord(rawProps)) {
      for (const [key, propValue] of Object.entries(rawProps)) {
        const propPath = `${path}.props.${key}`;
        const propSpec = Object.prototype.hasOwnProperty.call(spec.props, key) ? spec.props[key] : undefined;
        if (!propSpec) {
          issues.push({ code: "unknown-prop", path: propPath, message: `${type} has no prop \`${key}\`; it was dropped.`, type, prop: key });
          continue;
        }
        if (propValue === undefined || propValue === null) continue;
        const checked = checkProp(propSpec, propValue);
        if (checked.ok) {
          props[key] = checked.value;
        } else {
          rejected.add(key);
          issues.push({
            code: "unsafe" in checked && checked.unsafe ? "unsafe-url" : "invalid-prop",
            path: propPath,
            message:
              "unsafe" in checked && checked.unsafe
                ? `${type}.${key} isn't an allowed URL (${propSpec.kind === "url" ? propSpec.schemes.join(", ") : ""} or relative); it was dropped.`
                : `${type}.${key} can't be ${describeValue(propValue)}; it was dropped.`,
            type,
            prop: key,
          });
        }
      }
    }

    for (const key of spec.required ?? []) {
      if (props[key as string] === undefined && !rejected.has(key as string) && !partial) {
        issues.push({
          code: "missing-prop",
          path: `${path}.props.${String(key)}`,
          message: `${type} needs \`${String(key)}\`.`,
          type,
          prop: String(key),
        });
      }
    }

    // Fallbacks that keep the output accessible rather than dropping it.
    if ("label" in spec.props && spec.required?.includes("label") && props.label === undefined && typeof props.name === "string") {
      props.label = props.name;
    }
    if (type === "Image" && props.alt === undefined) props.alt = "";

    // Nodes that can't render at all without a prop are dropped.
    const unusable =
      (["TextField", "Select", "Checkbox", "Switch"].includes(type) && props.label === undefined) ||
      (type === "Button" && props.label === undefined) ||
      (type === "Image" && props.src === undefined) ||
      (type === "Table" && props.columns === undefined);
    if (unusable) return null;

    if (typeof props.name === "string") {
      if (type === "TextField") defaultValues[props.name] = (props.defaultValue as string | undefined) ?? "";
      if (type === "Select") {
        const opts = (props.options as SchemaSelectOption[] | undefined) ?? [];
        defaultValues[props.name] = (props.defaultValue as string | undefined) ?? opts.find((o) => !o.disabled)?.value ?? "";
      }
      if (type === "Checkbox" || type === "Switch") defaultValues[props.name] = props.defaultChecked === true;
    }

    const node: Record<string, unknown> = { type };
    if (typeof raw.id === "string" || typeof raw.id === "number") node.id = String(raw.id);
    if (Object.keys(props).length > 0) node.props = props;
    const children = walkChildren(raw.children, spec.children, `${path}.children`, depth, type);
    if (children.length > 0) node.children = children;
    return node as SchemaNode;
  }

  const nodes: SchemaChild[] = [];
  roots.forEach((raw, index) => {
    const path = rootIsList ? `root[${index}]` : "root";
    if (typeof raw === "string") {
      nodes.push(raw.slice(0, TEXT_MAX));
      return;
    }
    const node = walkNode(raw, path, 0);
    if (node) nodes.push(node);
  });

  return { nodes, issues, defaultValues };
}

/** Returns every issue in `value` without rendering it. An empty array
 * means the value renders exactly as written. */
export function validateSchemaNode(value: unknown): SchemaIssue[] {
  return sanitizeSchema(value).issues;
}

/* ------------------------------------------------------------------ */
/* Partial JSON                                                        */
/* ------------------------------------------------------------------ */

const MISSING: unique symbol = Symbol("missing");

/**
 * Parses JSON that may stop anywhere — a model's output mid-stream — by
 * closing whatever is open: an unterminated string ends where the text
 * does, open arrays and objects are closed, and a trailing key with no
 * value, a dangling comma, a half-typed `tru` or a bare `-` are dropped.
 * Text before the first `{` or `[` (a Markdown fence, a sentence) is
 * skipped. Returns `undefined` when there's nothing to parse yet or the
 * text is not JSON at all; never throws.
 *
 * Feed it the whole accumulated text on every chunk; it's linear in the
 * input, so re-parsing from the start is cheap at the sizes a UI tree
 * reaches.
 */
export function parsePartialJson(text: string): unknown {
  if (typeof text !== "string") return undefined;
  const start = text.search(/[[{]/);
  if (start === -1) return undefined;
  let i = start;
  const n = text.length;

  class SyntaxStop extends Error {}

  function ws() {
    while (i < n && (text[i] === " " || text[i] === "\n" || text[i] === "\r" || text[i] === "\t")) i++;
  }

  function parseString(): string {
    // Caller guarantees text[i] === '"'. Returns the string, cut short
    // where the input ends if it's unterminated.
    i++;
    let out = "";
    while (i < n) {
      const ch = text[i]!;
      if (ch === '"') {
        i++;
        return out;
      }
      if (ch === "\\") {
        if (i + 1 >= n) {
          i = n;
          return out;
        }
        const esc = text[i + 1]!;
        const map: Record<string, string> = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
        if (esc in map) {
          out += map[esc];
          i += 2;
          continue;
        }
        if (esc === "u") {
          const hex = text.slice(i + 2, i + 6);
          if (hex.length < 4) {
            i = n;
            return out;
          }
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new SyntaxStop();
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        throw new SyntaxStop();
      }
      out += ch;
      i++;
    }
    return out;
  }

  // True when the string that was just parsed ran into the end of input.
  function atEnd() {
    return i >= n;
  }

  const loose = /-?\d*\.?\d*(?:[eE][+-]?\d*)?/y;
  const strict = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

  function parseNumber(): number | typeof MISSING {
    loose.lastIndex = i;
    const raw = loose.exec(text)?.[0] ?? "";
    const valid = strict.exec(raw)?.[0];
    if (i + raw.length >= n) {
      // Ran into the end of input: it may still grow (`1` → `12`), which is
      // fine to show, and a dangling `.`/`e`/`-` is trimmed to its valid
      // prefix — or dropped if there isn't one yet.
      i = n;
      return valid === undefined ? MISSING : Number(valid);
    }
    if (valid === undefined || valid.length !== raw.length) throw new SyntaxStop();
    i += raw.length;
    return Number(raw);
  }

  function parseLiteral(): boolean | null | typeof MISSING {
    for (const [word, value] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      const slice = text.slice(i, i + word.length);
      if (slice === word) {
        i += word.length;
        return value;
      }
      if (i + slice.length >= n && word.startsWith(slice)) {
        i = n;
        return MISSING;
      }
    }
    throw new SyntaxStop();
  }

  function parseValue(): unknown {
    ws();
    if (i >= n) return MISSING;
    const ch = text[i]!;
    if (ch === "{") return parseObject();
    if (ch === "[") return parseArray();
    if (ch === '"') return parseString();
    if (ch === "-" || (ch >= "0" && ch <= "9")) return parseNumber();
    return parseLiteral();
  }

  function parseObject(): Record<string, unknown> {
    i++;
    const obj: Record<string, unknown> = {};
    for (;;) {
      ws();
      if (i >= n) return obj;
      if (text[i] === "}") {
        i++;
        return obj;
      }
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] !== '"') throw new SyntaxStop();
      const key = parseString();
      // A key that ran into the end of input is unfinished: drop it.
      if (atEnd()) return obj;
      ws();
      if (i >= n) return obj;
      if (text[i] !== ":") throw new SyntaxStop();
      i++;
      const value = parseValue();
      if (value === MISSING) return obj;
      // `__proto__` as an own data property, never the prototype setter.
      Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
      ws();
      if (i >= n) return obj;
      if (text[i] === ",") i++;
      else if (text[i] === "}") {
        i++;
        return obj;
      } else throw new SyntaxStop();
    }
  }

  function parseArray(): unknown[] {
    i++;
    const arr: unknown[] = [];
    for (;;) {
      ws();
      if (i >= n) return arr;
      if (text[i] === "]") {
        i++;
        return arr;
      }
      if (text[i] === ",") {
        i++;
        continue;
      }
      const value = parseValue();
      if (value === MISSING) return arr;
      arr.push(value);
      ws();
      if (i >= n) return arr;
      if (text[i] === ",") i++;
      else if (text[i] === "]") {
        i++;
        return arr;
      } else throw new SyntaxStop();
    }
  }

  try {
    return parseValue();
  } catch (error) {
    if (error instanceof SyntaxStop) return undefined;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* JSON Schema + prompt, generated from SCHEMA_NODE_SPECS                     */
/* ------------------------------------------------------------------ */

function propJsonSchema(spec: SchemaPropSpec): Record<string, unknown> {
  const description = spec.describe ? { description: spec.describe } : {};
  switch (spec.kind) {
    case "string":
      return { type: "string", ...(spec.max ? { maxLength: spec.max } : {}), ...description };
    case "enum":
      return { enum: [...spec.values], ...description };
    case "boolean":
      return { type: "boolean", ...description };
    case "number":
      return {
        type: "number",
        ...(spec.min !== undefined ? { minimum: spec.min } : {}),
        ...(spec.max !== undefined ? { maximum: spec.max } : {}),
        ...description,
      };
    case "url":
      return {
        type: "string",
        format: "uri-reference",
        description: `${spec.schemes.join(", ")} or relative URL`,
      };
    case "json":
      return { description: "Any JSON value, returned untouched in onAction." };
    case "options":
      return {
        type: "array",
        maxItems: SCHEMA_LIMITS.maxOptions,
        items: {
          type: "object",
          required: ["value", "label"],
          additionalProperties: false,
          properties: { value: { type: "string" }, label: { type: "string" }, disabled: { type: "boolean" } },
        },
      };
    case "columns":
      return {
        type: "array",
        items: {
          type: "object",
          required: ["key", "label"],
          additionalProperties: false,
          properties: { key: { type: "string" }, label: { type: "string" } },
        },
      };
    case "rows":
      return {
        type: "array",
        maxItems: SCHEMA_LIMITS.maxRows,
        items: { type: "object", additionalProperties: { type: ["string", "number", "boolean", "null"] } },
      };
  }
}

function buildJsonSchema() {
  const defs: Record<string, unknown> = {};
  for (const type of SCHEMA_NODE_TYPES) {
    const spec = SCHEMA_NODE_SPECS[type] as SchemaNodeSpec<Record<string, unknown>>;
    const props: Record<string, unknown> = {};
    for (const [key, propSpec] of Object.entries(spec.props)) props[key] = propJsonSchema(propSpec);
    const node: Record<string, unknown> = {
      type: "object",
      description: spec.describe,
      required: ["type"],
      additionalProperties: false,
      properties: {
        type: { const: type },
        id: { type: "string" },
        props: {
          type: "object",
          additionalProperties: false,
          properties: props,
          ...(spec.required?.length ? { required: [...spec.required] } : {}),
        },
        ...(spec.children === "none"
          ? {}
          : {
              children: {
                type: "array",
                items:
                  spec.children === "inline"
                    ? { anyOf: [{ type: "string" }, { $ref: "#/$defs/Link" }] }
                    : { $ref: "#/$defs/child" },
              },
            }),
      },
    };
    if (spec.required?.length) (node.required as string[]).push("props");
    defs[type] = node;
  }
  defs.node = { oneOf: SCHEMA_NODE_TYPES.map((type) => ({ $ref: `#/$defs/${type}` })) };
  defs.child = { anyOf: [{ type: "string" }, { $ref: "#/$defs/node" }] };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `urn:kernelui:schema:v${SCHEMA_VERSION}`,
    title: "Kernel UI schema",
    description:
      "A tree of presentational and form nodes that Kernel's SchemaRenderer renders with real Kernel components. Buttons and forms emit actions as data; nothing executes.",
    type: "object",
    required: ["version", "root"],
    additionalProperties: false,
    properties: {
      version: { const: SCHEMA_VERSION },
      root: { anyOf: [{ $ref: "#/$defs/child" }, { type: "array", items: { $ref: "#/$defs/child" } }] },
    },
    $defs: defs,
  };
}

/** The schema as a JSON Schema (draft 2020-12) document — also shipped as
 * `@kernelui-lib/react/schema.json` and `@kernelui-lib/elements/schema.json`.
 * Hand it to a model's structured-output / tool-input option. */
export const kernelSchemaJson = buildJsonSchema();

function propPrompt(key: string, spec: SchemaPropSpec, required: boolean): string {
  const mark = required ? "" : "?";
  let type: string;
  switch (spec.kind) {
    case "enum":
      type = spec.values.map((v) => (typeof v === "string" ? `"${v}"` : String(v))).join("|");
      break;
    case "url":
      type = `url(${spec.schemes.join("|")}|relative)`;
      break;
    case "json":
      type = "json";
      break;
    case "options":
    case "columns":
    case "rows":
      type = spec.describe ?? "array";
      break;
    default:
      type = spec.kind;
  }
  const note = spec.describe && !["options", "columns", "rows"].includes(spec.kind) ? ` (${spec.describe})` : "";
  return `${key}${mark}: ${type}${note}`;
}

function buildPrompt(): string {
  const lines = [
    `Respond with JSON for Kernel's SchemaRenderer (schema v${SCHEMA_VERSION}): {"version":${SCHEMA_VERSION},"root":Node|Node[]}.`,
    `Node = {"type":T,"props":{...},"children":[Node|string]}. Only the types and props below exist; anything else is dropped. No HTML, styles or scripts.`,
    `Buttons never navigate: they send {action,payload,values} to the app. Put inputs in a Form with a submit Button to collect values by name.`,
    "",
  ];
  for (const type of SCHEMA_NODE_TYPES) {
    const spec = SCHEMA_NODE_SPECS[type] as SchemaNodeSpec<Record<string, unknown>>;
    const required = new Set((spec.required ?? []) as string[]);
    const props = Object.entries(spec.props)
      .map(([key, propSpec]) => propPrompt(key, propSpec, required.has(key)))
      .join(", ");
    const kids = spec.children === "block" ? " children: Node[]." : spec.children === "inline" ? " children: (string|Link)[]." : "";
    lines.push(`- ${type} {${props}} — ${spec.describe}${kids}`);
  }
  lines.push(
    "",
    `Example: {"version":${SCHEMA_VERSION},"root":{"type":"Card","props":{"title":"Book a demo"},"children":[{"type":"Form","props":{"action":"book"},"children":[{"type":"TextField","props":{"name":"email","label":"Work email","type":"email","required":true}},{"type":"Button","props":{"label":"Book","variant":"primary","submit":true}}]}]}}`,
  );
  return lines.join("\n");
}

/** A compact description of the schema for a system prompt. Generated from
 * the same table the validator uses, so it never promises a prop the
 * renderer would drop. */
export const schemaPrompt = buildPrompt();
