---
name: kernel-ui-elements
description: Build UI with Kernel UI's framework-free Custom Elements (@kernelui-lib/elements, <kernel-*> tags) in plain HTML, Astro, Vue, Svelte or any framework. Use whenever a project depends on @kernelui-lib/elements.
---

# Building UI with Kernel Custom Elements

Each `<kernel-*>` tag builds and owns a real native element in the light DOM: `<kernel-button>` renders a genuine `<button>`. There's no shadow root, so the page's own CSS and Kernel's tokens reach everything.

## Setup

```html
<link rel="stylesheet" href="node_modules/@kernelui-lib/styles/src/index.css" />
<link rel="stylesheet" href="node_modules/@kernelui-lib/elements/dist/kernel.css" />
<script type="module">import "@kernelui-lib/elements";</script>
```

Bundlers can use `import "@kernelui-lib/styles"`, `import "@kernelui-lib/elements/styles.css"` and `import "@kernelui-lib/elements"`.

## Workflow

1. **Pick tags first.** Use the `kernel` MCP server (`search_components`, then `get_component` with `platform: "elements"`), or read `node_modules/@kernelui-lib/elements/llms.txt`.
2. **Use real attributes.** They're kebab-case versions of React's props (`error-message`, `hide-label`). Booleans are presence-based (`<kernel-checkbox disabled>`), and string values go in attributes.
3. **Read rich values as DOM properties.** For example `tagInput.tags` returns an array, and CodeBlock takes `lines` or `code`.
4. **Listen to events.** React's `onValueChange` becomes a `change` event with `event.detail`. `get_component` lists each tag's events with the exact `detail` shape; don't guess it.
5. **Review.** Run `npx @kernelui-lib/cli check <files>` and fix what it reports.

## Conventions

- **Structured content uses real children.** `<kernel-select>` takes `<option>`s, `<kernel-tabs>` takes `<kernel-tab>` and `<kernel-tab-panel>`, and triggers are children marked `slot="trigger"`.
- **Form fields always get a `label` attribute.** Use `hide-label` to hide it visually.
- **Accessible names go on the tag.** `aria-label`, `aria-labelledby` and `aria-describedby` on a `<kernel-*>` tag are forwarded to the real control inside it (`get_component` lists them under "Forwarded to the native control"). A `<kernel-switch>` is named by its text content; with no visible text, give the tag `aria-label="Bill yearly"`, or `aria-labelledby` pointing at text beside it.
- **`id` stays on the tag.** `document.getElementById("uploader")` returns the `<kernel-file-upload>` itself, the element whose events you listen to. The inner control gets `<id>-control`.
- **One `<h1>` per page.** No Kernel tag renders the page heading, so add it yourself; axe flags a page without one.
- **Icons.** No icon set ships with Kernel. Put an `<svg>` or `<img>` first or last inside `<kernel-button>`, `<kernel-badge>` or `<kernel-suggestion-item>`; mark any other icon element with `data-icon`. Give an icon-only `<kernel-button>` an `aria-label`.
- **Styling.** Style with `--kernel-*` tokens only, never hard-coded colours or radii. The component class names (`kernel-Button-root`…) are the same in the React package.
- **Framework bindings.** The tags work in any framework. In React 19 they're fine as plain JSX, though `@kernelui-lib/react` is usually the better fit there.

## File upload with validation

`<kernel-file-upload>` validates `accept`, `max-size` (bytes) and `max-files` itself but doesn't show a message: it dispatches `kernel-file-upload-error` and leaves the wording to you. Its own `change` fires only when the selection changes (an accepted pick or drop, or a removal), so it's the place to clear the error.

```html
<kernel-file-upload id="documents" label="Documents" accept="image/*,.pdf" multiple max-size="5242880"></kernel-file-upload>
<script type="module">
  const upload = document.getElementById("documents");
  upload.addEventListener("kernel-file-upload-error", (event) => {
    // detail: { type: "accept" | "max-size" | "max-files" | "directory", files: File[] }
    const { type, files } = event.detail;
    const messages = {
      "max-size": `${files[0].name} is over 5 MB.`,
      accept: `${files[0].name} isn't an image or a PDF.`,
      "max-files": "Too many files.",
      directory: "Folders can't be uploaded.",
    };
    upload.setAttribute("error-message", messages[type]);
    upload.setAttribute("invalid", "");
  });
  upload.addEventListener("change", () => {
    upload.removeAttribute("invalid");
    upload.removeAttribute("error-message");
    const files = [...upload.querySelector("input[type=file]").files];
    // start uploads for `files`
  });
</script>
```
