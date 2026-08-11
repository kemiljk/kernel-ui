import { useEffect, useRef, useState } from "react";
import { Message, MessageBubble, MessageList, MessageScroller } from "@kernelui-lib/react";

const SCRIPT = [
  "Pinned to the live edge — this transcript follows itself.",
  "Scroll up while it streams and the viewport lets go immediately.",
  "The jump control appears once you're away from the bottom.",
  "Press it, or scroll back down, and following resumes.",
  "Nothing here fights you for the scroll position.",
  "Every message you append lands at the edge you're reading.",
];

/** Appends a message every couple of seconds so the pin/unpin behaviour is
 * observable without a real model behind it. */
export default function MessageScrollerDemo() {
  const [count, setCount] = useState(2);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setCount((current) => (current >= SCRIPT.length ? 2 : current + 1));
    }, 2200);
    return () => window.clearInterval(timer.current);
  }, []);

  return (
    <MessageScroller maxBlockSize="14rem" style={{ inlineSize: "min(32rem, 100%)" }}>
      <MessageList>
        {SCRIPT.slice(0, count).map((text, index) => {
          const author = index % 2 === 0 ? "assistant" : "user";
          return (
            <Message key={text} author={author} name={author === "user" ? "You" : "Assistant"}>
              <MessageBubble tone={author === "user" ? "accent" : "neutral"}>{text}</MessageBubble>
            </Message>
          );
        })}
      </MessageList>
    </MessageScroller>
  );
}
