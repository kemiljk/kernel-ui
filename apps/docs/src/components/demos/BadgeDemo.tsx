import { Badge } from "@kernelui-lib/react";

export default function BadgeDemo() {
  return (
    <>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="accent">New</Badge>
      <Badge variant="success">Shipped</Badge>
      <Badge variant="warning">Beta</Badge>
      <Badge variant="danger">Deprecated</Badge>
    </>
  );
}
