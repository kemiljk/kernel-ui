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
  summary: string;
  status: "available" | "planned";
  reactExports: string[];
  elementTag: string;
  elementSubTags?: string[];
  docsUrl: string;
  shadcnAliases?: string[];
  radixPackages?: string[];
  migrationCaveats?: string[];
}
