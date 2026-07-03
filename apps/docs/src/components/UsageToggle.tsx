import { Tab, TabPanel, Tabs, TabsList } from "@kernelui-lib/react";
import CopyButton from "./CopyButton";
import { HighlightedCode } from "./HighlightedCode";

export interface UsageToggleProps {
  code: string;
  elementsCode: string;
}

/**
 * The same React/Web Components tabs `Playground` grew for prop-driven
 * pages, extracted for pages that only have a single static usage
 * snippet (no controls to drive a live `Playground`) — `Toast`,
 * `Resizable`, `ScrollArea`, and any static-example page whose
 * component also has an `@kernelui-lib/elements` equivalent. Same
 * markup/classes as `Playground`'s own Usage section, so the two read
 * as one component.
 */
export default function UsageToggle({ code, elementsCode }: UsageToggleProps) {
  return (
    <details className="usage-accordion">
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
      <div className="usage-accordion-content">
        <Tabs defaultValue="react" className="prop-playground-format-tabs">
          <TabsList aria-label="Code format">
            <Tab value="react">React</Tab>
            <Tab value="elements">Web Components</Tab>
          </TabsList>
          <TabPanel value="react" className="prop-playground-format-panel">
            <div className="code-block">
              <pre>
                <code>
                  <HighlightedCode code={code} />
                </code>
              </pre>
              <CopyButton text={code} />
            </div>
          </TabPanel>
          <TabPanel value="elements" className="prop-playground-format-panel">
            <div className="code-block">
              <pre>
                <code>
                  <HighlightedCode code={elementsCode} />
                </code>
              </pre>
              <CopyButton text={elementsCode} />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </details>
  );
}
