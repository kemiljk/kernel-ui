import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../dist/index.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});
const k = (body, imports = "Button, TextField, Badge") => `import { ${imports} } from "@kernelui-lib/react";\n${body}`;

tester.run("no-foreign-props", plugin.rules["no-foreign-props"], {
  valid: [k("<Button iconStart={<X />}>Go</Button>"), "import { Button } from 'other';\n<Button leftIcon={<X />} />"],
  invalid: [
    { code: k("<Button leftIcon={<X />}>Go</Button>"), errors: [{ messageId: "foreign", data: { component: "Button", prop: "leftIcon", fix: "`iconStart`" } }] },
    { code: k("<B asChild>Go</B>", "Button as B"), errors: [{ messageId: "foreign" }] },
  ],
});

tester.run("valid-prop-values", plugin.rules["valid-prop-values"], {
  valid: [k('<Button variant="primary">Go</Button>'), k("<Button variant={v}>Go</Button>")],
  invalid: [
    { code: k('<Button variant="primry">Go</Button>'), errors: [{ messageId: "invalid", data: { component: "Button", prop: "variant", value: "primry", suggestion: ' Did you mean "primary"?', allowed: '"primary", "secondary", "ghost", "danger"' } }] },
    { code: k('<Button size={"xl"}>Go</Button>'), errors: [{ messageId: "invalid", data: { component: "Button", prop: "size", value: "xl", suggestion: "", allowed: '"sm", "md", "lg"' } }] },
  ],
});

tester.run("field-requires-label", plugin.rules["field-requires-label"], {
  valid: [k('<TextField label="Email" hideLabel />'), k("<TextField {...props} />")],
  invalid: [{ code: k('<TextField placeholder="Email" />'), errors: [{ messageId: "missing" }] }],
});

tester.run("icon-button-requires-label", plugin.rules["icon-button-requires-label"], {
  valid: [k('<Button aria-label="Close" iconStart={<X />} />'), k("<Button iconStart={<X />}>Close</Button>")],
  invalid: [{ code: k("<Button iconStart={<X />} />"), errors: [{ messageId: "missing" }] }],
});

tester.run("no-unknown-props", plugin.rules["no-unknown-props"], {
  valid: [k('<Button variant="primary" data-x="1" aria-busy onClick={go}>Go</Button>')],
  invalid: [{ code: k('<Button varient="primary">Go</Button>'), errors: [{ messageId: "typo", data: { component: "Button", prop: "varient", close: "variant" } }] }],
});

tester.run("no-clickable-non-interactive", plugin.rules["no-clickable-non-interactive"], {
  valid: ["<button onClick={go}>Go</button>", '<div role="button" tabIndex={0} onClick={go} />'],
  invalid: [{ code: "<div onClick={go}>Go</div>", errors: [{ messageId: "clickable" }] }],
});

tester.run("no-raw-colors", plugin.rules["no-raw-colors"], {
  valid: ['<p style={{ color: "var(--kernel-color-text)" }} />', '<p style={{ color: "var(--kernel-color-text, #000)" }} />'],
  invalid: [{ code: '<p style={{ color: "#ff0000" }} />', errors: [{ messageId: "raw" }] }],
});

tester.run("prefer-kernel-components", plugin.rules["prefer-kernel-components"], {
  valid: ['import { Button } from "@kernelui-lib/react";'],
  invalid: [
    { code: 'import { Button } from "@/components/ui/button";', errors: [{ messageId: "replace" }] },
    { code: 'import * as Dialog from "@radix-ui/react-dialog";', errors: [{ messageId: "replace" }] },
  ],
});
