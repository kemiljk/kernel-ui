import { Avatar, Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Separator } from "@kernelui-lib/react";

export default function CardDemo() {
  return (
    <Card style={{ maxInlineSize: "22rem", inlineSize: "100%" }}>
      <CardHeader style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--kernel-space-3)" }}>
        <Avatar
          src="https://api.dicebear.com/9.x/avataaars/svg?seed=Kernel"
          alt=""
          fallback="🙂"
        />
        <div>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Start your free 7-day trial. No credit card required.</CardDescription>
        </div>
      </CardHeader>
      <CardContent style={{ display: "flex", flexDirection: "column", gap: "var(--kernel-space-3)" }}>
        <Button variant="primary">Get started</Button>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--kernel-space-3)" }}>
          <Separator style={{ flex: 1 }} />
          <span style={{ fontSize: "var(--kernel-font-size-sm)", color: "var(--kernel-color-text-muted)" }}>or</span>
          <Separator style={{ flex: 1 }} />
        </div>
        <Button variant="secondary">Continue with email</Button>
      </CardContent>
    </Card>
  );
}
