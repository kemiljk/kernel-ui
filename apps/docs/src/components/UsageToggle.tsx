import { Tab, TabPanel, Tabs, TabsList } from "@kernelui-lib/react";
import CopyButton from "./CopyButton";
import { HighlightedCode } from "./HighlightedCode";
import UsageDisclosure from "./UsageDisclosure";

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
    <UsageDisclosure>
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
    </UsageDisclosure>
  );
}
