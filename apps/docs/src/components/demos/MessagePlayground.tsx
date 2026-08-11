import { Message, MessageBubble, MessageList } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "enum" as const, prop: "author", label: "author", options: ["assistant", "user", "system"], default: "user" },
  { type: "enum" as const, prop: "tone", label: "tone", options: ["neutral", "accent", "muted", "danger"], default: "accent" },
  { type: "enum" as const, prop: "align", label: "align", options: ["start", "center", "end"], default: "start" },
  { type: "text" as const, prop: "name", label: "name", default: "You" },
  { type: "text" as const, prop: "metadata", label: "metadata", default: "09:14" },
  { type: "boolean" as const, prop: "grouped", label: "grouped", default: false },
  { type: "boolean" as const, prop: "live", label: "live", default: false },
  { type: "boolean" as const, prop: "expandable", label: "expandable", default: false },
];

function code(values: PlaygroundValues) {
  return `<MessageList>
  <Message
    author="${values.author}"
    name="${values.name}"
    metadata="${values.metadata}"
    avatar="Y"${values.grouped ? "\n    grouped" : ""}${values.live ? "\n    live" : ""}
  >
    <MessageBubble tone="${values.tone}" align="${values.align}"${values.expandable ? " expandable" : ""}>
      Can you summarise the release notes?
    </MessageBubble>
  </Message>
</MessageList>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-message-list>
  <kernel-message
    author="${values.author}"
    name="${values.name}"
    metadata="${values.metadata}"${values.grouped ? "\n    grouped" : ""}${values.live ? "\n    live" : ""}
  >
    <span data-slot="avatar">Y</span>
    <kernel-message-bubble tone="${values.tone}" align="${values.align}"${values.expandable ? " expandable" : ""}>
      Can you summarise the release notes?
    </kernel-message-bubble>
  </kernel-message>
</kernel-message-list>`;
}

export default function MessagePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <MessageList style={{ inlineSize: "min(28rem, 100%)" }}>
          <Message
            author={values.author as "user" | "assistant" | "system"}
            name={String(values.name)}
            metadata={String(values.metadata)}
            avatar="Y"
            grouped={Boolean(values.grouped)}
            live={Boolean(values.live)}
            animateOnMount={false}
          >
            <MessageBubble
              tone={values.tone as "neutral" | "accent" | "muted" | "danger"}
              align={values.align as "start" | "center" | "end"}
              expandable={Boolean(values.expandable)}
            >
              Can you summarise the release notes?
            </MessageBubble>
          </Message>
        </MessageList>
      )}
    />
  );
}
