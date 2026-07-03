import { useState } from "react";
import { Button, Dialog, TextField } from "@kernelui-lib/react";

export default function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Invite a teammate
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Invite a teammate"
        description="They'll get an email with a link to join this workspace."
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
