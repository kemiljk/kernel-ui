import { Tab, TabPanel, Tabs, TabsList } from "@kernelui-lib/react";
import CopyButton from "../CopyButton";
import { HighlightedCode } from "../HighlightedCode";

const PLATFORMS = [
  {
    id: "react",
    label: "React",
    code: `import { Button } from "@kernelui-lib/react";

<Button variant="primary">Save changes</Button>`,
  },
  {
    id: "elements",
    label: "Web Components",
    code: `<script type="module">
  import "@kernelui-lib/elements";
</script>

<kernel-button variant="primary">Save changes</kernel-button>`,
  },
  {
    id: "unstyled",
    label: "Unstyled",
    code: `import { Button } from "@kernelui-lib/react";
// No "@kernelui-lib/react/styles.css" import anywhere —
// <Button> is still a real <button>, just unstyled.`,
  },
] as const;

/** One snippet per way in, switched with the library's own Tabs. */
export default function PlatformTabs() {
  return (
    <Tabs defaultValue="react" className="platform-tabs">
      <TabsList aria-label="Platform">
        {PLATFORMS.map(({ id, label }) => (
          <Tab key={id} value={id}>
            {label}
          </Tab>
        ))}
      </TabsList>
      {PLATFORMS.map(({ id, code }) => (
        <TabPanel key={id} value={id}>
          {/* The panel stays a bare wrapper, so its `hidden` attribute
              never has to compete with the code block's own styles. */}
          <div className="code-block">
            <pre>
              <code>
                <HighlightedCode code={code} />
              </code>
            </pre>
            <CopyButton text={code} />
          </div>
        </TabPanel>
      ))}
    </Tabs>
  );
}
