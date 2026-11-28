import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog } from "./components/Dialog/Dialog";
import { NumberField } from "./components/NumberField/NumberField";
import { Pagination, PaginationNext } from "./components/Pagination/Pagination";
import { TagInput } from "./components/TagInput/TagInput";
import "../../elements/src/components/Dialog/Dialog";
import "../../elements/src/components/TagInput/TagInput";

// Built-in strings go through `labels` (see AGENTS.md): defaults stay the
// English they always were, and every key can be overridden per instance —
// in React through the `labels` prop, in the Custom Element through a
// `label-*` attribute or the `labels` property.

describe("labels (React)", () => {
  it("keeps the English defaults", () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Settings">
        Body
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("overrides Dialog's close label", () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Réglages" labels={{ close: "Fermer" }}>
        Corps
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("overrides TagInput's interpolated remove label", () => {
    render(
      <TagInput
        label="Étiquettes"
        defaultValue={["design"]}
        labels={{ removeTag: (tag) => `Supprimer ${tag}` }}
      />,
    );
    expect(screen.getByRole("button", { name: "Supprimer design", hidden: true })).toBeInTheDocument();
  });

  it("defaults TagInput's remove label to Remove {tag}", () => {
    render(<TagInput label="Tags" defaultValue={["design"]} />);
    expect(screen.getByRole("button", { name: "Remove design", hidden: true })).toBeInTheDocument();
  });

  it("overrides only the NumberField keys it's given", () => {
    render(<NumberField label="Quantité" labels={{ increment: "Augmenter" }} />);
    expect(screen.getByRole("button", { name: "Augmenter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrement" })).toBeInTheDocument();
  });

  it("overrides Pagination's nav and control labels", () => {
    render(
      <Pagination labels={{ navigation: "Seiten" }}>
        <PaginationNext labels={{ nextPage: "Nächste Seite", next: "Weiter" }} />
      </Pagination>,
    );
    expect(screen.getByRole("navigation", { name: "Seiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nächste Seite" })).toHaveTextContent("Weiter");
  });
});

describe("labels (Custom Elements)", () => {
  it("reads label-* attributes and re-applies them on change", () => {
    document.body.innerHTML = `<kernel-dialog title="Réglages" label-close="Fermer"></kernel-dialog>`;
    const host = document.querySelector("kernel-dialog")!;
    const close = host.querySelector('[data-slot="dialog-close"]')!;
    expect(close.getAttribute("aria-label")).toBe("Fermer");
    host.setAttribute("label-close", "Schließen");
    expect(close.getAttribute("aria-label")).toBe("Schließen");
    host.removeAttribute("label-close");
    expect(close.getAttribute("aria-label")).toBe("Close");
  });

  it("fills {placeholders} in templates and accepts a labels property", () => {
    document.body.innerHTML = `<kernel-tag-input label="Tags" value="design" label-remove-tag="Supprimer {tag}"></kernel-tag-input>`;
    const host = document.querySelector("kernel-tag-input") as HTMLElement & {
      labels: Record<string, unknown>;
    };
    const remove = () => host.querySelector('[data-tag="design"] button')!.getAttribute("aria-label");
    expect(remove()).toBe("Supprimer design");
    host.labels = { removeTag: (tag: string) => `Entfernen: ${tag}` };
    expect(remove()).toBe("Entfernen: design");
    host.labels = {};
    expect(remove()).toBe("Supprimer design");
    host.removeAttribute("label-remove-tag");
    expect(remove()).toBe("Remove design");
  });
});
