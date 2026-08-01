import { useState } from "react";
import { Button, Composer, Suggestion, SuggestionItem } from "@kernelui-lib/react";

const PROMPTS = [
  "How do I theme Kernel with a custom accent?",
  "What's the difference between React and Elements?",
  "Show me a streaming reasoning example",
];

export default function ComposerDemo() {
  const [value, setValue] = useState("");
  const [thinking, setThinking] = useState(false);

  function handleSubmit() {
    setThinking(true);
    setTimeout(() => setThinking(false), 1800);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", inlineSize: "100%" }}>
      {!value && !thinking ? (
        <Suggestion>
          {PROMPTS.map((prompt) => (
            <SuggestionItem key={prompt} onSelect={setValue}>
              {prompt}
            </SuggestionItem>
          ))}
        </Suggestion>
      ) : null}
      <Composer
        placeholder="Ask anything…"
        value={value}
        onValueChange={setValue}
        thinking={thinking}
        onSubmit={handleSubmit}
        actionsTrailing={({ submit }) => (
          <Button variant="primary" size="sm" onClick={submit} disabled={thinking}>
            Send
          </Button>
        )}
      />
    </div>
  );
}
