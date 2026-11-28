import { Button, Switch, Tab, TabPanel, Tabs, TabsList, TextField, Textarea } from "@kernelui-lib/react";

export default function App() {
  return (
    <main className="page">
      <h1>Account settings</h1>
      <Tabs defaultValue="profile">
        <TabsList aria-label="Settings sections">
          <Tab value="profile">Profile</Tab>
          <Tab value="notifications">Notifications</Tab>
          <Tab value="privacy">Privacy</Tab>
        </TabsList>

        <TabPanel value="profile">
          <form className="stack" onSubmit={(e) => e.preventDefault()}>
            <TextField label="Display name" defaultValue="Ada Lovelace" autoComplete="nickname" />
            <Textarea label="Bio" description="A sentence or two about you." defaultValue="Writes programs for engines that don't exist yet." />
            <div>
              <Button type="submit" variant="primary">
                Save
              </Button>
            </div>
          </form>
        </TabPanel>

        <TabPanel value="notifications">
          <div className="stack">
            <Switch defaultChecked>Email notifications</Switch>
            <Switch>Push notifications</Switch>
            <Switch defaultChecked>Weekly digest</Switch>
          </div>
        </TabPanel>

        <TabPanel value="privacy">
          <div className="stack">
            <Switch>Public profile</Switch>
            <Switch defaultChecked>Show online status</Switch>
            <div>
              <Button variant="danger">Delete account</Button>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </main>
  );
}
