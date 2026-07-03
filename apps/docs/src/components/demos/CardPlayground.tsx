import { Avatar, Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Separator } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "as",
    options: ["div", "article", "section"],
    default: "div",
  },
  { type: "text" as const, prop: "title", default: "Create an account" },
  {
    type: "number" as const,
    prop: "level",
    label: "title level",
    default: 3,
    min: 2,
    max: 6,
    step: 1,
  },
  {
    type: "text" as const,
    prop: "description",
    default: "Start your free 7-day trial. No credit card required.",
  },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.as !== "div") attrs.push(`as="${values.as}"`);
  const titleAttrs: string[] = [];
  if (values.level !== 3) titleAttrs.push(`level={${values.level}}`);
  return `<Card${attrs.length ? " " + attrs.join(" ") : ""}>
  <CardHeader>
    <Avatar src="https://api.dicebear.com/9.x/avataaars/svg?seed=Kernel" alt="" fallback="🙂" />
    <CardTitle${titleAttrs.length ? " " + titleAttrs.join(" ") : ""}>${values.title}</CardTitle>
    <CardDescription>${values.description}</CardDescription>
  </CardHeader>
  <CardContent>
    <Button variant="primary">Get started</Button>
    <Separator />
    <Button variant="secondary">Continue with email</Button>
  </CardContent>
</Card>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.as !== "div") attrs.push(`as="${values.as}"`);
  const titleAttrs: string[] = [];
  if (values.level !== 3) titleAttrs.push(`level="${values.level}"`);
  return `<kernel-card${attrs.length ? " " + attrs.join(" ") : ""}>
  <kernel-card-header>
    <kernel-avatar src="https://api.dicebear.com/9.x/avataaars/svg?seed=Kernel" alt="" fallback="🙂"></kernel-avatar>
    <kernel-card-title${titleAttrs.length ? " " + titleAttrs.join(" ") : ""}>${values.title}</kernel-card-title>
    <kernel-card-description>${values.description}</kernel-card-description>
  </kernel-card-header>
  <kernel-card-content>
    <kernel-button variant="primary">Get started</kernel-button>
    <kernel-separator></kernel-separator>
    <kernel-button variant="secondary">Continue with email</kernel-button>
  </kernel-card-content>
</kernel-card>`;
}

export default function CardPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Card as={values.as as "div" | "article" | "section"} style={{ maxInlineSize: "22rem", inlineSize: "100%" }}>
          <CardHeader
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "var(--kernel-space-3)",
            }}
          >
            <Avatar src="https://api.dicebear.com/9.x/avataaars/svg?seed=Kernel" alt="" fallback="🙂" />
            <div>
              <CardTitle level={Number(values.level) as 2 | 3 | 4 | 5 | 6}>{String(values.title)}</CardTitle>
              <CardDescription>{String(values.description)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: "var(--kernel-space-3)" }}>
            <Button variant="primary">Get started</Button>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--kernel-space-3)" }}>
              <Separator style={{ flex: 1 }} />
              <span style={{ fontSize: "var(--kernel-font-size-sm)", color: "var(--kernel-color-text-muted)" }}>
                or
              </span>
              <Separator style={{ flex: 1 }} />
            </div>
            <Button variant="secondary">Continue with email</Button>
          </CardContent>
        </Card>
      )}
    />
  );
}
