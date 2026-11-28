import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button, Composer, Message, MessageBubble, MessageList, MessageScroller, ThinkingIndicator } from "@kernelui-lib/react";

type ChatMessage = { id: number; author: "user" | "assistant"; text: string };

const REPLY_DELAY_MS = 1000;
const REPLIES = [
  "Good question. Start with the smallest version that works, then measure before you optimise.",
  "Here's a short answer: yes, and you can change it later without a migration.",
  "I'd split that into two steps so each one is easy to review.",
];

const initialMessages: ChatMessage[] = [
  { id: 1, author: "user", text: "Can you help me plan a three-day trip to Lisbon?" },
  { id: 2, author: "assistant", text: "Of course. Day one: Alfama and the castle. Day two: Belém. Day three: a day trip to Sintra." },
  { id: 3, author: "user", text: "Is Sintra worth it if I only have one day?" },
  { id: 4, author: "assistant", text: "Yes. Leave early, start with Pena Palace before the crowds, and book tickets online." },
];

export default function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(initialMessages.length + 1);
  const replyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(replyTimer.current), []);

  function send(text: string) {
    const content = text.trim();
    if (!content) return;
    setMessages((current) => [...current, { id: nextId.current++, author: "user", text: content }]);
    setDraft("");
    setThinking(true);
    replyTimer.current = window.setTimeout(() => {
      const reply = REPLIES[nextId.current % REPLIES.length];
      setMessages((current) => [...current, { id: nextId.current++, author: "assistant", text: reply }]);
      setThinking(false);
    }, REPLY_DELAY_MS);
  }

  return (
    <main className="chat">
      <h1>Assistant</h1>
      <MessageScroller className="transcript" aria-label="Conversation">
        <MessageList>
          {messages.map((message, index) => (
            <Message
              key={message.id}
              author={message.author}
              name={message.author === "user" ? "You" : "Assistant"}
              grouped={index > 0 && messages[index - 1].author === message.author}
            >
              <MessageBubble tone={message.author === "user" ? "accent" : "neutral"}>{message.text}</MessageBubble>
            </Message>
          ))}
          {thinking ? (
            <Message author="assistant" name="Assistant" live>
              <ThinkingIndicator label="Thinking" />
            </Message>
          ) : null}
        </MessageList>
      </MessageScroller>
      <Composer
        placeholder="Message the assistant"
        submitOn="enter"
        value={draft}
        onValueChange={setDraft}
        thinking={thinking}
        onSubmit={send}
        actionsTrailing={({ submit }) => (
          <Button variant="primary" size="sm" aria-label="Send message" iconStart={<ArrowUp />} onClick={submit} disabled={thinking || !draft.trim()} />
        )}
      />
    </main>
  );
}
