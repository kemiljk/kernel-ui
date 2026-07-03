import { Accordion, AccordionItem } from "@kernelui-lib/react";

export default function AccordionDemo() {
  return (
    <Accordion type="single">
      <AccordionItem title="Why real semantic elements?" defaultOpen>
        Because the browser already implements the behaviour, the
        accessibility, and (often) the keyboard support. There's less to
        ship, and less to get wrong.
      </AccordionItem>
      <AccordionItem title="Does this work without JavaScript?">
        Opening and closing does, it's a native{" "}
        <code>&lt;details&gt;</code> element. The height animation is
        progressive enhancement on top.
      </AccordionItem>
      <AccordionItem title="Can I have more than one open at once?">
        Yes, use <code>type=&quot;multiple&quot;</code> on the{" "}
        <code>Accordion</code>.
      </AccordionItem>
    </Accordion>
  );
}
