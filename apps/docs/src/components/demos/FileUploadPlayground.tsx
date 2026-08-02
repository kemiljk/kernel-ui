import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { FileUpload, type FileUploadError } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Upload files" },
  { type: "text" as const, prop: "description", default: "Any file type" },
  // Empty accept = unrestricted (FileUpload treats missing/empty accept as allow-all).
  { type: "text" as const, prop: "accept", default: "", placeholder: "e.g. image/*,.pdf" },
  { type: "boolean" as const, prop: "multiple", default: true },
  { type: "boolean" as const, prop: "preview", default: true },
  {
    type: "enum" as const,
    prop: "aspectRatio",
    label: "aspect ratio",
    options: ["auto", "square"],
    default: "square",
  },
  { type: "number" as const, prop: "maxFiles", label: "max files", default: 8, min: 1 },
  // 0 = no maxSize prop — desktop fixtures shouldn't bounce on size.
  {
    type: "number" as const,
    prop: "maxSizeMb",
    label: "max size (MB)",
    default: 0,
    min: 0,
  },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "That file is too large.",
  },
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
];

function resolveAccept(values: PlaygroundValues): string | undefined {
  const accept = String(values.accept ?? "").trim();
  return accept || undefined;
}

function resolveMaxSize(values: PlaygroundValues): number | undefined {
  const mb = Number(values.maxSizeMb);
  if (!Number.isFinite(mb) || mb <= 0) return undefined;
  return mb * 1024 * 1024;
}

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  const accept = resolveAccept(values);
  if (accept) attrs.push(`accept="${accept}"`);
  if (values.multiple) attrs.push("multiple");
  if (values.preview) attrs.push("preview");
  if (values.aspectRatio === "square") attrs.push(`aspectRatio="square"`);
  if (values.maxFiles) attrs.push(`maxFiles={${Number(values.maxFiles)}}`);
  const maxSize = resolveMaxSize(values);
  if (maxSize != null) attrs.push(`maxSize={${maxSize}}`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  return `<FileUpload ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  const accept = resolveAccept(values);
  if (accept) attrs.push(`accept="${accept}"`);
  if (values.multiple) attrs.push("multiple");
  if (values.preview) attrs.push("preview");
  if (values.aspectRatio === "square") attrs.push(`aspect-ratio="square"`);
  if (values.maxFiles) attrs.push(`max-files="${Number(values.maxFiles)}"`);
  const maxSize = resolveMaxSize(values);
  if (maxSize != null) attrs.push(`max-size="${maxSize}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  return `<kernel-file-upload ${attrs.join(" ")}></kernel-file-upload>`;
}

const FIXTURE_BASE = "/demos/file-upload";
const STATUS_CLEAR_MS = 3200;

async function fileFromFixture(src: string, name: string, type: string): Promise<File> {
  const response = await fetch(src);
  const blob = await response.blob();
  // Force the intended MIME even when the server omits Content-Type —
  // preview + accept checks read File.type, not the URL extension.
  const typed = blob.type === type ? blob : new Blob([blob], { type });
  return new File([typed], name, {
    type,
    lastModified: Date.UTC(2026, 7, 1),
  });
}

function makeTextFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, {
    type,
    lastModified: Date.UTC(2026, 7, 1),
  });
}

function cloneFile(file: File): File {
  return new File([file], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern);
    if (pattern.endsWith("/*")) return file.type.toLowerCase().startsWith(pattern.slice(0, -1));
    return file.type.toLowerCase() === pattern;
  });
}

function formatNames(files: File[]): string {
  if (files.length === 1) return files[0]!.name;
  if (files.length === 2) return `${files[0]!.name} and ${files[1]!.name}`;
  return `${files
    .slice(0, -1)
    .map((file) => file.name)
    .join(", ")}, and ${files.at(-1)!.name}`;
}

function statusForError(error: FileUploadError, maxFiles: number, maxSizeMb: number): string {
  const names = formatNames(error.files);
  const plural = error.files.length > 1;
  if (error.type === "accept") {
    return plural
      ? `${names} don’t match the current accept filter.`
      : `${names} doesn’t match the current accept filter.`;
  }
  if (error.type === "max-size") {
    return plural
      ? `${names} are over the ${maxSizeMb}MB limit.`
      : `${names} is over the ${maxSizeMb}MB limit.`;
  }
  if (error.type === "directory") {
    return plural
      ? `${names} are folders — drop individual files instead.`
      : `${names} is a folder — drop individual files instead.`;
  }
  return `Too many files — max is ${maxFiles}.`;
}

type DesktopKind = "image" | "file" | "folder" | "zip";
type DesktopRail = "top" | "start" | "end" | "bottom";

interface DesktopItem {
  id: string;
  name: string;
  kind: DesktopKind;
  rail: DesktopRail;
  files: File[];
  thumbSrc?: string;
  /** Slight tilt inside the rail cell — visual looseness without collisions. */
  rotate: string;
  nudgeX?: string;
  nudgeY?: string;
}

function FileGlyph({ kind }: { kind: DesktopKind }) {
  if (kind === "folder") {
    return (
      <svg viewBox="0 0 48 40" fill="none" aria-hidden="true">
        <path
          d="M2 8.5C2 6.01472 4.01472 4 6.5 4H17L21 9H41.5C43.9853 9 46 11.0147 46 13.5V31.5C46 33.9853 43.9853 36 41.5 36H6.5C4.01472 36 2 33.9853 2 31.5V8.5Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M2 14H46V31.5C46 33.9853 43.9853 36 41.5 36H6.5C4.01472 36 2 33.9853 2 31.5V14Z"
          fill="currentColor"
          opacity="0.34"
        />
      </svg>
    );
  }

  if (kind === "zip") {
    return (
      <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
        <path
          d="M6 2H26L34 10V42C34 44.2091 32.2091 46 30 46H6C3.79086 46 2 44.2091 2 42V6C2 3.79086 3.79086 2 6 2Z"
          fill="currentColor"
          opacity="0.16"
        />
        <path d="M26 2V10H34" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
        <path
          d="M18 14V18M18 22V26M18 30V34M15 16H21M15 24H21M15 32H21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
      <path
        d="M6 2H26L34 10V42C34 44.2091 32.2091 46 30 46H6C3.79086 46 2 44.2091 2 42V6C2 3.79086 3.79086 2 6 2Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path d="M26 2V10H34" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <path d="M10 22H26M10 28H26M10 34H20" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

function DesktopIcon({
  item,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  item: DesktopItem;
  dragging: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>, item: DesktopItem) => void;
  onDragEnd: () => void;
}) {
  const style = {
    "--desktop-rotate": item.rotate,
    "--desktop-nudge-x": item.nudgeX ?? "0px",
    "--desktop-nudge-y": item.nudgeY ?? "0px",
  } as CSSProperties;

  return (
    <button
      type="button"
      className="file-upload-desktop-icon"
      style={style}
      data-kind={item.kind}
      data-rail={item.rail}
      data-dragging={dragging || undefined}
      draggable
      onDragStart={(event) => onDragStart(event, item)}
      onDragEnd={onDragEnd}
      aria-label={`Drag ${item.name}`}
    >
      <span className="file-upload-desktop-glyph">
        {item.thumbSrc ? (
          <img
            className="file-upload-desktop-thumb"
            src={item.thumbSrc}
            alt=""
            draggable={false}
          />
        ) : (
          <FileGlyph kind={item.kind} />
        )}
      </span>
      <span className="file-upload-desktop-name">{item.name}</span>
    </button>
  );
}

function DesktopRail({
  rail,
  items,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  rail: DesktopRail;
  items: DesktopItem[];
  draggingId: string | null;
  onDragStart: (event: DragEvent<HTMLButtonElement>, item: DesktopItem) => void;
  onDragEnd: () => void;
}) {
  const railItems = items.filter((item) => item.rail === rail);
  if (railItems.length === 0) return null;
  return (
    <div className="file-upload-desktop-rail" data-rail={rail}>
      {railItems.map((item) => (
        <DesktopIcon
          key={item.id}
          item={item}
          dragging={draggingId === item.id}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

function FileUploadDesktop({ values }: { values: PlaygroundValues }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [items, setItems] = useState<DesktopItem[] | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const draggingFilesRef = useRef<File[] | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const accept = resolveAccept(values);
  const maxSize = resolveMaxSize(values);

  function clearStatusTimer() {
    if (statusTimerRef.current != null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }

  function showStatus(message: string) {
    clearStatusTimer();
    setLastError(message);
    statusTimerRef.current = window.setTimeout(() => {
      setLastError(null);
      statusTimerRef.current = null;
    }, STATUS_CLEAR_MS);
  }

  function clearStatus() {
    clearStatusTimer();
    setLastError(null);
  }

  useEffect(() => () => clearStatusTimer(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      const [vacation, beach, trail] = await Promise.all([
        fileFromFixture(`${FIXTURE_BASE}/vacation.jpg`, "vacation.jpg", "image/jpeg"),
        fileFromFixture(`${FIXTURE_BASE}/beach.jpg`, "beach.jpg", "image/jpeg"),
        fileFromFixture(`${FIXTURE_BASE}/trail.jpg`, "trail.jpg", "image/jpeg"),
      ]);
      const folderVacation = cloneFile(vacation);
      const folderBeach = cloneFile(beach);
      const folderTrail = cloneFile(trail);
      // TIFF stays as a normal-size side fixture — not oversized, not centered.
      const raw = await fileFromFixture(`${FIXTURE_BASE}/trail.jpg`, "raw.tiff", "image/tiff");
      const zipBytes = new Uint8Array([
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const archive = new File([zipBytes], "archive.zip", {
        type: "application/zip",
        lastModified: Date.UTC(2026, 7, 1),
      });

      if (cancelled) return;

      setItems([
        {
          id: "vacation",
          name: "vacation.jpg",
          kind: "image",
          rail: "top",
          files: [vacation],
          thumbSrc: `${FIXTURE_BASE}/vacation.jpg`,
          rotate: "-6deg",
          nudgeX: "-4px",
          nudgeY: "2px",
        },
        {
          id: "beach",
          name: "beach.jpg",
          kind: "image",
          rail: "top",
          files: [beach],
          thumbSrc: `${FIXTURE_BASE}/beach.jpg`,
          rotate: "7deg",
          nudgeX: "6px",
        },
        {
          id: "report",
          name: "report.pdf",
          kind: "file",
          rail: "start",
          files: [makeTextFile("report.pdf", "application/pdf", 320_000)],
          rotate: "3deg",
          nudgeY: "-2px",
        },
        {
          id: "photos",
          name: "Photos",
          kind: "folder",
          rail: "start",
          files: [folderVacation, folderBeach, folderTrail],
          rotate: "-5deg",
          nudgeY: "8px",
        },
        {
          id: "archive",
          name: "archive.zip",
          kind: "zip",
          rail: "end",
          files: [archive],
          rotate: "5deg",
          nudgeY: "8px",
        },
        {
          id: "notes",
          name: "notes.txt",
          kind: "file",
          rail: "bottom",
          files: [makeTextFile("notes.txt", "text/plain", 2_400)],
          rotate: "2deg",
          nudgeX: "-8px",
        },
        {
          id: "tiff",
          name: "raw.tiff",
          kind: "image",
          rail: "bottom",
          files: [raw],
          thumbSrc: `${FIXTURE_BASE}/trail.jpg`,
          rotate: "-4deg",
          nudgeX: "10px",
        },
      ]);
    }

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  function reportError(error: FileUploadError) {
    showStatus(statusForError(error, Number(values.maxFiles), Number(values.maxSizeMb)));
  }

  function applyIncoming(incoming: File[], replace: boolean) {
    const maxFiles = Number(values.maxFiles);

    const typeRejected = incoming.filter((file) => !matchesAccept(file, accept));
    if (typeRejected.length > 0) {
      reportError({ type: "accept", files: typeRejected });
      return;
    }
    if (maxSize != null) {
      const sizeRejected = incoming.filter((file) => file.size > maxSize);
      if (sizeRejected.length > 0) {
        reportError({ type: "max-size", files: sizeRejected });
        return;
      }
    }
    const existingCount = replace ? 0 : files.length;
    if (existingCount + incoming.length > maxFiles) {
      reportError({ type: "max-files", files: incoming });
      return;
    }
    clearStatus();
    setFiles(replace ? incoming : [...files, ...incoming]);
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, item: DesktopItem) {
    // Prefer a React-side payload: Chromium HTML5 DnD from in-page buttons
    // synthesizes unreliable FileList entries (often from <img> thumbs),
    // so we never trust dataTransfer.files for desktop-icon drops.
    draggingFilesRef.current = item.files.map(cloneFile);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", item.id);
    setDraggingId(item.id);
    clearStatus();
  }

  function handleDesktopDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const incoming = draggingFilesRef.current ?? [];
    draggingFilesRef.current = null;
    setDraggingId(null);
    if (incoming.length === 0 || values.disabled) return;
    applyIncoming(incoming, false);
  }

  const desktopItems = items ?? [];

  return (
    <div className="file-upload-desktop">
      <p className="file-upload-desktop-hint">
        Drag any desktop item into the dropzone — images preview; other types list as files.
      </p>
      <div className="file-upload-desktop-surface" aria-label="Sample desktop">
        <DesktopRail
          rail="top"
          items={desktopItems}
          draggingId={draggingId}
          onDragStart={handleDragStart}
          onDragEnd={() => setDraggingId(null)}
        />
        <div className="file-upload-desktop-body">
          <DesktopRail
            rail="start"
            items={desktopItems}
            draggingId={draggingId}
            onDragStart={handleDragStart}
            onDragEnd={() => setDraggingId(null)}
          />
          <div
            className="file-upload-desktop-dropzone"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDesktopDrop}
          >
            <FileUpload
              label={String(values.label)}
              description={String(values.description)}
              accept={accept}
              multiple={Boolean(values.multiple)}
              preview={Boolean(values.preview)}
              aspectRatio={values.aspectRatio === "square" ? "square" : "auto"}
              maxFiles={Number(values.maxFiles)}
              maxSize={maxSize}
              invalid={Boolean(values.invalid)}
              errorMessage={String(values.errorMessage)}
              disabled={Boolean(values.disabled)}
              hideLabel={Boolean(values.hideLabel)}
              labelOffset={Boolean(values.labelOffset)}
              files={files}
              onFilesChange={(next) => {
                setFiles(next);
                clearStatus();
              }}
              onError={reportError}
            />
          </div>
          <DesktopRail
            rail="end"
            items={desktopItems}
            draggingId={draggingId}
            onDragStart={handleDragStart}
            onDragEnd={() => setDraggingId(null)}
          />
        </div>
        <DesktopRail
          rail="bottom"
          items={desktopItems}
          draggingId={draggingId}
          onDragStart={handleDragStart}
          onDragEnd={() => setDraggingId(null)}
        />
      </div>
      {lastError ? (
        <p className="file-upload-desktop-status" role="status">
          {lastError}
        </p>
      ) : null}
    </div>
  );
}

export default function FileUploadPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="file-upload-desktop-stage"
      render={(values) => <FileUploadDesktop values={values} />}
    />
  );
}
