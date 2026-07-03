import { useState } from "react";
import { Button, Composer } from "@kernelui-lib/react";

export default function ComposerDemo() {
  const [thinking, setThinking] = useState(false);

  function handleSubmit() {
    setThinking(true);
    setTimeout(() => setThinking(false), 1800);
  }

  return (
    <Composer
      placeholder="Ask anything…"
      thinking={thinking}
      onSubmit={handleSubmit}
      actionsTrailing={({ submit }) => (
        <Button variant="primary" size="sm" onClick={submit} disabled={thinking}>
          Send
        </Button>
      )}
    />
  );
}
