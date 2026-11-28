import "@kernelui-lib/styles";
import "@kernelui-lib/elements/styles.css";
import "@kernelui-lib/elements";
import "./index.css";

/** `detail` of `<kernel-file-upload>`'s `kernel-file-upload-error` event. */
type FileUploadErrorDetail = { type: "accept" | "max-size" | "max-files" | "directory"; files: File[] };

const MAX_SIZE_MB = 5;
const UPLOAD_MS = 1500;

const upload = document.querySelector<HTMLElement>("kernel-file-upload")!;
const section = document.querySelector<HTMLElement>(".uploads")!;
const list = document.querySelector<HTMLUListElement>("#upload-list")!;
const started = new WeakSet<File>();

/** Simulates an upload: fills the bar over UPLOAD_MS, then marks the row done. */
function startUpload(file: File) {
  started.add(file);
  section.hidden = false;

  const item = document.createElement("li");
  item.className = "upload";
  const name = document.createElement("span");
  name.className = "upload-name";
  name.textContent = file.name;
  const progress = document.createElement("kernel-progress");
  progress.setAttribute("label", `Uploading ${file.name}`);
  progress.setAttribute("value", "0");
  const status = document.createElement("span");
  status.className = "upload-status";
  status.setAttribute("role", "status");
  status.textContent = "Uploading…";
  item.append(name, progress, status);
  list.append(item);

  const start = performance.now();
  const tick = (now: number) => {
    const done = Math.min(1, (now - start) / UPLOAD_MS);
    progress.setAttribute("value", String(Math.round(done * 100)));
    if (done < 1) {
      requestAnimationFrame(tick);
      return;
    }
    progress.remove();
    status.textContent = "Uploaded";
    item.dataset.done = "";
  };
  requestAnimationFrame(tick);
}

upload.addEventListener("change", (event) => {
  // The inner <input>'s own change event bubbles through here too, and it
  // fires for rejected picks as well; only the element's own change means
  // the selection was accepted.
  if (event.target !== upload) return;
  upload.removeAttribute("invalid");
  upload.removeAttribute("error-message");
  const files = upload.querySelector<HTMLInputElement>("input[type=file]")?.files ?? [];
  for (const file of Array.from(files)) if (!started.has(file)) startUpload(file);
});

upload.addEventListener("kernel-file-upload-error", (event) => {
  const { type, files } = (event as CustomEvent<FileUploadErrorDetail>).detail;
  const names = files.map((f) => f.name).join(", ");
  const message =
    type === "max-size"
      ? `${names} ${files.length === 1 ? "is" : "are"} larger than ${MAX_SIZE_MB} MB. Choose a smaller file.`
      : type === "accept"
        ? `${names}: only images and PDFs can be uploaded.`
        : "That couldn't be added. Choose files, not folders.";
  upload.setAttribute("error-message", message);
  upload.setAttribute("invalid", "");
});
