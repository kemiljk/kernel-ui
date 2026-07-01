import { Tabs, TabsList, Tab, TabPanel } from "@kernelui/react";

export default function TabsDemo() {
  return (
    <div style={{ inlineSize: "100%" }}>
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project sections">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity">Activity</Tab>
          <Tab value="settings">Settings</Tab>
        </TabsList>
        <TabPanel value="overview">A summary of the project.</TabPanel>
        <TabPanel value="activity">Recent commits and comments.</TabPanel>
        <TabPanel value="settings">Project-level configuration.</TabPanel>
      </Tabs>
    </div>
  );
}
