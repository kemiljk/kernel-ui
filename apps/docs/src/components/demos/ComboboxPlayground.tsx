import { Combobox } from "@kernelui/react";
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
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, "options={frameworks}", `placeholder="${values.placeholder}"`];
  if (values.hideLabel) attrs.push("hideLabel");
  return `<Combobox\n  ${attrs.join("\n  ")}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  const options = frameworks
    .map((framework) => `  <option value="${framework.value}">${framework.label}</option>`)
    .join("\n");
  const attrs: string[] = [`label="${values.label}"`, `placeholder="${values.placeholder}"`];
  if (values.hideLabel) attrs.push("hide-label");
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
            hideLabel={Boolean(values.hideLabel)}
          />
        </div>
      )}
    />
  );
}
