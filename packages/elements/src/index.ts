/**
 * @kernelui/elements — Kernel's components as native Custom Elements.
 * Importing this module registers every tag below via
 * `customElements.define`; framework-specific wrappers aren't needed
 * to use them (see the README for React/Vue/Svelte/Astro usage).
 *
 * Phase 1: the 14 structurally-trivial components. Interactive/
 * behaviorally-complex ones (Dialog, Popover, Tooltip, Tabs,
 * DropdownMenu, Combobox, Accordion) land in a later phase.
 */
export { KernelButton } from "./components/Button/Button";
export { KernelBadge } from "./components/Badge/Badge";
export { KernelLabel } from "./components/Label/Label";
export { KernelSeparator } from "./components/Separator/Separator";
export { KernelProgress } from "./components/Progress/Progress";
export { KernelSkeleton } from "./components/Skeleton/Skeleton";
export { KernelAlert } from "./components/Alert/Alert";
export { KernelBreadcrumbs, KernelBreadcrumbItem } from "./components/Breadcrumbs/Breadcrumbs";
export {
  KernelPagination,
  KernelPaginationItem,
  KernelPaginationPrevious,
  KernelPaginationNext,
  KernelPaginationEllipsis,
} from "./components/Pagination/Pagination";
export { KernelHeader } from "./components/Header/Header";
export { KernelFooter } from "./components/Footer/Footer";
export { KernelSidebar } from "./components/Sidebar/Sidebar";
export { KernelNav, KernelNavLink } from "./components/Nav/Nav";
export { KernelCard, KernelCardTitle } from "./components/Card/Card";

export { KernelElement, kernelClass, dataAttr } from "./base";
