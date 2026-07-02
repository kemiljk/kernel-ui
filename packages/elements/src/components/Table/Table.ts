import { KernelElement, kernelClass } from "../../base";
import "./Table.css";

/**
 * `<kernel-table>` — a real `<table>`. Wrap it in a scrolling `<div>`
 * yourself for narrow screens, that's a layout concern, not the
 * table's. Compose with `<kernel-table-caption>`,
 * `<kernel-table-header>` (`<thead>`), `<kernel-table-body>`
 * (`<tbody>`), `<kernel-table-row>`, `<kernel-table-head>` (`<th>`),
 * `<kernel-table-cell>` (`<td>`).
 */
export class KernelTable extends KernelElement {
  protected createNative(): HTMLElement {
    const element = document.createElement("table");
    element.className = kernelClass("Table", "table");
    return element;
  }
}

function bareSection(tag: string) {
  return class extends KernelElement {
    protected createNative(): HTMLElement {
      return document.createElement(tag);
    }
  };
}

function classedSection(tag: string, part: string) {
  return class extends KernelElement {
    protected createNative(): HTMLElement {
      const element = document.createElement(tag);
      element.className = kernelClass("Table", part);
      return element;
    }
  };
}

/** `<kernel-table-head>` — a real `<th>`. `scope="col"` by default,
 * since a header cell almost always heads a column; pass
 * `scope="row"` explicitly for row headers. */
export class KernelTableHead extends KernelElement {
  static get observedAttributes() {
    return ["scope"];
  }

  protected createNative(): HTMLElement {
    const element = document.createElement("th");
    element.className = kernelClass("Table", "head");
    element.setAttribute("scope", this.getAttribute("scope") || "col");
    return element;
  }

  protected syncAttr(name: string, value: string | null) {
    if (name === "scope" && this.native) {
      this.native.setAttribute("scope", value || "col");
    }
  }
}

customElements.define("kernel-table", KernelTable);
customElements.define("kernel-table-caption", classedSection("caption", "caption"));
customElements.define("kernel-table-header", bareSection("thead"));
customElements.define("kernel-table-body", bareSection("tbody"));
customElements.define("kernel-table-row", classedSection("tr", "row"));
customElements.define("kernel-table-head", KernelTableHead);
customElements.define("kernel-table-cell", classedSection("td", "cell"));
