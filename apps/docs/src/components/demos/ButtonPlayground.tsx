import { Button } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "variant",
    options: ["primary", "secondary", "ghost", "danger"],
    default: "primary",
  },
  { type: "enum" as const, prop: "size", options: ["sm", "md", "lg"], default: "md" },
  { type: "text" as const, prop: "children", label: "label", default: "Save changes" },
  {
    type: "enum" as const,
    prop: "type",
    options: ["button", "submit", "reset"],
    default: "button",
  },
  { type: "boolean" as const, prop: "loading", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

/** Only serialise props that differ from Button's own defaults, so the
 * generated snippet reads like something you'd actually write, not every
 * prop spelled out including the ones you'd leave off. */
function code(values: PlaygroundValues) {
  const attrs: string[] = [`variant="${values.variant}"`];
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.type !== "button") attrs.push(`type="${values.type}"`);
  if (values.loading) attrs.push("loading");
  if (values.disabled) attrs.push("disabled");
  return `<Button ${attrs.join(" ")}>${values.children || "Button"}</Button>`;
}

/** Same values, as `@kernelui/elements`' `<kernel-button>` — same
 * attribute names as the React props (see Button.ts's own
 * `observedAttributes`), just plain HTML rather than JSX. */
function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`variant="${values.variant}"`];
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.type !== "button") attrs.push(`type="${values.type}"`);
  if (values.loading) attrs.push("loading");
  if (values.disabled) attrs.push("disabled");
  return `<kernel-button ${attrs.join(" ")}>${values.children || "Button"}</kernel-button>`;
}

export default function ButtonPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Button
          variant={values.variant as "primary" | "secondary" | "ghost" | "danger"}
          size={values.size as "sm" | "md" | "lg"}
          type={values.type as "button" | "submit" | "reset"}
          loading={Boolean(values.loading)}
          disabled={Boolean(values.disabled)}
        >
          {String(values.children) || "Button"}
        </Button>
      )}
    />
  );
}
