import { Button, ToastViewport, toast } from "@kernelui-lib/react";

export default function ToastDemo() {
  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => toast("Draft saved")}>
          Default
        </Button>
        <Button variant="secondary" onClick={() => toast.success("Changes published")}>
          Success
        </Button>
        <Button variant="secondary" onClick={() => toast.danger("Couldn't save changes")}>
          Danger
        </Button>
      </div>
      <ToastViewport />
    </>
  );
}
