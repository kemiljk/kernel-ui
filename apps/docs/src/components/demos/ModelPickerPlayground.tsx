import { ModelPicker, type ModelPickerOption } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { MODEL_OPTIONS } from "./ModelPickerDemo";

const controls = [
  { type: "enum" as const, prop: "placement", label: "placement", options: ["top", "bottom"], default: "bottom" },
  { type: "enum" as const, prop: "align", label: "align", options: ["start", "center", "end"], default: "start" },
  { type: "boolean" as const, prop: "grouped", label: "groups", default: true },
  { type: "boolean" as const, prop: "descriptions", label: "descriptions", default: true },
  { type: "boolean" as const, prop: "badges", label: "badges", default: true },
  { type: "boolean" as const, prop: "icons", label: "icons", default: true },
  { type: "boolean" as const, prop: "selected", label: "default value", default: true },
  { type: "boolean" as const, prop: "disabled", label: "disabled", default: false },
];

function optionsFor(values: PlaygroundValues): ModelPickerOption[] {
  return MODEL_OPTIONS.map((option) => ({
    ...option,
    group: values.grouped ? option.group : undefined,
    description: values.descriptions ? option.description : undefined,
    badges: values.badges ? option.badges : undefined,
    icon: values.icons ? option.icon : undefined,
  }));
}

function code(values: PlaygroundValues) {
  const fields = [
    `value: "atlas"`,
    `label: "Atlas"`,
    values.descriptions ? `description: "Deepest reasoning, longest context"` : null,
    values.grouped ? `group: "Northwind"` : null,
    values.badges ? `badges: [{ label: "New", variant: "accent" }]` : null,
    values.icons ? `icon: <SparkIcon />` : null,
  ].filter(Boolean);
  return `<Composer
  actionsLeading={
    <ModelPicker
      options={[
        { ${fields.join(", ")} },
        // …
      ]}${values.selected ? `\n      defaultValue="atlas"` : ""}${
        values.placement === "top" ? "" : `\n      placement="${values.placement}"`
      }${values.align === "start" ? "" : `\n      align="${values.align}"`}${values.disabled ? "\n      disabled" : ""}
      onValueChange={setModel}
    />
  }
/>`;
}

function elementsCode(values: PlaygroundValues) {
  const description = values.descriptions ? ` data-description="Deepest reasoning, longest context"` : "";
  const badges = values.badges ? ` data-badges="New:accent"` : "";
  const option = `<option value="atlas"${description}${badges}>Atlas</option>`;
  const body = values.grouped ? `<optgroup label="Northwind">\n    ${option}\n  </optgroup>` : option;
  return `<kernel-model-picker${values.selected ? ` value="atlas"` : ""}${
    values.placement === "top" ? "" : ` placement="${values.placement}"`
  }${values.align === "start" ? "" : ` align="${values.align}"`}${values.disabled ? " disabled" : ""}>
  ${body}
</kernel-model-picker>

<script type="module">
  document.querySelector("kernel-model-picker")
    .addEventListener("valuechange", (event) => console.log(event.detail.value));
</script>`;
}

export default function ModelPickerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <ModelPicker
          // Remount when "default value" flips, since defaultValue is read once.
          key={String(values.selected)}
          options={optionsFor(values)}
          defaultValue={values.selected ? "atlas" : undefined}
          placement={values.placement as "top" | "bottom"}
          align={values.align as "start" | "center" | "end"}
          disabled={Boolean(values.disabled)}
        />
      )}
    />
  );
}
