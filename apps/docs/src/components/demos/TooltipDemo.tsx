import { Button, Tooltip } from "@kernelui-lib/react";

export default function TooltipDemo() {
  return (
    <Tooltip content="Copies the current URL" render={<Button variant="secondary">Share</Button>} />
  );
}
