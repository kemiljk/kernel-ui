export type ComponentCategory =
  | "Primitives"
  | "Forms"
  | "Layout"
  | "Feedback"
  | "Overlays"
  | "Navigation"
  | "Data Display"
  | "AI";

export interface RegistryEntry {
  name: string;
  category: ComponentCategory;
  slug: string;
  element: string;
  /** One short line. Shared by every consumer — the docs component cards, the
   * migration table, `registry.json`, and `llms.txt` — so it has to stay
   * card-length. Put anything longer in `llmsNote`. */
  summary: string;
  /** Extra prose appended after `summary` in `packages/react/llms.txt`, and
   * nowhere else. For the detail an agent needs but a card can't hold: a
   * callback's exact union type, a prop that has no equivalent in the library
   * being migrated from, a platform quirk worth knowing before writing code.
   *
   * Deliberately absent from `registry.json`: that file feeds the docs site and
   * the CLI, neither of which has anywhere sensible to render a paragraph, and
   * a field they can see is a field they'll eventually render. `summary` is the
   * shared one-liner; this is the LLM-only footnote.
   *
   * It exists because prose written straight into `llms.txt` doesn't survive:
   * the component list there sits between generation markers and is rebuilt
   * from these entries on every `bun run registry:build`. */
  llmsNote?: string;
  status: "available" | "planned";
  reactExports: string[];
  elementTag: string;
  elementSubTags?: string[];
  docsUrl: string;
  shadcnAliases?: string[];
  radixPackages?: string[];
  migrationCaveats?: string[];
}
