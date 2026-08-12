import { Combobox } from "@kernelui-lib/react";
import type { ComboboxGroup, ComboboxOption } from "@kernelui-lib/react";

const groups: ComboboxGroup[] = [
  {
    id: "frontend",
    label: "Frontend",
    items: [
      { value: "astro", label: "Astro" },
      { value: "next", label: "Next.js" },
      { value: "remix", label: "Remix" },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    items: [
      { value: "express", label: "Express" },
      { value: "fastify", label: "Fastify" },
    ],
  },
];

function renderOption(option: ComboboxOption, state: { active: boolean; selected: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", inlineSize: "100%" }}>
      {option.label}
      {state.selected ? <span aria-hidden="true">✓</span> : null}
    </span>
  );
}

export default function ComboboxGroupsDemo() {
  return (
    <div style={{ inlineSize: "16rem" }}>
      <Combobox
        label="Framework"
        groups={groups}
        renderOption={renderOption}
        placeholder="Search frameworks…"
      />
    </div>
  );
}
