import { Message, MessageBubble, MessageList, MessageScroller } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const lines = Array.from({ length: 14 }, (_, i) => `Message ${i + 1}`);

const controls = [
  { type: "text" as const, prop: "maxBlockSize", label: "max block size", default: "12rem" },
  { type: "boolean" as const, prop: "showJumpToLatest", label: "jump to latest", default: true },
  { type: "text" as const, prop: "jumpLabel", label: "jump label", default: "Jump to latest" },
  { type: "number" as const, prop: "threshold", label: "threshold (px)", default: 24, min: 0, max: 200, step: 4 },
];

function code(values: PlaygroundValues) {
  return `<MessageScroller
  maxBlockSize="${values.maxBlockSize}"
  showJumpToLatest={${values.showJumpToLatest}}
  jumpLabel="${values.jumpLabel}"
  threshold={${values.threshold}}
  onPinnedChange={(pinned) => console.log(pinned)}
>
  <MessageList>
    {messages.map((m) => (
      <Message key={m.id} author={m.author}>
        <MessageBubble>{m.text}</MessageBubble>
      </Message>
    ))}
  </MessageList>
</MessageScroller>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-message-scroller
  max-block-size="${values.maxBlockSize}"${values.showJumpToLatest ? "" : "\n  no-jump"}
  jump-label="${values.jumpLabel}"
  threshold="${values.threshold}"
>
  <kernel-message-list>
    <kernel-message author="user"><kernel-message-bubble tone="accent">Hi</kernel-message-bubble></kernel-message>
    <kernel-message author="assistant"><kernel-message-bubble>Hello</kernel-message-bubble></kernel-message>
  </kernel-message-list>
</kernel-message-scroller>

<script type="module">
  // Appending later is fine — new children are relocated into the viewport.
  const scroller = document.querySelector("kernel-message-scroller");
  scroller.addEventListener("kernel-pinned-change", (e) => console.log(e.detail.pinned));
</script>`;
}

export default function MessageScrollerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <MessageScroller
          maxBlockSize={String(values.maxBlockSize)}
          showJumpToLatest={Boolean(values.showJumpToLatest)}
          jumpLabel={String(values.jumpLabel)}
          threshold={Number(values.threshold)}
          style={{ inlineSize: "min(28rem, 100%)" }}
        >
          <MessageList>
            {lines.map((text, index) => (
              <Message key={text} author={index % 2 === 0 ? "assistant" : "user"}>
                <MessageBubble tone={index % 2 === 0 ? "neutral" : "accent"}>{text}</MessageBubble>
              </Message>
            ))}
          </MessageList>
        </MessageScroller>
      )}
    />
  );
}
