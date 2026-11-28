import { useState } from "react";
import { Button, Composer, ModelPicker, type ModelPickerOption } from "@kernelui-lib/react";

function SparkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path
        d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.1 4.1l2 2M9.9 9.9l2 2M11.9 4.1l-2 2M6.1 9.9l-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path
        d="M9 2 3.75 9H8l-1 5 5.25-7H8l1-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrbitIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="8" cy="8" rx="6" ry="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Fictional models and providers: the picker's shape, without anyone's
 * brand. */
export const MODEL_OPTIONS: ModelPickerOption[] = [
  {
    value: "atlas",
    label: "Atlas",
    description: "Deepest reasoning, longest context",
    group: "Northwind",
    badges: [{ label: "New", variant: "accent" }],
    icon: <SparkIcon />,
  },
  {
    value: "atlas-swift",
    label: "Atlas Swift",
    description: "Near-Atlas quality at a fraction of the latency",
    group: "Northwind",
    badges: ["Fast"],
    icon: <BoltIcon />,
  },
  {
    value: "atlas-legacy",
    label: "Atlas Legacy",
    description: "Retired — kept for existing chats",
    group: "Northwind",
    icon: <SparkIcon />,
    disabled: true,
  },
  {
    value: "nimbus",
    label: "Nimbus",
    description: "Strong at code and tool use",
    group: "Lumen Labs",
    icon: <OrbitIcon />,
  },
  {
    value: "nimbus-lite",
    label: "Nimbus Lite",
    description: "Cheapest, for quick drafts",
    group: "Lumen Labs",
    badges: [{ label: "Fast", variant: "success" }],
    icon: <OrbitIcon />,
  },
];

/** A model picker where it lives: in a composer's leading actions, beside
 * the send button. */
export default function ModelPickerDemo() {
  const [model, setModel] = useState("atlas-swift");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const label = MODEL_OPTIONS.find((option) => option.value === model)?.label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", inlineSize: "min(36rem, 100%)" }}>
      <Composer
        placeholder="Ask anything…"
        value={message}
        onValueChange={setMessage}
        onSubmit={(value) => {
          setSent(value);
          setMessage("");
        }}
        actionsLeading={<ModelPicker options={MODEL_OPTIONS} value={model} onValueChange={setModel} />}
        actionsTrailing={({ submit }) => (
          <Button variant="primary" size="sm" onClick={submit}>
            Send
          </Button>
        )}
      />
      <p style={{ margin: 0, color: "var(--kernel-color-text-muted)", fontSize: "var(--kernel-font-size-sm)" }} aria-live="polite">
        {sent ? `Sent to ${label}: “${sent}”` : `Messages go to ${label}.`}
      </p>
    </div>
  );
}
