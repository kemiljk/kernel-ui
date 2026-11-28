/** Sample model outputs shared by the SchemaRenderer demo and playground. */
export const schemaSamples: Record<string, unknown> = {
  "Booking form": {
    version: 1,
    root: {
      type: "Card",
      props: { title: "Book a table", description: "Kernel Bistro · Friday" },
      children: [
        {
          type: "Form",
          props: { action: "book_table", payload: { restaurant: "kernel-bistro" } },
          children: [
            { type: "TextField", props: { name: "name", label: "Name", required: true } },
            {
              type: "Select",
              props: {
                name: "time",
                label: "Time",
                options: ["18:00", "18:30", "19:00", { value: "19:30", label: "19:30 (waitlist)", disabled: true }],
                defaultValue: "18:30",
              },
            },
            { type: "Checkbox", props: { name: "outside", label: "Sit outside if it's dry" } },
            {
              type: "Stack",
              props: { direction: "horizontal", gap: "sm" },
              children: [
                { type: "Button", props: { label: "Book", variant: "primary", submit: true } },
                { type: "Button", props: { label: "Not now", variant: "ghost", action: "dismiss" } },
              ],
            },
          ],
        },
      ],
    },
  },
  "Order summary": {
    version: 1,
    root: [
      {
        type: "Stack",
        props: { direction: "horizontal", gap: "sm", align: "center", wrap: true },
        children: [
          { type: "Heading", props: { text: "Order #4821", level: 3 } },
          { type: "Badge", props: { text: "Shipped", variant: "success" } },
        ],
      },
      { type: "Progress", props: { label: "Delivery progress", value: 70 } },
      {
        type: "Table",
        props: {
          caption: "Items",
          columns: [
            { key: "item", label: "Item" },
            { key: "qty", label: "Qty" },
            { key: "price", label: "Price" },
          ],
          rows: [
            { item: "Pour-over kettle", qty: 1, price: "£48.00" },
            { item: "Filter papers", qty: 2, price: "£9.00" },
          ],
        },
      },
      {
        type: "Text",
        props: { tone: "muted", size: "sm" },
        children: ["Questions? ", { type: "Link", props: { href: "mailto:help@example.com", text: "Email support" } }],
      },
    ],
  },
  "Unsafe input": {
    version: 1,
    root: {
      type: "Stack",
      children: [
        { type: "Callout", props: { variant: "info", title: "Dropped, not rendered", text: "This tree asks for a script, an onClick handler and a javascript: link. None of it reaches the page." } },
        { type: "Script", props: { src: "https://example.com/x.js" } },
        { type: "Text", props: { text: "Plain text survives.", onClick: "alert(1)" } },
        { type: "Link", props: { href: "javascript:alert(document.cookie)", text: "This link has no href" } },
      ],
    },
  },
};

export const schemaSampleNames = Object.keys(schemaSamples);
