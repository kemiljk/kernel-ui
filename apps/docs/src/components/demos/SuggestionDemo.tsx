import { useState } from "react";
import { Button, Composer, Suggestion, SuggestionItem } from "@kernelui-lib/react";

const PROMPTS = [
  "Summarise the latest release notes",
  "Explain this TypeScript error",
  "Draft a migration checklist",
];

export default function SuggestionDemo() {
  const [value, setValue] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", inlineSize: "100%" }}>
      <Suggestion>
        {PROMPTS.map((prompt) => (
          <SuggestionItem key={prompt} onSelect={setValue}>
            {prompt}
          </SuggestionItem>
        ))}
      </Suggestion>
      <Composer
        placeholder="Ask anything…"
        value={value}
        onValueChange={setValue}
        actionsTrailing={({ submit }) => (
          <Button variant="primary" size="sm" onClick={submit}>
            Send
          </Button>
        )}
      />
    </div>
  );
}
