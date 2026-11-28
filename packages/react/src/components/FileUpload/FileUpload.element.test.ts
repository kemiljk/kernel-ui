import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../elements/src/components/FileUpload/FileUpload";
import "../../../../elements/src/components/TextField/TextField";

// `<kernel-file-upload>` behaviour that only exists in the Custom Element:
// what happens to the host's `id`, and which `change` events reach the host.

/** jsdom ships no `DataTransfer`, and an input's `files` only takes a real
 * `FileList`. A selection is an array here, on a per-input `files` property. */
function stubFiles(input: HTMLInputElement) {
  let files: File[] = [];
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => files,
    set: (next: File[]) => {
      files = Array.from(next);
    },
  });
  return (next: File[]) => {
    files = next;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
}

function fileOfSize(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("<kernel-file-upload>", () => {
  const OriginalDataTransfer = globalThis.DataTransfer;

  beforeEach(() => {
    class DataTransferStub {
      private list: File[] = [];
      items = { add: (file: File) => void this.list.push(file) };
      get files() {
        return this.list;
      }
    }
    globalThis.DataTransfer = DataTransferStub as unknown as typeof DataTransfer;
  });

  afterEach(() => {
    globalThis.DataTransfer = OriginalDataTransfer;
    document.body.innerHTML = "";
  });

  it("keeps the host's id on the host and labels the input", () => {
    document.body.innerHTML = `<kernel-file-upload id="uploader" label="Documents"></kernel-file-upload>`;
    const host = document.getElementById("uploader");
    expect(host?.tagName).toBe("KERNEL-FILE-UPLOAD");
    expect(document.querySelectorAll("#uploader")).toHaveLength(1);

    const input = host!.querySelector<HTMLInputElement>("input[type=file]")!;
    expect(input.id).toBe("uploader-control");
    expect(Array.from(input.labels ?? []).map((label) => label.textContent)).toEqual([
      expect.stringContaining("Documents"),
    ]);
  });

  it("points the error message at the renamed input", () => {
    document.body.innerHTML = `<kernel-file-upload id="uploader" label="Documents" invalid error-message="Too big"></kernel-file-upload>`;
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    const describedBy = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)?.textContent).toBe("Too big");
  });

  it("fires the error, and no host change, for a rejected pick", () => {
    document.body.innerHTML = `<kernel-file-upload label="Documents" max-size="5242880"></kernel-file-upload>`;
    const host = document.querySelector("kernel-file-upload")!;
    const pick = stubFiles(host.querySelector<HTMLInputElement>("input[type=file]")!);
    const onChange = vi.fn();
    const onError = vi.fn();
    host.addEventListener("change", onChange);
    host.addEventListener("kernel-file-upload-error", onError);
    document.body.addEventListener("change", onChange);

    const huge = fileOfSize("huge.pdf", "application/pdf", 6 * 1024 * 1024);
    pick([huge]);

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as CustomEvent).detail).toEqual({ type: "max-size", files: [huge] });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports a rejected type as `accept`", () => {
    document.body.innerHTML = `<kernel-file-upload label="Documents" accept="image/*,.pdf"></kernel-file-upload>`;
    const host = document.querySelector("kernel-file-upload")!;
    const pick = stubFiles(host.querySelector<HTMLInputElement>("input[type=file]")!);
    const onError = vi.fn();
    host.addEventListener("kernel-file-upload-error", onError);

    const zip = fileOfSize("notes.zip", "application/zip", 10);
    pick([zip]);

    expect((onError.mock.calls[0]![0] as CustomEvent).detail).toEqual({ type: "accept", files: [zip] });
  });

  it("fires exactly one host change for an accepted pick", () => {
    document.body.innerHTML = `<kernel-file-upload label="Documents" max-size="5242880"></kernel-file-upload>`;
    const host = document.querySelector("kernel-file-upload")!;
    const input = host.querySelector<HTMLInputElement>("input[type=file]")!;
    const pick = stubFiles(input);
    const events: Event[] = [];
    host.addEventListener("change", (event) => events.push(event));

    const report = fileOfSize("report.pdf", "application/pdf", 20480);
    pick([report]);

    expect(events).toHaveLength(1);
    expect(events[0]!.target).toBe(host);
    expect(Array.from(input.files ?? [])).toEqual([report]);
    expect(host.textContent).toContain("report.pdf");
  });
});

describe("element ids", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps a text field's id on the host and labels its input", () => {
    document.body.innerHTML = `<kernel-text-field id="email" label="Email"></kernel-text-field>`;
    expect(document.querySelectorAll("#email")).toHaveLength(1);
    expect(document.getElementById("email")?.tagName).toBe("KERNEL-TEXT-FIELD");
    const input = document.querySelector("input")!;
    expect(input.id).toBe("email-control");
    expect(input.labels?.[0]?.textContent).toBe("Email");
  });
});
