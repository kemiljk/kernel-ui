import { Avatar } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "fallback", default: "KK" },
  {
    type: "text" as const,
    prop: "src",
    default: "",
    placeholder: "Leave blank to show the fallback",
  },
  { type: "text" as const, prop: "alt", default: "Karl Koch" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.src) attrs.push(`src="${values.src}"`);
  if (values.alt) attrs.push(`alt="${values.alt}"`);
  attrs.push(`fallback="${values.fallback || "?"}"`);
  return `<Avatar ${attrs.join(" ")} />`;
}

export default function AvatarPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Avatar
          src={String(values.src) || undefined}
          alt={String(values.alt)}
          fallback={String(values.fallback) || "?"}
        />
      )}
    />
  );
}
