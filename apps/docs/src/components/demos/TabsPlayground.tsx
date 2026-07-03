import { Tabs, TabsList, Tab, TabPanel } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "defaultValue",
    label: "default tab",
    options: ["overview", "activity", "settings"],
    default: "overview",
  },
  { type: "boolean" as const, prop: "disabled", label: "disable 'activity' tab", default: false },
];

function code(values: PlaygroundValues) {
  const activityAttrs = [`value="activity"`];
  if (values.disabled) activityAttrs.push("disabled");
  return `<Tabs defaultValue="${values.defaultValue}">
  <TabsList aria-label="Project sections">
    <Tab value="overview">Overview</Tab>
    <Tab ${activityAttrs.join(" ")}>Activity</Tab>
    <Tab value="settings">Settings</Tab>
  </TabsList>
  <TabPanel value="overview">A summary of the project.</TabPanel>
  <TabPanel value="activity">Recent commits and comments.</TabPanel>
  <TabPanel value="settings">Project-level configuration.</TabPanel>
</Tabs>`;
}

function elementsCode(values: PlaygroundValues) {
  const activityAttrs = [`value="activity"`];
  if (values.disabled) activityAttrs.push("disabled");
  return `<kernel-tabs default-value="${values.defaultValue}">
  <kernel-tabs-list aria-label="Project sections">
    <kernel-tab value="overview">Overview</kernel-tab>
    <kernel-tab ${activityAttrs.join(" ")}>Activity</kernel-tab>
    <kernel-tab value="settings">Settings</kernel-tab>
  </kernel-tabs-list>
  <kernel-tab-panel value="overview">A summary of the project.</kernel-tab-panel>
  <kernel-tab-panel value="activity">Recent commits and comments.</kernel-tab-panel>
  <kernel-tab-panel value="settings">Project-level configuration.</kernel-tab-panel>
</kernel-tabs>`;
}

export default function TabsPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ inlineSize: "100%" }}>
          <Tabs defaultValue={String(values.defaultValue)} key={String(values.defaultValue)}>
            <TabsList aria-label="Project sections">
              <Tab value="overview">Overview</Tab>
              <Tab value="activity" disabled={Boolean(values.disabled)}>
                Activity
              </Tab>
              <Tab value="settings">Settings</Tab>
            </TabsList>
            <TabPanel value="overview">A summary of the project.</TabPanel>
            <TabPanel value="activity">Recent commits and comments.</TabPanel>
            <TabPanel value="settings">Project-level configuration.</TabPanel>
          </Tabs>
        </div>
      )}
    />
  );
}
