import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from "@kernelui/react";

export default function CardDemo() {
  return (
    <Card style={{ maxInlineSize: "24rem" }}>
      <CardHeader>
        <CardTitle>Upgrade to Pro</CardTitle>
        <CardDescription>Unlock every component, including the ones still on the roadmap.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, color: "var(--kernel-color-text-muted)", fontSize: "var(--kernel-font-size-sm)" }}>
          £9/month, cancel any time.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" size="sm">Upgrade</Button>
        <Button variant="ghost" size="sm">Not now</Button>
      </CardFooter>
    </Card>
  );
}
