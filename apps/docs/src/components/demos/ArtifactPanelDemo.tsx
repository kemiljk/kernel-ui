import { useEffect, useRef, useState } from "react";
import { ArtifactPanel, Button, CodeBlock, MessageBubble, Resizable } from "@kernelui-lib/react";

const VERSIONS = [
  {
    note: "A first pass: a heading and a button.",
    html: `<main>
  <h1>Kernel Coffee</h1>
  <button>Order</button>
</main>`,
  },
  {
    note: "Added a tagline and styled the button.",
    html: `<main>
  <h1>Kernel Coffee</h1>
  <p>Small batch, roasted on Tuesdays.</p>
  <button class="primary">Order a bag</button>
</main>`,
  },
  {
    note: "Added opening hours.",
    html: `<main>
  <h1>Kernel Coffee</h1>
  <p>Small batch, roasted on Tuesdays.</p>
  <button class="primary">Order a bag</button>
  <dl>
    <dt>Mon–Fri</dt><dd>7am–4pm</dd>
    <dt>Sat</dt><dd>8am–2pm</dd>
  </dl>
</main>`,
  },
];

const PREVIEW_STYLE = `<style>
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #1d1d1f; background: #fff; }
  main { padding: 24px; display: grid; gap: 12px; justify-items: start; }
  h1 { margin: 0; font-size: 24px; }
  p { margin: 0; color: #555; }
  button { font: inherit; padding: 6px 14px; border-radius: 999px; border: 1px solid #ccc; background: #fff; }
  button.primary { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
  dl { display: grid; grid-template-columns: auto auto; gap: 2px 12px; margin: 0; }
  dt { font-weight: 600; } dd { margin: 0; }
</style>`;

const copyIcon = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const NARROW = "(max-width: 767.98px)";

/** A chat on one side, the artifact it produced on the other, in a Resizable
 * split. Below 768px the panel becomes a modal overlay instead. */
export default function ArtifactPanelDemo() {
  const [version, setVersion] = useState(VERSIONS.length);
  const [status, setStatus] = useState<"ready" | "streaming" | "error">("ready");
  // Closed until mounted on a phone: an overlay that opens on page load
  // would take the page over before anyone asked for it.
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (window.matchMedia(NARROW).matches) setOpen(false);
    return () => window.clearTimeout(timer.current);
  }, []);

  const current = VERSIONS[version - 1]!;

  function regenerate() {
    setStatus("streaming");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("ready"), 2000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context).
    }
  }

  return (
    <div style={{ inlineSize: "100%", blockSize: "28rem" }}>
      <Resizable defaultSplit={38} min={25} max={70}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--kernel-space-3)",
            blockSize: "100%",
            boxSizing: "border-box",
            padding: "var(--kernel-padding-container-curve)",
            border: "1px solid var(--kernel-color-border)",
            borderRadius: "var(--kernel-radius-container)",
            backgroundColor: "var(--kernel-color-surface)",
            overflow: "auto",
          }}
        >
          <MessageBubble align="end" tone="accent">Make me a landing page for a coffee shop.</MessageBubble>
          <MessageBubble align="start">{current.note} It's open beside the chat.</MessageBubble>
          <div style={{ display: "flex", gap: "var(--kernel-space-2)", flexWrap: "wrap", marginBlockStart: "auto" }}>
            <Button size="sm" onClick={() => setOpen(true)}>
              Open artifact
            </Button>
            <Button size="sm" variant="ghost" onClick={regenerate}>
              Regenerate
            </Button>
          </div>
        </div>
        <ArtifactPanel
          title="coffee-landing.html"
          open={open}
          onOpenChange={setOpen}
          status={status}
          version={version}
          versionCount={VERSIONS.length}
          onVersionChange={setVersion}
          actions={
            <Button
              variant="ghost"
              size="sm"
              aria-label={copied ? "Copied" : "Copy code"}
              iconStart={copyIcon}
              onClick={copy}
            />
          }
          views={[
            {
              value: "preview",
              label: "Preview",
              content: (
                <iframe
                  title="Preview of coffee-landing.html"
                  sandbox=""
                  srcDoc={PREVIEW_STYLE + current.html}
                  style={{
                    flex: 1,
                    inlineSize: "100%",
                    minBlockSize: "12rem",
                    border: "1px solid var(--kernel-color-border)",
                    borderRadius: "var(--kernel-radius-md)",
                    background: "#fff",
                  }}
                />
              ),
            },
            {
              value: "code",
              label: "Code",
              content: <CodeBlock label="coffee-landing.html" language="html" code={current.html} showLineNumbers />,
            },
          ]}
        />
      </Resizable>
    </div>
  );
}
