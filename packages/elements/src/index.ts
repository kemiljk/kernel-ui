/**
 * @kernelui/elements — Kernel's components as native Custom Elements.
 * Importing this module registers every tag below via
 * `customElements.define`; framework-specific wrappers aren't needed
 * to use them (see the README for React/Vue/Svelte/Astro usage).
 *
 * Phase 1 + Phase 2 + Phase 3: every component in the catalog now has
 * a Custom Element equivalent — see CATEGORIES in
 * apps/docs/src/data/components.ts for the category ordering rationale
 * this package's own file layout follows (how often each group
 * actually gets reached, not alphabetically). Phase 3 (Dialog,
 * Popover, Tooltip, Tabs, DropdownMenu, Combobox, Accordion, Carousel,
 * Command Palette, Context Menu, Data Table, Date Picker, Date Range
 * Picker, Hover Card, Navigation Menu) leans on the same native
 * platform primitives `@kernelui/react` does — `<dialog>`,
 * `popover`/CSS anchor positioning, `<details>` — which is what makes
 * a vanilla-JS port of "behaviorally complex" React components
 * tractable at all.
 */
export { KernelButton } from "./components/Button/Button";
export { KernelBadge } from "./components/Badge/Badge";
export { KernelLabel } from "./components/Label/Label";
export { KernelSeparator } from "./components/Separator/Separator";
export { KernelProgress } from "./components/Progress/Progress";
export { KernelSkeleton } from "./components/Skeleton/Skeleton";
export { KernelCallout } from "./components/Callout/Callout";
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

// Phase 2 — Primitives (remaining)
export { KernelAvatar } from "./components/Avatar/Avatar";
export { KernelCheckbox } from "./components/Checkbox/Checkbox";
export { KernelRadioGroup, KernelRadioGroupItem } from "./components/RadioGroup/RadioGroup";
export { KernelSwitch } from "./components/Switch/Switch";
export { KernelToggle } from "./components/Toggle/Toggle";

// Phase 2 — Forms (structurally-trivial ones; Combobox stays deferred
// alongside Dialog/Popover/Tabs — see the note above)
export { KernelTextField } from "./components/TextField/TextField";
export { KernelTextarea } from "./components/Textarea/Textarea";
export { KernelSelect } from "./components/Select/Select";
export { KernelSlider } from "./components/Slider/Slider";
export { KernelInputOTP } from "./components/InputOTP/InputOTP";

// Phase 2 — Layout (remaining)
export { KernelResizable } from "./components/Resizable/Resizable";
export { KernelScrollArea } from "./components/ScrollArea/ScrollArea";

// Phase 2 — Feedback (remaining)
export { KernelToastViewport, toast } from "./components/Toast/ToastViewport";
export type { ToastContent, ToastOptions, ToastVariant } from "./components/Toast/ToastViewport";

// Phase 2 — Data Display (structurally-trivial ones)
export {
  KernelTable,
  KernelTableHead,
} from "./components/Table/Table";

// Phase 2 — AI
export { KernelThinkingIndicator } from "./components/ThinkingIndicator/ThinkingIndicator";
export { KernelComposer } from "./components/Composer/Composer";
export { KernelReasoning } from "./components/Reasoning/Reasoning";

// Phase 3 — Overlays (native <dialog> / [popover] / CSS anchor positioning)
export { KernelDialog } from "./components/Dialog/Dialog";
export { KernelPopover } from "./components/Popover/Popover";
export { KernelTooltip } from "./components/Tooltip/Tooltip";
export { KernelHoverCard } from "./components/HoverCard/HoverCard";
export {
  KernelDropdownMenu,
  KernelMenuItem,
  KernelMenuSeparator,
} from "./components/DropdownMenu/DropdownMenu";
export { KernelContextMenu } from "./components/ContextMenu/ContextMenu";
export {
  KernelNavigationMenu,
  KernelNavMenuItem,
  KernelNavMenuLink,
  KernelNavMenuTrigger,
  KernelNavMenuContent,
} from "./components/NavigationMenu/NavigationMenu";
export { KernelCombobox } from "./components/Combobox/Combobox";
export { KernelCommandPalette } from "./components/CommandPalette/CommandPalette";
export type { KernelCommandPaletteItem } from "./components/CommandPalette/CommandPalette";

// Phase 3 — Navigation / Data Display (native <details>, scroll-snap,
// and <table> grids)
export { KernelTabs, KernelTabsList, KernelTab, KernelTabPanel } from "./components/Tabs/Tabs";
export { KernelAccordion, KernelAccordionItem } from "./components/Accordion/Accordion";
export { KernelCarousel, KernelCarouselSlide } from "./components/Carousel/Carousel";
export { KernelDataTable } from "./components/DataTable/DataTable";
export type { KernelDataTableColumn } from "./components/DataTable/DataTable";
export { KernelDatePicker } from "./components/DatePicker/DatePicker";
export { KernelDateRangePicker } from "./components/DateRangePicker/DateRangePicker";

// Phase 4 — Forms (new)
export { KernelColorPicker } from "./components/ColorPicker/ColorPicker";
export { KernelFileUpload } from "./components/FileUpload/FileUpload";
export { KernelTagInput } from "./components/TagInput/TagInput";
export { KernelNumberField } from "./components/NumberField/NumberField";

export { KernelElement, kernelClass, dataAttr } from "./base";
