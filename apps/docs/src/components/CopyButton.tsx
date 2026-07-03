import { useState } from "react";
import { Button } from "@kernelui-lib/react";
import { CheckIcon, CopyIcon } from "./icons";

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
      {copied ? <CheckIcon width="14" height="14" /> : <CopyIcon width="14" height="14" />}
    </Button>
  );
}
