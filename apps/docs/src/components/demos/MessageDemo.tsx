import { Message, MessageBubble, MessageList } from "@kernelui-lib/react";

export default function MessageDemo() {
  return (
    <MessageList style={{ inlineSize: "min(32rem, 100%)" }}>
      <Message author="user" name="You" avatar="Y" metadata="09:14">
        <MessageBubble tone="accent">Can you summarise the release notes?</MessageBubble>
      </Message>
      <Message author="assistant" name="Assistant" avatar="A">
        <MessageBubble>Three changes landed: snap points, a pinned footer, and a linear scrim fade.</MessageBubble>
      </Message>
      <Message author="assistant" grouped>
        <MessageBubble expandable expandLabel="Show the full changelog">
          Sheet gained snap points and a spring settle, Sheet gained a pinned footer slot, and the
          scrim now fades linearly so it no longer reads as two separate animations.
        </MessageBubble>
      </Message>
      <Message author="assistant" grouped metadata="Answered in 1.2s">
        <MessageBubble tone="muted">Anything else you want pulled out of the notes?</MessageBubble>
      </Message>
    </MessageList>
  );
}
