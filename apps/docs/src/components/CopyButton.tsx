import { useState } from "react";
import { Button } from "@kernelui/react";

interface CopyButtonProps {
  text: string;
}

/**
 * Hover-reveal copy control for code blocks — the single most-cited
 * detail in Stripe's own docs teardown. Native Clipboard API, no
 * dependency; the checkmark swap is the only feedback needed, so it
 * reverts on its own rather than needing a toast.
 */
export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission can be denied by the browser (e.g. an
      // unfocused document, a restrictive iframe); fail quietly rather
      // than leave an unhandled rejection, nothing else to fall back to.
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="code-block-copy"
      aria-label={copied ? "Copied" : "Copy code"}
      onClick={handleCopy}
    >
      {copied ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
          <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 10.5V3.5a1 1 0 0 1 1-1h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </Button>
  );
}
