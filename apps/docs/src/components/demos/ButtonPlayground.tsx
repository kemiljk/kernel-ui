import { Button } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { MagnifyingGlassIcon, ChevronDownIcon } from "../icons";

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
  { type: "boolean" as const, prop: "iconStart", label: "iconStart", default: false },
  { type: "boolean" as const, prop: "iconEnd", label: "iconEnd", default: false },
  { type: "boolean" as const, prop: "loading", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`variant="${values.variant}"`];
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.type !== "button") attrs.push(`type="${values.type}"`);
  if (values.iconStart) attrs.push("iconStart={<MagnifyingGlassIcon />}");
  if (values.iconEnd) attrs.push("iconEnd={<ChevronDownIcon />}");
  if (values.loading) attrs.push("loading");
  if (values.disabled) attrs.push("disabled");
  return `<Button ${attrs.join(" ")}>${values.children || "Button"}</Button>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`variant="${values.variant}"`];
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.type !== "button") attrs.push(`type="${values.type}"`);
  if (values.loading) attrs.push("loading");
  if (values.disabled) attrs.push("disabled");
  // Icon slots aren't ported on `<kernel-button>` yet — React playground
  // still demos iconStart/iconEnd; elements snippet stays text-only.
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
          iconStart={
            values.iconStart ? <MagnifyingGlassIcon width="14" height="14" /> : undefined
          }
          iconEnd={values.iconEnd ? <ChevronDownIcon width="14" height="14" /> : undefined}
          loading={Boolean(values.loading)}
          disabled={Boolean(values.disabled)}
        >
          {String(values.children) || "Button"}
        </Button>
      )}
    />
  );
}
