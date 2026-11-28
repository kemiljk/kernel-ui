import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Attachment, AttachmentList, formatFileSize } from "./Attachment";

describe("formatFileSize", () => {
  it("formats bytes in decimal steps with Intl unit names", () => {
    expect(formatFileSize(820, "en-US")).toBe("820 byte");
    expect(formatFileSize(2_400, "en-US")).toBe("2.4 kB");
    expect(formatFileSize(2_400_000, "en-US")).toBe("2.4 MB");
    expect(formatFileSize(512_000_000, "en-US")).toBe("512 MB");
  });
});

describe("Attachment", () => {
  it("renders the name with the extension kept apart for middle truncation", () => {
    const { container } = render(
      <Attachment name="quarterly-report-final.pdf" size={2_400_000} locale="en-US" />,
    );
    const name = container.querySelector('[data-slot="attachment-name"]')!;
    expect(name).toHaveTextContent("quarterly-report-final.pdf");
    expect(name).toHaveAttribute("title", "quarterly-report-final.pdf");
    expect(name.lastElementChild).toHaveTextContent("inal.pdf");
    expect(screen.getByText("PDF · 2.4 MB")).toBeInTheDocument();
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("calls onRemove from a remove button named after the file", () => {
    const onRemove = vi.fn();
    render(<Attachment name="notes.txt" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove notes.txt" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("shows upload progress as a labelled progressbar until complete", () => {
    const { rerender } = render(
      <Attachment name="photo.png" size={1_000_000} progress={0.42} locale="en-US" />,
    );
    const bar = screen.getByRole("progressbar", { name: "Uploading photo.png" });
    expect(bar).toHaveAttribute("value", "0.42");
    expect(bar).toHaveAttribute("max", "1");
    expect(screen.getByText("42% · 1 MB")).toBeInTheDocument();

    rerender(<Attachment name="photo.png" size={1_000_000} progress={1} locale="en-US" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("PNG · 1 MB")).toBeInTheDocument();
  });

  it("uses a decorative thumbnail when previewSrc is set", () => {
    const { container } = render(<Attachment name="photo.png" previewSrc="data:image/png;base64,AA==" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    expect(img.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("renders list items inside an AttachmentList", () => {
    render(
      <AttachmentList aria-label="Attachments">
        <Attachment name="a.pdf" />
        <Attachment name="b.png" />
      </AttachmentList>,
    );
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(list.tagName).toBe("UL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});
