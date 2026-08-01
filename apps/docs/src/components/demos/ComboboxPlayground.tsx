import { Combobox } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const frameworks = [
  { value: "astro", label: "Astro" },
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt", label: "Nuxt" },
];

const controls = [
  { type: "text" as const, prop: "label", default: "Framework" },
  { type: "text" as const, prop: "placeholder", default: "Search frameworks…" },
  {
    type: "text" as const,
    prop: "emptyMessage",
    label: "empty message",
    default: "No frameworks found.",
  },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "bottom",
  },
  {
    type: "enum" as const,
    prop: "align",
    options: ["start", "center", "end"],
    default: "center",
  },
  { type: "number" as const, prop: "offset", label: "offset (px)", default: 8, min: 0, max: 32, step: 1 },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [
    `label="${values.label}"`,
    "options={frameworks}",
    `placeholder="${values.placeholder}"`,
  ];
  if (values.emptyMessage) attrs.push(`emptyMessage="${values.emptyMessage}"`);
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) attrs.push(`offset={${Number(values.offset)}}`);
  return `<Combobox\n  ${attrs.join("\n  ")}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  const options = frameworks
    .map((framework) => `  <option value="${framework.value}">${framework.label}</option>`)
    .join("\n");
  const attrs: string[] = [`label="${values.label}"`, `placeholder="${values.placeholder}"`];
  if (values.emptyMessage) attrs.push(`empty-message="${values.emptyMessage}"`);
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) attrs.push(`offset="${Number(values.offset)}"`);
  return `<kernel-combobox ${attrs.join(" ")}>\n${options}\n</kernel-combobox>`;
}

export default function ComboboxPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ inlineSize: "16rem" }}>
          <Combobox
            label={String(values.label)}
            options={frameworks}
            placeholder={String(values.placeholder)}
            emptyMessage={String(values.emptyMessage)}
            hideLabel={Boolean(values.hideLabel)}
            labelOffset={Boolean(values.labelOffset)}
            placement={values.placement as "top" | "bottom" | "left" | "right"}
            align={values.align as "start" | "center" | "end"}
            offset={Number(values.offset)}
          />
        </div>
      )}
    />
  );
}
