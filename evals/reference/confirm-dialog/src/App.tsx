import { useState } from "react";
import { Button, Callout, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Dialog } from "@kernelui-lib/react";

export default function App() {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <main className="page">
      <h1>Project settings</h1>
      <Card as="section" aria-labelledby="atlas-title">
        <CardHeader>
          <CardTitle id="atlas-title" level={2}>Atlas</CardTitle>
          <CardDescription>The shared design and research workspace for the Atlas launch.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Deleting the project removes its files, comments and history for everyone on the team.</p>
        </CardContent>
        <CardFooter>
          {deleted ? (
            <Callout variant="success" title="Project deleted">
              Atlas and everything in it has been removed.
            </Callout>
          ) : (
            <Button variant="danger" onClick={() => setOpen(true)}>
              Delete project
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Atlas?"
        description="This can't be undone. The project, its files and its history will be permanently deleted."
      >
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setOpen(false);
              setDeleted(true);
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
