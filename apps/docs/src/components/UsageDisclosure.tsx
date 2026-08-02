import { useDetailsTransition } from "@kernelui-lib/react";
import type { ReactNode } from "react";

export interface UsageDisclosureProps {
  children: ReactNode;
}

/**
 * The "Usage" disclosure shell shared by `UsageAccordion.astro`,
 * `UsageToggle` and `Playground`.
 *
 * Uses the library's own `useDetailsTransition` rather than a CSS
 * `::details-content` height transition: that CSS route needs
 * `interpolate-size: allow-keywords` to interpolate `0` to `auto`, which is
 * still Chromium-only, so the docs' own disclosure snapped open in Safari and
 * Firefox while the Accordion sitting right above it animated. Docs chrome
 * should behave like the library it documents, on every engine.
 */
export default function UsageDisclosure({ children }: UsageDisclosureProps) {
  const { detailsRef, contentRef } = useDetailsTransition();

  return (
    <details ref={detailsRef} className="usage-accordion">
      <summary className="usage-accordion-trigger">
        <span>Usage</span>
        <svg
          className="usage-accordion-chevron"
          viewBox="0 0 15 15"
          fill="currentColor"
          fillRule="evenodd"
          aria-hidden="true"
        >
          <path d="M3.135 6.158a.5.5 0 0 1 .707-.023L7.5 9.565l3.658-3.43a.5.5 0 0 1 .684.73l-4 3.75a.5.5 0 0 1-.684 0l-4-3.75a.5.5 0 0 1-.023-.707Z" />
        </svg>
      </summary>
      <div ref={contentRef} className="usage-accordion-content">
        {children}
      </div>
    </details>
  );
}
