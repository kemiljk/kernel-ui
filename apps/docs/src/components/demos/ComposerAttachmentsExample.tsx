import { useState } from "react";
import { Attachment, AttachmentList, Button, Composer } from "@kernelui-lib/react";
import { PaperclipIcon } from "../icons";

const SAMPLES = [
  { name: "q3-roadmap.pdf", size: 1_840_000 },
  { name: "error-log-2026-11-28.txt", size: 42_600 },
  { name: "schema.sql", size: 9_100 },
];

// The attachment row sits above the composer rather than inside it:
// Composer owns its textarea and action slots, and an AttachmentList is
// its own list, so the two compose side by side.
export default function ComposerAttachmentsExample() {
  const [files, setFiles] = useState([SAMPLES[0]!]);

  function attach() {
    const next = SAMPLES.find((sample) => !files.some((file) => file.name === sample.name));
    if (next) setFiles([...files, next]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", inlineSize: "100%" }}>
      {files.length > 0 ? (
        <AttachmentList aria-label="Attached files">
          {files.map((file) => (
            <Attachment
              key={file.name}
              name={file.name}
              size={file.size}
              onRemove={() => setFiles(files.filter((f) => f.name !== file.name))}
            />
          ))}
        </AttachmentList>
      ) : null}
      <Composer
        placeholder="Ask about these files…"
        actionsLeading={
          <Button
            variant="ghost"
            size="sm"
            aria-label="Attach a file"
            onClick={attach}
            disabled={files.length === SAMPLES.length}
            iconStart={<PaperclipIcon width="14" height="14" />}
          />
        }
        actionsTrailing={({ submit }) => (
          <Button variant="primary" size="sm" onClick={submit}>
            Send
          </Button>
        )}
      />
    </div>
  );
}
