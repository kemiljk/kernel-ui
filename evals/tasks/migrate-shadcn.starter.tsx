import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function App() {
  const [email, setEmail] = useState("ada@example.com");
  const [marketing, setMarketing] = useState(true);
  const [saved, setSaved] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  return (
    <main className="mx-auto max-w-lg p-6">
      <Card>
        <CardHeader>
          <CardTitle>Newsletter</CardTitle>
          <CardDescription>Choose what we send to your inbox.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="marketing">Product updates</Label>
            <Switch id="marketing" checked={marketing} onCheckedChange={setMarketing} />
          </div>
          {saved && <p className="text-sm text-green-600">Preferences saved</p>}
          {unsubscribed && <p className="text-sm text-muted-foreground">You have been unsubscribed</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Unsubscribe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unsubscribe from all emails?</DialogTitle>
                <DialogDescription>You can subscribe again at any time.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={() => setUnsubscribed(true)}>
                    Unsubscribe
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setSaved(true)}>Save preferences</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
