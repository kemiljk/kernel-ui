import { Button, Card, CardContent, Switch, Tab, Tabs, TabsList, TextField } from "@kernelui-lib/react";

const DENSITIES = ["comfortable", "compact"] as const;

/**
 * The same small form at both densities, side by side. Each card sets
 * `data-kernel-density` on itself, which is the point: density is scoped to
 * a subtree, not a page-wide switch.
 */
export default function DensityDemo() {
  return (
    <div className="density-demo">
      {DENSITIES.map((density) => (
        <Card key={density} data-kernel-density={density}>
          <CardContent className="density-demo-content">
            <p className="density-demo-label">
              <code>{`data-kernel-density="${density}"`}</code>
            </p>
            <Tabs defaultValue="profile">
              <TabsList aria-label={`Sections, ${density}`}>
                <Tab value="profile">Profile</Tab>
                <Tab value="billing">Billing</Tab>
              </TabsList>
            </Tabs>
            <TextField label="Display name" defaultValue="Ada Lovelace" />
            <Switch defaultChecked>Email me updates</Switch>
            <div className="density-demo-actions">
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary">Save</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
