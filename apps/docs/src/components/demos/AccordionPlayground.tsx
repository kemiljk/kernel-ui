import { Accordion, AccordionItem } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "enum" as const, prop: "type", options: ["single", "multiple"], default: "single" },
  { type: "text" as const, prop: "firstTitle", label: "first item title", default: "What is Kernel?" },
  {
    type: "boolean" as const,
    prop: "defaultOpen",
    label: "first item open by default",
    default: true,
  },
];

function code(values: PlaygroundValues) {
  const attrs = values.type !== "single" ? ` type="${values.type}"` : "";
  const firstItemAttrs = values.defaultOpen ? " defaultOpen" : "";
  return `<Accordion${attrs}>
  <AccordionItem title="${values.firstTitle}"${firstItemAttrs}>
    A component library built on real HTML elements.
  </AccordionItem>
  <AccordionItem title="Is it accessible?">
    Yes, by default, since the browser does most of the work.
  </AccordionItem>
</Accordion>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = values.type !== "single" ? ` type="${values.type}"` : "";
  const firstItemAttrs = values.defaultOpen ? " default-open" : "";
  return `<kernel-accordion${attrs}>
  <kernel-accordion-item title="${values.firstTitle}"${firstItemAttrs}>
    A component library built on real HTML elements.
  </kernel-accordion-item>
  <kernel-accordion-item title="Is it accessible?">
    Yes, by default, since the browser does most of the work.
  </kernel-accordion-item>
</kernel-accordion>`;
}

export default function AccordionPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Accordion type={values.type as "single" | "multiple"}>
          <AccordionItem title={String(values.firstTitle)} defaultOpen={Boolean(values.defaultOpen)}>
            A component library built on real HTML elements.
          </AccordionItem>
          <AccordionItem title="Is it accessible?">
            Yes, by default, since the browser does most of the work.
          </AccordionItem>
        </Accordion>
      )}
    />
  );
}
