import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCHEMA_NODE_SPECS,
  SCHEMA_NODE_TYPES,
  SCHEMA_VERSION,
  kernelSchemaJson,
  parsePartialJson,
  sanitizeSchema,
  sanitizeUrl,
  schemaPrompt,
  validateSchemaNode,
} from "./schema";

describe("schema.ts", () => {
  it("is byte-identical in @kernelui-lib/react and @kernelui-lib/elements", () => {
    const react = readFileSync(resolve(__dirname, "schema.ts"), "utf8");
    const elements = readFileSync(
      resolve(__dirname, "../../../../elements/src/components/SchemaRenderer/schema.ts"),
      "utf8",
    );
    expect(elements).toBe(react);
  });
});

describe("sanitizeUrl", () => {
  it.each([
    ["https://example.com/a?b#c", "https://example.com/a?b#c"],
    ["http://example.com", "http://example.com"],
    ["HTTPS://EXAMPLE.COM", "HTTPS://EXAMPLE.COM"],
    ["mailto:hi@example.com", "mailto:hi@example.com"],
    ["/docs", "/docs"],
    ["./a", "./a"],
    ["../a", "../a"],
    ["a/b:c", "a/b:c"],
    ["#section", "#section"],
    ["?q=1", "?q=1"],
    ["//cdn.example.com/x.png", "//cdn.example.com/x.png"],
    ["  https://example.com  ", "https://example.com"],
  ])("allows %j", (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "java\nscript:alert(1)",
    "java\tscript:alert(1)",
    "\u0000javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
    "blob:https://example.com/uuid",
    "",
    "   ",
  ])("rejects %j", (input) => {
    expect(sanitizeUrl(input)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(sanitizeUrl(42)).toBeNull();
    expect(sanitizeUrl({ href: "https://x" })).toBeNull();
  });

  it("limits schemes per use: images don't take mailto:", () => {
    expect(sanitizeUrl("mailto:a@b.c", ["http", "https"])).toBeNull();
  });
});

describe("validateSchemaNode / sanitizeSchema", () => {
  it("accepts a valid document with no issues", () => {
    const doc = {
      version: SCHEMA_VERSION,
      root: {
        type: "Card",
        props: { title: "Order" },
        children: [
          { type: "Text", props: { text: "Pick a size", tone: "muted" } },
          {
            type: "Form",
            props: { action: "order" },
            children: [
              { type: "Select", props: { name: "size", label: "Size", options: ["S", "M", { value: "L", label: "Large" }] } },
              { type: "Checkbox", props: { name: "gift", label: "Gift wrap", defaultChecked: true } },
              { type: "Button", props: { label: "Order", variant: "primary", submit: true } },
            ],
          },
        ],
      },
    };
    expect(validateSchemaNode(doc)).toEqual([]);
    const { defaultValues } = sanitizeSchema(doc);
    expect(defaultValues).toEqual({ size: "S", gift: true });
  });

  it("drops unknown node types and reports them", () => {
    const result = sanitizeSchema({
      type: "Stack",
      children: [{ type: "Script", props: { src: "x" } }, { type: "Text", props: { text: "ok" } }],
    });
    expect(result.nodes).toEqual([{ type: "Stack", children: [{ type: "Text", props: { text: "ok" } }] }]);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: "unknown-type", type: "Script", path: "root.children[0]" }),
    ]);
  });

  it("drops unknown props, including event handlers and raw HTML", () => {
    const issues = validateSchemaNode({
      type: "Text",
      props: { text: "hi", onClick: "alert(1)", dangerouslySetInnerHTML: { __html: "<b>x</b>" }, style: { color: "red" } },
    });
    expect(issues.map((i) => [i.code, i.prop])).toEqual([
      ["unknown-prop", "onClick"],
      ["unknown-prop", "dangerouslySetInnerHTML"],
      ["unknown-prop", "style"],
    ]);
  });

  it("drops invalid enum and type values", () => {
    const { nodes, issues } = sanitizeSchema({ type: "Badge", props: { text: "x", variant: "rainbow" } });
    expect(nodes).toEqual([{ type: "Badge", props: { text: "x" } }]);
    expect(issues[0]).toMatchObject({ code: "invalid-prop", prop: "variant" });
  });

  it("drops javascript: URLs on links and images, keeping the node", () => {
    const { nodes, issues } = sanitizeSchema([
      { type: "Link", props: { href: "javascript:alert(1)", text: "Click" } },
      { type: "Image", props: { src: "data:image/svg+xml,<svg onload=alert(1)>", alt: "x" } },
    ]);
    expect(issues.filter((i) => i.code === "unsafe-url")).toHaveLength(2);
    // The link survives without an href (inert text); the image can't
    // render without a src, so it's gone.
    expect(nodes).toEqual([{ type: "Link", props: { text: "Click" } }]);
  });

  it("reports children a type doesn't accept", () => {
    const issues = validateSchemaNode({ type: "Text", children: ["a", { type: "Card" }] });
    expect(issues).toEqual([expect.objectContaining({ code: "invalid-child", type: "Card" })]);
    expect(validateSchemaNode({ type: "Button", props: { label: "x" }, children: ["y"] })[0]?.code).toBe("invalid-child");
  });

  it("keeps a form control labelled: falls back to name, drops it with neither", () => {
    const named = sanitizeSchema({ type: "TextField", props: { name: "email" } });
    expect(named.nodes).toEqual([{ type: "TextField", props: { name: "email", label: "email" } }]);
    expect(named.issues).toEqual([expect.objectContaining({ code: "missing-prop", prop: "label" })]);
    const anonymous = sanitizeSchema({ type: "TextField", props: {} });
    expect(anonymous.nodes).toEqual([]);
  });

  it("flags an unsupported version but still renders", () => {
    const { nodes, issues } = sanitizeSchema({ version: 99, root: { type: "Separator" } });
    expect(nodes).toEqual([{ type: "Separator" }]);
    expect(issues[0]).toMatchObject({ code: "unsupported-version" });
  });

  it("never throws on garbage", () => {
    for (const value of [null, undefined, 42, "text", [1, 2], { type: 7 }, { type: "Stack", children: "nope" }, { type: "Stack", props: [] }]) {
      expect(() => sanitizeSchema(value)).not.toThrow();
    }
  });

  it("caps nesting depth", () => {
    let node: Record<string, unknown> = { type: "Text", props: { text: "deep" } };
    for (let i = 0; i < 40; i++) node = { type: "Stack", children: [node] };
    const { issues } = sanitizeSchema(node);
    expect(issues.some((i) => i.code === "too-deep")).toBe(true);
  });

  it("skips half-typed nodes quietly in partial mode", () => {
    const value = { type: "Stack", children: [{ type: "Tex" }, { props: {} }] };
    expect(sanitizeSchema(value, { partial: true }).issues).toEqual([]);
    expect(sanitizeSchema(value).issues.map((i) => i.code)).toEqual(["unknown-type", "invalid-node"]);
  });

  it("does not let __proto__ through as a prop", () => {
    const value = JSON.parse('{"type":"Text","props":{"__proto__":{"polluted":true},"text":"x"}}');
    const { nodes, issues } = sanitizeSchema(value);
    expect(nodes).toEqual([{ type: "Text", props: { text: "x" } }]);
    expect(issues[0]).toMatchObject({ code: "unknown-prop", prop: "__proto__" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("parsePartialJson", () => {
  it("parses complete JSON exactly like JSON.parse", () => {
    const text = '{"a":[1,2.5,-3e2,true,false,null,"x\\n\\u00e9"],"b":{"c":""}}';
    expect(parsePartialJson(text)).toEqual(JSON.parse(text));
  });

  it("closes open strings, arrays and objects", () => {
    expect(parsePartialJson('{"type":"Text","props":{"text":"Hel')).toEqual({ type: "Text", props: { text: "Hel" } });
    expect(parsePartialJson('{"children":[{"type":"Badge"},{"ty')).toEqual({ children: [{ type: "Badge" }, {}] });
    expect(parsePartialJson("[1,2,")).toEqual([1, 2]);
  });

  it("drops a dangling key, colon, literal or number fragment", () => {
    expect(parsePartialJson('{"a":1,"b"')).toEqual({ a: 1 });
    expect(parsePartialJson('{"a":1,"b":')).toEqual({ a: 1 });
    expect(parsePartialJson('{"a":tru')).toEqual({});
    expect(parsePartialJson('{"a":-')).toEqual({});
    expect(parsePartialJson('{"a":1.')).toEqual({ a: 1 });
    expect(parsePartialJson('{"a":12')).toEqual({ a: 12 });
    expect(parsePartialJson('{"a":"x\\')).toEqual({ a: "x" });
    expect(parsePartialJson('{"a":"\\u00')).toEqual({ a: "" });
  });

  it("skips prose or a Markdown fence before the JSON", () => {
    expect(parsePartialJson('Here you go:\n```json\n{"type":"Separator"}\n```')).toEqual({ type: "Separator" });
  });

  it("returns undefined for nothing yet, or for text that isn't JSON", () => {
    expect(parsePartialJson("")).toBeUndefined();
    expect(parsePartialJson("thinking...")).toBeUndefined();
    expect(parsePartialJson('{"a" 1}')).toBeUndefined();
    expect(parsePartialJson("{a:1}")).toBeUndefined();
  });

  it("every prefix of a document parses without throwing and grows monotonically into it", () => {
    const doc = {
      version: 1,
      root: {
        type: "Card",
        props: { title: "Plan" },
        children: [{ type: "Progress", props: { label: "Done", value: 40 } }, { type: "Text", props: { text: "Almost — \"quoted\"" } }],
      },
    };
    const text = JSON.stringify(doc, null, 2);
    let rendered = 0;
    for (let i = 0; i <= text.length; i++) {
      const value = parsePartialJson(text.slice(0, i));
      const { nodes } = sanitizeSchema(value, { partial: i < text.length });
      rendered = Math.max(rendered, nodes.length);
    }
    expect(parsePartialJson(text)).toEqual(doc);
    expect(rendered).toBe(1);
  });

  it("keeps __proto__ keys as own data", () => {
    const value = parsePartialJson('{"__proto__":{"x":1}}') as Record<string, unknown>;
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(Object.keys(value)).toEqual(["__proto__"]);
  });
});

describe("generated artefacts", () => {
  it("the JSON Schema and prompt cover every node type and prop", () => {
    const defs = (kernelSchemaJson as { $defs: Record<string, { properties: { props: { properties: object } } }> }).$defs;
    for (const type of SCHEMA_NODE_TYPES) {
      expect(defs[type]).toBeDefined();
      expect(Object.keys(defs[type]!.properties.props.properties).sort()).toEqual(
        Object.keys(SCHEMA_NODE_SPECS[type].props).sort(),
      );
      expect(schemaPrompt).toContain(`- ${type} {`);
    }
    expect(kernelSchemaJson.properties.version).toEqual({ const: SCHEMA_VERSION });
  });

  it("the prompt's own example validates cleanly", () => {
    const example = schemaPrompt.split("Example: ")[1]!;
    expect(validateSchemaNode(JSON.parse(example))).toEqual([]);
  });
});
