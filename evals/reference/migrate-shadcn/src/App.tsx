import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Dialog, Switch, TextField } from "@kernelui-lib/react";

export default function App() {
  const [email, setEmail] = useState("ada@example.com");
  const [marketing, setMarketing] = useState(true);
  const [saved, setSaved] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="page">
      <Card>
        <CardHeader>
          <CardTitle level={2}>Newsletter</CardTitle>
          <CardDescription>Choose what we send to your inbox.</CardDescription>
        </CardHeader>
        <CardContent className="stack">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Switch checked={marketing} onCheckedChange={setMarketing}>
            Product updates
          </Switch>
          <div role="status" className="status">
            {saved ? <p className="success">Preferences saved</p> : null}
            {unsubscribed ? <p>You have been unsubscribed</p> : null}
          </div>
        </CardContent>
        <CardFooter className="footer">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Unsubscribe
          </Button>
          <Button variant="primary" onClick={() => setSaved(true)}>
            Save preferences
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Unsubscribe from all emails?" description="You can subscribe again at any time.">
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setUnsubscribed(true);
              setConfirmOpen(false);
            }}
          >
            Unsubscribe
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
