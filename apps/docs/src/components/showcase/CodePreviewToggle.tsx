import { Button, Tab, TabPanel, Tabs, TabsList } from "@kernelui/react";

export default function CodePreviewToggle() {
  return (
    <div className="showcase-item">
      <Tabs defaultValue="code">
        <TabsList aria-label="Code or preview">
          <Tab value="code">Code</Tab>
          <Tab value="preview">Preview</Tab>
        </TabsList>
        <TabPanel value="code">
          <pre style={{ margin: 0 }}>
            <code
              style={{
                fontFamily: "var(--kernel-font-mono)",
                fontSize: "var(--kernel-font-size-sm)",
              }}
            >
              {'<Button variant="primary">Ship it</Button>'}
            </code>
          </pre>
        </TabPanel>
        <TabPanel value="preview">
          <Button variant="primary">Ship it</Button>
        </TabPanel>
      </Tabs>
    </div>
  );
}
