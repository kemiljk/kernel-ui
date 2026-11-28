import { useEffect, useState } from "react";
import { Attachment, AttachmentList } from "@kernelui-lib/react";

/** A stand-in photo: an inline SVG landscape, so the demo needs no asset. */
export const SAMPLE_PREVIEW =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec5ff"/><stop offset="1" stop-color="#f6d7b0"/></linearGradient></defs><rect width="64" height="64" fill="url(#s)"/><circle cx="46" cy="18" r="7" fill="#fff6d5"/><path d="M0 50 18 30l12 12 10-8 24 18v12H0Z" fill="#4c7a5a"/></svg>',
  );

interface DemoFile {
  id: number;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress?: number;
}

const INITIAL: DemoFile[] = [
  { id: 1, name: "quarterly-report-final-v3.pdf", size: 2_400_000, type: "application/pdf" },
  { id: 2, name: "whiteboard.png", size: 864_000, type: "image/png", preview: SAMPLE_PREVIEW },
  { id: 3, name: "transcript.txt", size: 18_200, type: "text/plain", progress: 0 },
];

export default function AttachmentDemo() {
  const [files, setFiles] = useState(INITIAL);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFiles((current) =>
        current.map((file) =>
          file.progress == null
            ? file
            : { ...file, progress: file.progress >= 1 ? undefined : Math.min(1, file.progress + 0.08) },
        ),
      );
    }, 220);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <AttachmentList aria-label="Attachments" style={{ justifyContent: "center" }}>
      {files.map((file) => (
        <Attachment
          key={file.id}
          name={file.name}
          size={file.size}
          type={file.type}
          previewSrc={file.preview}
          progress={file.progress}
          onRemove={() => setFiles((current) => current.filter((f) => f.id !== file.id))}
        />
      ))}
    </AttachmentList>
  );
}
