import { useState } from "react";
import { Button, Dialog, TextField } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "title", default: "Invite a teammate" },
  {
    type: "text" as const,
    prop: "description",
    default: "They'll get an email with a link to join this workspace.",
  },
  { type: "boolean" as const, prop: "closeOnBackdropClick", default: true },
];

function code(values: PlaygroundValues) {
  const attrs = [`title="${values.title}"`, `description="${values.description}"`];
  if (!values.closeOnBackdropClick) attrs.push("closeOnBackdropClick={false}");
  return `<Dialog open={open} onOpenChange={setOpen} ${attrs.join(" ")}>
  ...
</Dialog>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`title="${values.title}"`, `description="${values.description}"`];
  if (!values.closeOnBackdropClick) attrs.push('close-on-backdrop-click="false"');
  return `<kernel-dialog ${attrs.join(" ")}>
  ...
</kernel-dialog>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {String(values.title)}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={String(values.title)}
        description={String(values.description)}
        closeOnBackdropClick={Boolean(values.closeOnBackdropClick)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <TextField label="Email address" type="email" placeholder="teammate@example.com" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Send invite
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export default function DialogPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => <Stage values={values} />}
    />
  );
}
