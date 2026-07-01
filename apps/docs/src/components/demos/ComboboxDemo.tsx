import { Combobox } from "@kernelui/react";

const frameworks = [
  { value: "astro", label: "Astro" },
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt", label: "Nuxt" },
];

export default function ComboboxDemo() {
  return (
    <div style={{ inlineSize: "16rem" }}>
      <Combobox label="Framework" options={frameworks} placeholder="Search frameworks…" />
    </div>
  );
}
