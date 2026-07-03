import { Tabs, TabsList, Tab, TabPanel } from "@kernelui-lib/react";

export default function TabsDemo() {
  return (
    <div style={{ inlineSize: "100%" }}>
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project sections">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity">Activity</Tab>
          <Tab value="deployments">Deployments</Tab>
          <Tab value="settings">Settings</Tab>
          <Tab value="billing">Billing &amp; usage</Tab>
        </TabsList>
        <TabPanel value="overview">A summary of the project.</TabPanel>
        <TabPanel value="activity">Recent commits and comments.</TabPanel>
        <TabPanel value="deployments">Build and deployment history.</TabPanel>
        <TabPanel value="settings">Project-level configuration.</TabPanel>
        <TabPanel value="billing">Plan, invoices, and usage limits.</TabPanel>
      </Tabs>
    </div>
  );
}
